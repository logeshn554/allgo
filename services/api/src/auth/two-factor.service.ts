import crypto from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '../config/config.service.js';
import { RedisService } from '../redis/redis.service.js';
import {
  AuthManagerRepository,
  ExtendedUserEntity,
  TwoFactorPolicy,
} from './data/auth-manager.repository.js';
import { parseDeviceName } from './device-utils.js';
import { AuthTokens, TokenSessionService } from './token-session.service.js';
import {
  buildOtpAuthUri,
  generateBackupCodes,
  generateTotpSecret,
  hashBackupCode,
  verifyAndConsumeBackupCode,
  verifyTotpCode,
} from './totp.util.js';

export interface TwoFactorChallengeResponse {
  requiresTwoFactor: true;
  twoFactorToken: string;
  methods: Array<'totp' | 'backup_code'>;
  user: {
    id: string;
    phone: string;
    email?: string | null;
    fullName?: string | null;
    status: string;
    roles: string[];
    defaultLanguage: string;
  };
}

interface StoredTwoFactorChallenge {
  userId: string;
  deviceId: string;
  platform: string;
  ipAddress: string | null;
  userAgent: string | null;
  loginMethod: string;
  attempts: number;
}

const MAX_2FA_ATTEMPTS = 5;

@Injectable()
export class TwoFactorService {
  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly authManagerRepo: AuthManagerRepository,
    private readonly tokenSessionService: TokenSessionService,
  ) {}

  isTwoFactorRequiredForLogin(
    user: Pick<ExtendedUserEntity, 'twoFactorEnabled' | 'twoFactorSecretEncrypted'>,
    policy: TwoFactorPolicy,
  ): boolean {
    if (policy === 'DISABLED') return false;
    return Boolean(user.twoFactorEnabled && user.twoFactorSecretEncrypted);
  }

  isTwoFactorSetupRequired(
    user: Pick<ExtendedUserEntity, 'twoFactorEnabled' | 'roles'>,
    policy: TwoFactorPolicy,
  ): boolean {
    if (user.twoFactorEnabled) return false;
    if (policy === 'REQUIRED_FOR_ALL') return true;
    if (policy === 'REQUIRED_FOR_ADMINS' && user.roles?.includes('ADMIN')) return true;
    return false;
  }

  async createLoginChallenge(
    user: ExtendedUserEntity,
    meta: {
      deviceId?: string;
      platform?: string;
      ipAddress?: string | null;
      userAgent?: string | null;
      loginMethod: string;
    },
  ): Promise<TwoFactorChallengeResponse> {
    const twoFactorToken = crypto.randomBytes(32).toString('hex');
    const payload: StoredTwoFactorChallenge = {
      userId: user.id,
      deviceId: meta.deviceId || 'web_browser',
      platform: meta.platform || 'WEB',
      ipAddress: meta.ipAddress || null,
      userAgent: meta.userAgent || null,
      loginMethod: meta.loginMethod,
      attempts: 0,
    };

    await this.redis.setex(`2fa:challenge:${twoFactorToken}`, 300, JSON.stringify(payload));

    return {
      requiresTwoFactor: true,
      twoFactorToken,
      methods: ['totp', 'backup_code'],
      user: {
        id: user.id,
        phone: user.phone || '',
        email: user.email || null,
        fullName: user.fullName || null,
        status: user.status,
        roles: user.roles,
        defaultLanguage: user.defaultLanguage || 'en',
      },
    };
  }

  async verifyLoginChallenge(input: {
    twoFactorToken: string;
    code: string;
    isBackupCode?: boolean;
  }): Promise<AuthTokens> {
    const token = (input.twoFactorToken || '').trim();
    const code = (input.code || '').trim();
    if (!token) {
      throw new BadRequestException('Two-factor challenge token is required.');
    }
    if (!code) {
      throw new BadRequestException('Verification code is required.');
    }

    const key = `2fa:challenge:${token}`;
    const raw = await this.redis.get(key);
    if (!raw) {
      throw new UnauthorizedException('Two-factor session expired. Please sign in again.');
    }

    const challenge: StoredTwoFactorChallenge = JSON.parse(raw);
    if (challenge.attempts >= MAX_2FA_ATTEMPTS) {
      await this.redis.del(key);
      throw new UnauthorizedException('Too many failed 2FA attempts. Please sign in again.');
    }

    const user = await this.authManagerRepo.findUserById(challenge.userId);
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecretEncrypted) {
      await this.redis.del(key);
      throw new UnauthorizedException('Two-factor authentication is not active for this account.');
    }

    if (user.status === 'BLOCKED' || user.status === 'SUSPENDED') {
      await this.redis.del(key);
      throw new ForbiddenException(`Account is ${user.status.toLowerCase()}.`);
    }

    const secret = this.authManagerRepo.decryptSecret(user.twoFactorSecretEncrypted);
    if (!secret) {
      throw new UnauthorizedException('Unable to verify authenticator configuration.');
    }

    const looksLikeTotp = /^\d{6}$/.test(code) && !input.isBackupCode;
    let verified = false;

    if (looksLikeTotp) {
      verified = verifyTotpCode(secret, code, 1);
    } else {
      const backupResult = verifyAndConsumeBackupCode(
        code,
        user.twoFactorBackupCodesHash || [],
        this.config.otpPepper,
      );
      if (backupResult.valid) {
        verified = true;
        await this.authManagerRepo.updateBackupCodeHashes(user.id, backupResult.remainingHashes);
      }
    }

    if (!verified) {
      challenge.attempts += 1;
      if (challenge.attempts >= MAX_2FA_ATTEMPTS) {
        await this.redis.del(key);
        throw new UnauthorizedException('Too many failed 2FA attempts. Please sign in again.');
      }
      await this.redis.setex(key, 300, JSON.stringify(challenge));
      throw new BadRequestException('Invalid two-factor authentication code.');
    }

    await this.redis.del(key);
    await this.authManagerRepo.recordLoginAudit(user.id, `${challenge.loginMethod}_2FA`);

    const sid = crypto.randomUUID();
    const accessToken = this.tokenSessionService.generateAccessToken(user, challenge.deviceId, sid);
    const refreshToken = this.tokenSessionService.generateRefreshToken(user, challenge.deviceId);
    await this.tokenSessionService.markSessionActive(user.id, challenge.deviceId, sid);

    const { evictedDevices } = await this.authManagerRepo.recordDeviceWithMetadata({
      userId: user.id,
      deviceId: challenge.deviceId,
      platform: challenge.platform,
      refreshToken,
      deviceName: parseDeviceName(challenge.userAgent, challenge.platform),
      ipAddress: challenge.ipAddress,
      userAgent: challenge.userAgent,
      loginMethod: `${challenge.loginMethod}_2FA`,
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

  async getStatus(userId: string) {
    const [user, settings] = await Promise.all([
      this.authManagerRepo.findUserById(userId),
      this.authManagerRepo.getSettings(),
    ]);
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return {
      enabled: Boolean(user.twoFactorEnabled),
      enabledAt: user.twoFactorEnabledAt || null,
      backupCodesRemaining: Array.isArray(user.twoFactorBackupCodesHash)
        ? user.twoFactorBackupCodesHash.length
        : 0,
      policy: settings.twoFactorPolicy,
      setupRequired: this.isTwoFactorSetupRequired(user, settings.twoFactorPolicy),
    };
  }

  async beginSetup(userId: string): Promise<{ secret: string; otpAuthUri: string }> {
    const [user, settings] = await Promise.all([
      this.authManagerRepo.findUserById(userId),
      this.authManagerRepo.getSettings(),
    ]);
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    if (settings.twoFactorPolicy === 'DISABLED') {
      throw new ForbiddenException('Two-factor authentication is disabled by administrator.');
    }

    const secret = generateTotpSecret(20);
    const accountName = user.email || user.phone || user.id;
    const otpAuthUri = buildOtpAuthUri({
      secret,
      accountName,
      issuer: 'AllGo',
    });

    await this.redis.setex(`2fa:setup:${userId}`, 600, secret);
    return { secret, otpAuthUri };
  }

  async confirmEnable(
    userId: string,
    code: string,
  ): Promise<{ enabled: boolean; backupCodes: string[] }> {
    const cleaned = (code || '').trim();
    if (!/^\d{6}$/.test(cleaned)) {
      throw new BadRequestException('Enter the 6-digit code from your authenticator app.');
    }

    const pendingSecret = await this.redis.get(`2fa:setup:${userId}`);
    if (!pendingSecret) {
      throw new BadRequestException('Two-factor setup session expired. Please start setup again.');
    }

    if (!verifyTotpCode(pendingSecret, cleaned, 1)) {
      throw new BadRequestException(
        'Invalid verification code. Please check your authenticator clock and try again.',
      );
    }

    const encryptedSecret = this.authManagerRepo.encryptSecret(pendingSecret);
    const backupCodes = generateBackupCodes(8);
    const hashes = backupCodes.map((c) => hashBackupCode(c, this.config.otpPepper));

    await this.authManagerRepo.enableTwoFactor(userId, encryptedSecret, hashes);
    await this.redis.del(`2fa:setup:${userId}`);

    return { enabled: true, backupCodes };
  }

  async disable(userId: string, code: string): Promise<{ enabled: boolean }> {
    const [user, settings] = await Promise.all([
      this.authManagerRepo.findUserById(userId),
      this.authManagerRepo.getSettings(),
    ]);
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    if (!user.twoFactorEnabled || !user.twoFactorSecretEncrypted) {
      return { enabled: false };
    }

    const policyRequires =
      settings.twoFactorPolicy === 'REQUIRED_FOR_ALL' ||
      (settings.twoFactorPolicy === 'REQUIRED_FOR_ADMINS' && user.roles?.includes('ADMIN'));
    if (policyRequires) {
      throw new ForbiddenException(
        'Two-factor authentication is required by your organization policy and cannot be disabled.',
      );
    }

    const cleaned = (code || '').trim();
    if (!cleaned) {
      throw new BadRequestException('Enter an authenticator or backup code to disable 2FA.');
    }

    const secret = this.authManagerRepo.decryptSecret(user.twoFactorSecretEncrypted);
    const isTotpValid =
      secret && /^\d{6}$/.test(cleaned) ? verifyTotpCode(secret, cleaned, 1) : false;
    const isBackupValid = !isTotpValid
      ? verifyAndConsumeBackupCode(
          cleaned,
          user.twoFactorBackupCodesHash || [],
          this.config.otpPepper,
        ).valid
      : false;

    if (!isTotpValid && !isBackupValid) {
      throw new BadRequestException('Invalid verification code.');
    }

    await this.authManagerRepo.disableTwoFactor(userId);
    return { enabled: false };
  }

  async regenerateBackupCodes(userId: string, code: string): Promise<{ backupCodes: string[] }> {
    const user = await this.authManagerRepo.findUserById(userId);
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecretEncrypted) {
      throw new BadRequestException('Two-factor authentication is not enabled.');
    }

    const secret = this.authManagerRepo.decryptSecret(user.twoFactorSecretEncrypted);
    if (!secret || !verifyTotpCode(secret, (code || '').trim(), 1)) {
      throw new BadRequestException('Invalid 6-digit authenticator code.');
    }

    const backupCodes = generateBackupCodes(8);
    const hashes = backupCodes.map((c) => hashBackupCode(c, this.config.otpPepper));
    await this.authManagerRepo.updateBackupCodeHashes(userId, hashes);

    return { backupCodes };
  }

  async adminDisableTwoFactor(userId: string): Promise<{ success: boolean }> {
    const user = await this.authManagerRepo.findUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    await this.authManagerRepo.disableTwoFactor(userId);
    return { success: true };
  }
}
