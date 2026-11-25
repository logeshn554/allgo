import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
  NotFoundException,
  Optional,
  Logger,
} from '@nestjs/common';
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { RedisService } from '../redis/redis.service.js';
import { ConfigService } from '../config/config.service.js';
import { AuthManagerRepository } from './data/auth-manager.repository.js';
import { TokenSessionService, AuthTokens } from './token-session.service.js';
import { TwoFactorService, TwoFactorChallengeResponse } from './two-factor.service.js';
import { OtpService } from './otp.service.js';
import { parseDeviceName } from './device-utils.js';
import { IndiaDltSmsGateway } from '../notifications/sms/india-dlt-sms.gateway.js';
import { DLT_TEMPLATES } from '../notifications/sms/sms-gateway.interface.js';

const scryptAsync = promisify(crypto.scrypt);
const MAX_RESET_ATTEMPTS = 5;
const MAX_EMAIL_OTP_ATTEMPTS = 5;

export type LoginOrTwoFactorResult = AuthTokens | TwoFactorChallengeResponse;

export interface IdentifierLookupResult {
  exists: boolean;
  identifierType: 'email' | 'phone';
  normalizedIdentifier: string;
  allowSelfSignup: boolean;
  hasPassword: boolean;
  twoFactorEnabled: boolean;
  availableMethods: {
    password: boolean;
    emailOtp: boolean;
    phoneOtp: boolean;
  };
}

@Injectable()
export class EmailAuthService {
  private readonly logger = new Logger(EmailAuthService.name);
  private readonly devEmailOtps = new Map<string, string>();
  private readonly devResetCodes = new Map<string, string>();
  private readonly dltSmsGateway: IndiaDltSmsGateway;

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly authManagerRepo: AuthManagerRepository,
    private readonly tokenSessionService: TokenSessionService,
    private readonly twoFactorService: TwoFactorService,
    private readonly otpService: OtpService,
    @Optional() dltSmsGateway?: IndiaDltSmsGateway,
  ) {
    this.dltSmsGateway = dltSmsGateway || new IndiaDltSmsGateway(this.config);
  }

  private normalizeEmail(email: string): string {
    const trimmed = (email || '').trim().toLowerCase();
    if (!trimmed) {
      throw new BadRequestException('Email address is required.');
    }
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;
    if (!emailRegex.test(trimmed)) {
      throw new BadRequestException('Enter a valid email address.');
    }
    return trimmed;
  }

  async hashPassword(password: string): Promise<string> {
    if (!password || password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long.');
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const derived = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${salt}:${derived.toString('hex')}`;
  }

  async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const [salt, keyHex] = (storedHash || '').split(':');
    if (!salt || !keyHex) return false;
    const derived = (await scryptAsync(password, salt, 64)) as Buffer;
    const expected = Buffer.from(keyHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  }

  async registerWithEmail(input: {
    email: string;
    password: string;
    fullName?: string;
    deviceId?: string;
    platform?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuthTokens> {
    const settings = await this.authManagerRepo.getSettings();
    if (!settings.emailPasswordEnabled) {
      throw new ForbiddenException('Email & password authentication is currently disabled.');
    }
    if (!settings.allowSelfSignup) {
      throw new ForbiddenException('Self-registration is disabled by administrator.');
    }

    const email = this.normalizeEmail(input.email);
    const existing = await this.authManagerRepo.findUserByEmail(email);
    if (existing) {
      throw new BadRequestException('An account with this email already exists.');
    }

    const passwordHash = await this.hashPassword(input.password);
    const user = await this.authManagerRepo.createUserWithIdentity({
      email,
      fullName: input.fullName?.trim() || null,
      passwordHash,
      emailVerified: false,
      provider: 'email',
      providerAccountId: email,
      loginMethod: 'EMAIL_PASSWORD',
    });

    return this.issueTokensForUser(user, {
      deviceId: input.deviceId,
      platform: input.platform,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      loginMethod: 'EMAIL_PASSWORD',
    });
  }

  async lookupIdentifier(identifierRaw: string): Promise<IdentifierLookupResult> {
    const raw = (identifierRaw || '').trim();
    if (!raw) {
      throw new BadRequestException('Email or phone number is required.');
    }

    const settings = await this.authManagerRepo.getSettings();
    const isEmail = raw.includes('@');

    if (isEmail) {
      const email = this.normalizeEmail(raw);
      const user = await this.authManagerRepo.findUserByEmail(email);
      return {
        exists: Boolean(user),
        identifierType: 'email',
        normalizedIdentifier: email,
        allowSelfSignup: settings.allowSelfSignup,
        hasPassword: Boolean(user?.passwordHash),
        twoFactorEnabled: Boolean(
          user && this.twoFactorService.isTwoFactorRequiredForLogin(user, settings.twoFactorPolicy),
        ),
        availableMethods: {
          password: settings.emailPasswordEnabled && (!user || Boolean(user.passwordHash)),
          emailOtp: settings.emailOtpEnabled,
          phoneOtp: false,
        },
      };
    }

    const phone = this.otpService.validateIndianPhone(raw);
    const user = await this.authManagerRepo.findUserByPhone(phone);
    return {
      exists: Boolean(user),
      identifierType: 'phone',
      normalizedIdentifier: phone,
      allowSelfSignup: settings.allowSelfSignup,
      hasPassword: Boolean(user?.passwordHash),
      twoFactorEnabled: Boolean(
        user && this.twoFactorService.isTwoFactorRequiredForLogin(user, settings.twoFactorPolicy),
      ),
      availableMethods: {
        password: settings.emailPasswordEnabled && Boolean(user?.passwordHash),
        emailOtp: false,
        phoneOtp: settings.phoneOtpEnabled,
      },
    };
  }

  async loginWithPassword(input: {
    identifier: string;
    password: string;
    deviceId?: string;
    platform?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<LoginOrTwoFactorResult> {
    const settings = await this.authManagerRepo.getSettings();
    if (!settings.emailPasswordEnabled) {
      throw new ForbiddenException('Password authentication is currently disabled.');
    }

    const raw = (input.identifier || '').trim();
    if (!raw) {
      throw new BadRequestException('Email or phone number is required.');
    }

    const isEmail = raw.includes('@');
    let normalizedIdentifier: string;
    let user;
    if (isEmail) {
      normalizedIdentifier = this.normalizeEmail(raw);
      user = await this.authManagerRepo.findUserByEmail(normalizedIdentifier);
    } else {
      normalizedIdentifier = this.otpService.validateIndianPhone(raw);
      user = await this.authManagerRepo.findUserByPhone(normalizedIdentifier);
    }

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const valid = await this.verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (user.status === 'BLOCKED' || user.status === 'SUSPENDED') {
      throw new ForbiddenException(`Account is ${user.status.toLowerCase()}.`);
    }

    const loginMethod = isEmail ? 'EMAIL_PASSWORD' : 'PHONE_PASSWORD';
    const provider = isEmail ? 'email' : 'phone';

    if (this.twoFactorService.isTwoFactorRequiredForLogin(user, settings.twoFactorPolicy)) {
      return this.twoFactorService.createLoginChallenge(user, {
        deviceId: input.deviceId,
        platform: input.platform,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        loginMethod,
      });
    }

    await this.authManagerRepo.recordLoginAudit(user.id, loginMethod, provider, normalizedIdentifier);

    return this.issueTokensForUser(user, {
      deviceId: input.deviceId,
      platform: input.platform,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      loginMethod,
    });
  }

  async loginWithEmail(input: {
    email: string;
    password: string;
    deviceId?: string;
    platform?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<LoginOrTwoFactorResult> {
    const settings = await this.authManagerRepo.getSettings();
    if (!settings.emailPasswordEnabled) {
      throw new ForbiddenException('Email & password authentication is currently disabled.');
    }

    const email = this.normalizeEmail(input.email);
    const user = await this.authManagerRepo.findUserByEmail(email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const valid = await this.verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (user.status === 'BLOCKED' || user.status === 'SUSPENDED') {
      throw new ForbiddenException(`Account is ${user.status.toLowerCase()}.`);
    }

    if (this.twoFactorService.isTwoFactorRequiredForLogin(user, settings.twoFactorPolicy)) {
      return this.twoFactorService.createLoginChallenge(user, {
        deviceId: input.deviceId,
        platform: input.platform,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        loginMethod: 'EMAIL_PASSWORD',
      });
    }

    await this.authManagerRepo.recordLoginAudit(user.id, 'EMAIL_PASSWORD', 'email', email);

    return this.issueTokensForUser(user, {
      deviceId: input.deviceId,
      platform: input.platform,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      loginMethod: 'EMAIL_PASSWORD',
    });
  }

  async sendEmailOtp(emailRaw: string): Promise<{ status: string; cooldownSeconds: number }> {
    const settings = await this.authManagerRepo.getSettings();
    if (!settings.emailOtpEnabled) {
      throw new ForbiddenException('Email OTP authentication is currently disabled.');
    }

    const email = this.normalizeEmail(emailRaw);
    const cooldownKey = `email_otp_cooldown:${email}`;
    const onCooldown = await this.redis.get(cooldownKey);
    if (onCooldown) {
      throw new BadRequestException('Please wait before requesting another verification code.');
    }

    const code = String(crypto.randomInt(100000, 1000000));
    const hash = crypto
      .createHmac('sha256', this.config.otpPepper)
      .update(`${email}:${code}`)
      .digest('hex');

    await this.redis.setex(cooldownKey, 60, '1');
    await this.redis.setex(
      `email_otp:${email}`,
      300,
      JSON.stringify({ hash, attempts: 0 }),
    );
    if (this.config.nodeEnv !== 'production') {
      this.devEmailOtps.set(email, code);
      this.logger.log(`[DEV EMAIL OTP] ${email} -> ${code}`);
    }

    return { status: 'OTP_SENT', cooldownSeconds: 60 };
  }

  getLastDevEmailOtp(email: string): string | undefined {
    return this.devEmailOtps.get(email.toLowerCase().trim());
  }

  async verifyEmailOtp(input: {
    email: string;
    code: string;
    deviceId?: string;
    platform?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<LoginOrTwoFactorResult> {
    const settings = await this.authManagerRepo.getSettings();
    if (!settings.emailOtpEnabled) {
      throw new ForbiddenException('Email OTP authentication is currently disabled.');
    }

    const email = this.normalizeEmail(input.email);
    const otpKey = `email_otp:${email}`;
    const rawStored = await this.redis.get(otpKey);
    if (!rawStored) {
      throw new BadRequestException('Email OTP expired or not requested.');
    }

    let record: { hash: string; attempts: number };
    try {
      const parsed = JSON.parse(rawStored);
      record =
        parsed && typeof parsed.hash === 'string'
          ? { hash: parsed.hash, attempts: Number(parsed.attempts) || 0 }
          : { hash: rawStored, attempts: 0 };
    } catch {
      record = { hash: rawStored, attempts: 0 };
    }

    if (record.attempts >= MAX_EMAIL_OTP_ATTEMPTS) {
      await this.redis.del(otpKey);
      throw new BadRequestException('Maximum verification attempts exceeded. Please request a new code.');
    }

    const incomingHash = crypto
      .createHmac('sha256', this.config.otpPepper)
      .update(`${email}:${(input.code || '').trim()}`)
      .digest('hex');

    if (
      record.hash.length !== incomingHash.length ||
      !crypto.timingSafeEqual(Buffer.from(record.hash), Buffer.from(incomingHash))
    ) {
      record.attempts += 1;
      if (record.attempts >= MAX_EMAIL_OTP_ATTEMPTS) {
        await this.redis.del(otpKey);
        throw new BadRequestException('Maximum verification attempts exceeded. Please request a new code.');
      }
      await this.redis.setex(otpKey, 300, JSON.stringify(record));
      throw new BadRequestException('Invalid Email OTP code.');
    }

    await this.redis.del(otpKey);

    let user = await this.authManagerRepo.findUserByEmail(email);
    if (!user) {
      if (!settings.allowSelfSignup) {
        throw new ForbiddenException('Self-registration is disabled by administrator.');
      }
      user = await this.authManagerRepo.createUserWithIdentity({
        email,
        emailVerified: true,
        provider: 'email',
        providerAccountId: email,
        loginMethod: 'EMAIL_OTP',
      });
    } else {
      await this.authManagerRepo.linkIdentity({
        userId: user.id,
        provider: 'email',
        providerAccountId: email,
        email,
        verified: true,
      });
    }

    if (user.status === 'BLOCKED' || user.status === 'SUSPENDED') {
      throw new ForbiddenException(`Account is ${user.status.toLowerCase()}.`);
    }

    if (this.twoFactorService.isTwoFactorRequiredForLogin(user, settings.twoFactorPolicy)) {
      return this.twoFactorService.createLoginChallenge(user, {
        deviceId: input.deviceId,
        platform: input.platform,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        loginMethod: 'EMAIL_OTP',
      });
    }

    await this.authManagerRepo.recordLoginAudit(user.id, 'EMAIL_OTP', 'email', email);

    return this.issueTokensForUser(user, {
      deviceId: input.deviceId,
      platform: input.platform,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      loginMethod: 'EMAIL_OTP',
    });
  }

  async requestPasswordReset(identifierRaw: string): Promise<{ status: string; cooldownSeconds: number }> {
    const settings = await this.authManagerRepo.getSettings();
    if (!settings.emailPasswordEnabled) {
      throw new ForbiddenException('Password authentication is currently disabled.');
    }

    const raw = (identifierRaw || '').trim();
    if (!raw) {
      throw new BadRequestException('Email or phone number is required.');
    }

    const isEmail = raw.includes('@');
    const normalized = isEmail
      ? this.normalizeEmail(raw)
      : this.otpService.validateIndianPhone(raw);

    const cooldownKey = `pwd_reset_cooldown:${normalized}`;
    const onCooldown = await this.redis.get(cooldownKey);
    if (onCooldown) {
      throw new BadRequestException('Please wait before requesting another password reset code.');
    }

    await this.redis.setex(cooldownKey, 60, '1');

    const user = isEmail
      ? await this.authManagerRepo.findUserByEmail(normalized)
      : await this.authManagerRepo.findUserByPhone(normalized);

    if (user && user.status !== 'BLOCKED' && user.status !== 'SUSPENDED') {
      const code = String(crypto.randomInt(100000, 1000000));
      const hash = crypto
        .createHmac('sha256', this.config.otpPepper)
        .update(`reset:${normalized}:${code}`)
        .digest('hex');

      await this.redis.setex(
        `pwd_reset:${normalized}`,
        600,
        JSON.stringify({ hash, attempts: 0 }),
      );

      if (!isEmail && this.config.isProduction) {
        await this.dltSmsGateway.sendCriticalAlert(
          normalized,
          `Your AllGo password reset code is ${code}. Valid for 10 minutes. Do not share.`,
          { dltTemplateId: DLT_TEMPLATES.OTP_VERIFICATION },
        );
      } else if (this.config.nodeEnv !== 'production') {
        this.devResetCodes.set(normalized, code);
        this.logger.log(`[DEV PASSWORD RESET CODE] ${normalized} -> ${code}`);
      }
    }

    return { status: 'RESET_SENT', cooldownSeconds: 60 };
  }

  getLastDevResetCode(identifier: string): string | undefined {
    const raw = (identifier || '').trim();
    if (!raw) return undefined;
    const key = raw.includes('@')
      ? raw.toLowerCase()
      : this.otpService.validateIndianPhone(raw);
    return this.devResetCodes.get(key);
  }

  async resetPassword(input: {
    identifier?: string;
    email?: string;
    phone?: string;
    code: string;
    newPassword: string;
  }): Promise<{ success: boolean; message: string }> {
    const settings = await this.authManagerRepo.getSettings();
    if (!settings.emailPasswordEnabled) {
      throw new ForbiddenException('Password authentication is currently disabled.');
    }

    const rawIdentifier = (input.identifier || input.email || input.phone || '').trim();
    if (!rawIdentifier) {
      throw new BadRequestException('Email or phone number is required.');
    }

    const isEmail = rawIdentifier.includes('@');
    const normalized = isEmail
      ? this.normalizeEmail(rawIdentifier)
      : this.otpService.validateIndianPhone(rawIdentifier);

    const code = (input.code || '').trim();
    if (!/^\d{6}$/.test(code)) {
      throw new BadRequestException('Enter the 6-digit password reset code.');
    }
    if (!input.newPassword || input.newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long.');
    }

    const key = `pwd_reset:${normalized}`;
    const raw = await this.redis.get(key);
    if (!raw) {
      throw new BadRequestException('Password reset code expired or not requested.');
    }

    const record: { hash: string; attempts: number } = JSON.parse(raw);
    if (record.attempts >= MAX_RESET_ATTEMPTS) {
      await this.redis.del(key);
      throw new BadRequestException('Maximum reset attempts exceeded. Please request a new code.');
    }

    const incomingHash = crypto
      .createHmac('sha256', this.config.otpPepper)
      .update(`reset:${normalized}:${code}`)
      .digest('hex');

    if (
      record.hash.length !== incomingHash.length ||
      !crypto.timingSafeEqual(Buffer.from(record.hash), Buffer.from(incomingHash))
    ) {
      record.attempts += 1;
      if (record.attempts >= MAX_RESET_ATTEMPTS) {
        await this.redis.del(key);
        throw new BadRequestException('Maximum reset attempts exceeded. Please request a new code.');
      }
      await this.redis.setex(key, 600, JSON.stringify(record));
      throw new BadRequestException('Invalid password reset code.');
    }

    const user = isEmail
      ? await this.authManagerRepo.findUserByEmail(normalized)
      : await this.authManagerRepo.findUserByPhone(normalized);
    if (!user) {
      await this.redis.del(key);
      throw new NotFoundException('Account not found.');
    }
    if (user.status === 'BLOCKED' || user.status === 'SUSPENDED') {
      await this.redis.del(key);
      throw new ForbiddenException(`Account is ${user.status.toLowerCase()}.`);
    }

    const newPasswordHash = await this.hashPassword(input.newPassword);
    await this.authManagerRepo.updateUserPasswordHash(user.id, newPasswordHash, isEmail);
    await this.authManagerRepo.linkIdentity(
      isEmail
        ? {
            userId: user.id,
            provider: 'email',
            providerAccountId: normalized,
            email: normalized,
            verified: true,
          }
        : {
            userId: user.id,
            provider: 'phone',
            providerAccountId: normalized,
            phone: normalized,
            verified: true,
          },
    );
    await this.authManagerRepo.revokeAllDevicesForUser(user.id);
    await this.redis.del(key);

    return {
      success: true,
      message: 'Password has been reset successfully. You can now sign in.',
    };
  }

  async changePassword(
    userId: string,
    input: { currentPassword?: string; newPassword: string },
  ): Promise<{ success: boolean }> {
    const user = await this.authManagerRepo.findUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (user.passwordHash) {
      if (!input.currentPassword) {
        throw new BadRequestException('Current password is required.');
      }
      const valid = await this.verifyPassword(input.currentPassword, user.passwordHash);
      if (!valid) {
        throw new BadRequestException('Current password is incorrect.');
      }
    }

    const newHash = await this.hashPassword(input.newPassword);
    await this.authManagerRepo.updateUserPasswordHash(userId, newHash, false);
    return { success: true };
  }

  // ==================== SELF-SERVICE ACCOUNT LINKING ====================

  async sendLinkPhoneOtp(
    userId: string,
    phoneRaw: string,
  ): Promise<{ status: string; cooldownSeconds: number }> {
    const phone = this.otpService.validateIndianPhone(phoneRaw);
    const existing = await this.authManagerRepo.findUserByPhone(phone);
    if (existing && existing.id !== userId) {
      throw new ConflictException('This phone number is already linked to another account.');
    }

    const cooldownKey = `link_phone_cooldown:${userId}:${phone}`;
    if (await this.redis.get(cooldownKey)) {
      throw new BadRequestException('Please wait before requesting another verification code.');
    }

    const code = String(crypto.randomInt(100000, 1000000));
    const hash = crypto
      .createHmac('sha256', this.config.otpPepper)
      .update(`link_phone:${userId}:${phone}:${code}`)
      .digest('hex');

    await this.redis.setex(cooldownKey, 60, '1');
    await this.redis.setex(
      `link_phone_otp:${userId}:${phone}`,
      300,
      JSON.stringify({ hash, attempts: 0 }),
    );

    if (this.config.nodeEnv !== 'production') {
      this.logger.log(`[DEV LINK PHONE OTP] ${phone} -> ${code}`);
    }

    return { status: 'OTP_SENT', cooldownSeconds: 60 };
  }

  async verifyLinkPhoneOtp(userId: string, phoneRaw: string, codeRaw: string) {
    const phone = this.otpService.validateIndianPhone(phoneRaw);
    const code = (codeRaw || '').trim();
    if (!/^\d{6}$/.test(code)) {
      throw new BadRequestException('Enter the 6-digit verification code.');
    }

    const existing = await this.authManagerRepo.findUserByPhone(phone);
    if (existing && existing.id !== userId) {
      throw new ConflictException('This phone number is already linked to another account.');
    }

    const otpKey = `link_phone_otp:${userId}:${phone}`;
    const raw = await this.redis.get(otpKey);
    if (!raw) {
      throw new BadRequestException('Verification code expired or not requested.');
    }

    const record: { hash: string; attempts: number } = JSON.parse(raw);
    if (record.attempts >= MAX_EMAIL_OTP_ATTEMPTS) {
      await this.redis.del(otpKey);
      throw new BadRequestException('Maximum verification attempts exceeded. Please request a new code.');
    }

    const incomingHash = crypto
      .createHmac('sha256', this.config.otpPepper)
      .update(`link_phone:${userId}:${phone}:${code}`)
      .digest('hex');

    if (
      record.hash.length !== incomingHash.length ||
      !crypto.timingSafeEqual(Buffer.from(record.hash), Buffer.from(incomingHash))
    ) {
      record.attempts += 1;
      if (record.attempts >= MAX_EMAIL_OTP_ATTEMPTS) {
        await this.redis.del(otpKey);
        throw new BadRequestException('Maximum verification attempts exceeded. Please request a new code.');
      }
      await this.redis.setex(otpKey, 300, JSON.stringify(record));
      throw new BadRequestException('Invalid verification code.');
    }

    await this.redis.del(otpKey);
    const user = await this.authManagerRepo.findUserById(userId);
    const identity = await this.authManagerRepo.linkIdentity({
      userId,
      provider: 'phone',
      providerAccountId: phone,
      phone,
      displayName: user?.fullName || null,
      verified: true,
    });
    return { identity };
  }

  async sendLinkEmailOtp(
    userId: string,
    emailRaw: string,
  ): Promise<{ status: string; cooldownSeconds: number }> {
    const email = this.normalizeEmail(emailRaw);
    const existing = await this.authManagerRepo.findUserByEmail(email);
    if (existing && existing.id !== userId) {
      throw new ConflictException('This email address is already linked to another account.');
    }

    const cooldownKey = `link_email_cooldown:${userId}:${email}`;
    if (await this.redis.get(cooldownKey)) {
      throw new BadRequestException('Please wait before requesting another verification code.');
    }

    const code = String(crypto.randomInt(100000, 1000000));
    const hash = crypto
      .createHmac('sha256', this.config.otpPepper)
      .update(`link_email:${userId}:${email}:${code}`)
      .digest('hex');

    await this.redis.setex(cooldownKey, 60, '1');
    await this.redis.setex(
      `link_email_otp:${userId}:${email}`,
      300,
      JSON.stringify({ hash, attempts: 0 }),
    );

    if (this.config.nodeEnv !== 'production') {
      this.devEmailOtps.set(email, code);
      this.logger.log(`[DEV LINK EMAIL OTP] ${email} -> ${code}`);
    }

    return { status: 'OTP_SENT', cooldownSeconds: 60 };
  }

  async verifyLinkEmailOtp(userId: string, emailRaw: string, codeRaw: string) {
    const email = this.normalizeEmail(emailRaw);
    const code = (codeRaw || '').trim();
    if (!/^\d{6}$/.test(code)) {
      throw new BadRequestException('Enter the 6-digit verification code.');
    }

    const existing = await this.authManagerRepo.findUserByEmail(email);
    if (existing && existing.id !== userId) {
      throw new ConflictException('This email address is already linked to another account.');
    }

    const otpKey = `link_email_otp:${userId}:${email}`;
    const raw = await this.redis.get(otpKey);
    if (!raw) {
      throw new BadRequestException('Verification code expired or not requested.');
    }

    const record: { hash: string; attempts: number } = JSON.parse(raw);
    if (record.attempts >= MAX_EMAIL_OTP_ATTEMPTS) {
      await this.redis.del(otpKey);
      throw new BadRequestException('Maximum verification attempts exceeded. Please request a new code.');
    }

    const incomingHash = crypto
      .createHmac('sha256', this.config.otpPepper)
      .update(`link_email:${userId}:${email}:${code}`)
      .digest('hex');

    if (
      record.hash.length !== incomingHash.length ||
      !crypto.timingSafeEqual(Buffer.from(record.hash), Buffer.from(incomingHash))
    ) {
      record.attempts += 1;
      if (record.attempts >= MAX_EMAIL_OTP_ATTEMPTS) {
        await this.redis.del(otpKey);
        throw new BadRequestException('Maximum verification attempts exceeded. Please request a new code.');
      }
      await this.redis.setex(otpKey, 300, JSON.stringify(record));
      throw new BadRequestException('Invalid verification code.');
    }

    await this.redis.del(otpKey);
    const user = await this.authManagerRepo.findUserById(userId);
    const identity = await this.authManagerRepo.linkIdentity({
      userId,
      provider: 'email',
      providerAccountId: email,
      email,
      displayName: user?.fullName || null,
      verified: true,
    });
    return { identity };
  }

  private async issueTokensForUser(
    user: any,
    meta: {
      deviceId?: string;
      platform?: string;
      ipAddress?: string;
      userAgent?: string;
      loginMethod: string;
    },
  ): Promise<AuthTokens> {
    const platform = meta.platform || 'WEB';
    const deviceId =
      meta.deviceId || `${platform.toLowerCase()}_${crypto.randomUUID().slice(0, 12)}`;
    const sid = crypto.randomUUID();
    const accessToken = this.tokenSessionService.generateAccessToken(user, deviceId, sid);
    const refreshToken = this.tokenSessionService.generateRefreshToken(user, deviceId);

    await this.tokenSessionService.markSessionActive(user.id, deviceId, sid);

    const { evictedDevices } = await this.authManagerRepo.recordDeviceWithMetadata({
      userId: user.id,
      deviceId,
      platform,
      refreshToken,
      deviceName: parseDeviceName(meta.userAgent, platform),
      ipAddress: meta.ipAddress || null,
      userAgent: meta.userAgent || null,
      loginMethod: meta.loginMethod,
    });
    for (const evicted of evictedDevices) {
      await this.tokenSessionService.invalidateDeviceSession(
        user.id,
        evicted.deviceId,
        evicted.sessionTokenHash,
      );
    }

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 900,
      user: {
        id: user.id,
        phone: user.phone || '',
        email: user.email || null,
        fullName: user.fullName || null,
        avatarUrl: user.avatarUrl || null,
        status: user.status,
        roles: user.roles,
        defaultLanguage: user.defaultLanguage || 'en',
      },
    };
  }
}
