import {
  Injectable,
  Optional,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  ServiceUnavailableException,
  HttpException,
} from '@nestjs/common';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { ConfigService } from '../config/config.service.js';
import { RedisService } from '../redis/redis.service.js';
import { AuthRepository, UserEntity } from './data/auth.repository.js';
import { AuthManagerRepository } from './data/auth-manager.repository.js';
import { OtpService } from './otp.service.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';
import { parseDeviceName } from './device-utils.js';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: {
    id: string;
    phone: string;
    email?: string | null;
    fullName?: string | null;
    avatarUrl?: string | null;
    status: string;
    roles: string[];
    defaultLanguage: string;
  };
}

@Injectable()
export class TokenSessionService {
  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly authRepo: AuthRepository,
    private readonly otpService: OtpService,
    @Optional() private readonly authManagerRepo?: AuthManagerRepository,
  ) {}

  async verifyOtpAndLoadUser(dto: VerifyOtpDto): Promise<UserEntity> {
    const phone = this.otpService.validateIndianPhone(dto.phone);

    if (!dto.code || !/^\d{6}$/.test(dto.code)) {
      throw new BadRequestException('Invalid OTP format. Must be a 6-digit numeric code.');
    }

    const result = await this.otpService.verifyOtpChallenge(phone, dto.code);

    if (result === -1) {
      throw new BadRequestException('OTP has expired or has already been used. Please request a new one.');
    }
    if (result === -2) {
      throw new BadRequestException('Maximum verification attempts exceeded. Please request a new OTP.');
    }
    if (result === 0) {
      throw new BadRequestException('Invalid OTP code. Please verify and try again.');
    }

    // result === 1: Verification succeeded and challenge consumed atomically!
    let user = await this.authRepo.findUserByPhone(phone);
    if (!user) {
      if (this.authManagerRepo) {
        const settings = await this.authManagerRepo.getSettings();
        if (!settings.allowSelfSignup) {
          throw new ForbiddenException('No account found for this phone number. Self-registration is currently disabled.');
        }
      }
      user = await this.authRepo.createUserWithCustomerRole(phone);
    }

    if (user.status === 'BLOCKED') {
      throw new ForbiddenException('ACCOUNT_BLOCKED: Your account has been permanently blocked.');
    }
    if (user.status === 'SUSPENDED') {
      throw new ForbiddenException('ACCOUNT_SUSPENDED: Your account is temporarily suspended.');
    }

    return user;
  }

  async issueSessionTokens(
    user: UserEntity,
    dto: Pick<VerifyOtpDto, 'deviceId' | 'platform'>,
    meta?: { ipAddress?: string | null; userAgent?: string | null; loginMethod?: string },
  ): Promise<AuthTokens> {
    const platform = dto.platform || 'ANDROID';
    const deviceId = dto.deviceId || `${platform.toLowerCase()}_${crypto.randomUUID().slice(0, 12)}`;
    const sid = crypto.randomUUID();
    const accessToken = this.generateAccessToken(user, deviceId, sid);
    const refreshToken = this.generateRefreshToken(user, deviceId);

    await this.markSessionActive(user.id, deviceId, sid);

    if (this.authManagerRepo) {
      const { evictedDevices } = await this.authManagerRepo.recordDeviceWithMetadata({
        userId: user.id,
        deviceId,
        platform,
        refreshToken,
        deviceName: parseDeviceName(meta?.userAgent, platform),
        ipAddress: meta?.ipAddress || null,
        userAgent: meta?.userAgent || null,
        loginMethod: meta?.loginMethod || 'PHONE_OTP',
      });
      for (const evicted of evictedDevices) {
        await this.invalidateDeviceSession(user.id, evicted.deviceId, evicted.sessionTokenHash);
      }
    } else {
      await this.authRepo.recordDeviceSession(user.id, deviceId, platform, refreshToken);
    }

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 900,
      user,
    };
  }

  async createWebSession(
    user: any,
    meta: {
      deviceId?: string;
      platform?: string;
      ipAddress?: string | null;
      userAgent?: string | null;
      loginMethod: string;
      refreshToken?: string | null;
    },
  ): Promise<{
    sessionToken: string;
    expiresIn: number;
    deviceId: string;
    user: AuthTokens['user'];
  }> {
    const platform = meta.platform || 'WEB';
    const deviceId =
      meta.deviceId || `${platform.toLowerCase()}_${crypto.randomUUID().slice(0, 12)}`;
    const sessionToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');

    let ttlSeconds = 7 * 24 * 60 * 60; // 7 days default
    if (this.authManagerRepo) {
      const settings = await this.authManagerRepo.getSettings();
      if (settings.refreshTokenTtlSeconds && settings.refreshTokenTtlSeconds > 0) {
        ttlSeconds = settings.refreshTokenTtlSeconds;
      }
    }
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    // Replace any previous web session for this exact device
    const prevHash = await this.redis.get(`web:device_session:${user.id}:${deviceId}`);
    if (prevHash) {
      await this.redis.del(`web:session:${prevHash}`);
      if (typeof this.redis.srem === 'function') {
        await this.redis.srem(`web:user_sessions:${user.id}`, prevHash);
      }
    }

    const revokedAllRaw = await this.redis.get(`user:revoked_all:${user.id}`);
    const revokedAllTs = revokedAllRaw ? Number(revokedAllRaw) : 0;
    const issuedAt = Math.max(
      Date.now(),
      Number.isFinite(revokedAllTs) && revokedAllTs > 0 ? revokedAllTs + 1 : 0,
    );

    const sessionPayload = {
      userId: user.id,
      phone: user.phone || '',
      email: user.email || null,
      status: user.status,
      roles: Array.isArray(user.roles) ? user.roles : ['CUSTOMER'],
      deviceId,
      platform,
      issuedAt,
      expiresAt: expiresAt.getTime(),
    };

    await this.redis.setex(
      `web:session:${tokenHash}`,
      ttlSeconds,
      JSON.stringify(sessionPayload),
    );
    await this.redis.setex(`web:device_session:${user.id}:${deviceId}`, ttlSeconds, tokenHash);
    if (typeof this.redis.sadd === 'function') {
      await this.redis.sadd(`web:user_sessions:${user.id}`, tokenHash);
      await this.redis.expire(`web:user_sessions:${user.id}`, ttlSeconds);
    }
    await this.redis.del(`device:revoked:${user.id}:${deviceId}`);

    if (this.authManagerRepo) {
      const { evictedDevices } = await this.authManagerRepo.recordDeviceWithMetadata({
        userId: user.id,
        deviceId,
        platform,
        refreshToken: meta.refreshToken || null,
        sessionTokenHash: tokenHash,
        sessionExpiresAt: expiresAt,
        deviceName: parseDeviceName(meta.userAgent, platform),
        ipAddress: meta.ipAddress || null,
        userAgent: meta.userAgent || null,
        loginMethod: meta.loginMethod,
      });
      for (const evicted of evictedDevices) {
        await this.invalidateDeviceSession(user.id, evicted.deviceId, evicted.sessionTokenHash);
      }
    }

    return {
      sessionToken,
      expiresIn: ttlSeconds,
      deviceId,
      user: {
        id: user.id,
        phone: user.phone || '',
        email: user.email || null,
        fullName: user.fullName || null,
        avatarUrl: user.avatarUrl || null,
        status: user.status,
        roles: Array.isArray(user.roles) ? user.roles : ['CUSTOMER'],
        defaultLanguage: user.defaultLanguage || 'en',
      },
    };
  }

  async invalidateDeviceSession(
    userId: string,
    deviceId: string,
    sessionTokenHash?: string | null,
  ): Promise<void> {
    const storedHash = await this.redis.get(`web:device_session:${userId}:${deviceId}`);
    const hashes = new Set<string>();
    if (storedHash) hashes.add(storedHash);
    if (sessionTokenHash) hashes.add(sessionTokenHash);

    for (const h of hashes) {
      await this.redis.del(`web:session:${h}`);
      if (typeof this.redis.srem === 'function') {
        await this.redis.srem(`web:user_sessions:${userId}`, h);
      }
    }
    await this.redis.del(`web:device_session:${userId}:${deviceId}`);
    await this.redis.setex(`device:revoked:${userId}:${deviceId}`, 86400, String(Date.now()));

    const activeSid = await this.redis.get(`device:active_sid:${userId}:${deviceId}`);
    if (activeSid) {
      await this.redis.del(`session:active:${activeSid}`);
      await this.redis.del(`device:active_sid:${userId}:${deviceId}`);
    }
  }

  async invalidateAllUserSessions(
    userId: string,
    revokedDevices?: Array<{ deviceId: string; sessionTokenHash?: string | null }>,
  ): Promise<void> {
    if (typeof this.redis.smembers === 'function') {
      const hashes = await this.redis.smembers(`web:user_sessions:${userId}`);
      for (const h of hashes) {
        await this.redis.del(`web:session:${h}`);
      }
      await this.redis.del(`web:user_sessions:${userId}`);
    }

    if (revokedDevices) {
      for (const d of revokedDevices) {
        if (d.sessionTokenHash) {
          await this.redis.del(`web:session:${d.sessionTokenHash}`);
        }
        await this.redis.del(`web:device_session:${userId}:${d.deviceId}`);
        const activeSid = await this.redis.get(`device:active_sid:${userId}:${d.deviceId}`);
        if (activeSid) {
          await this.redis.del(`session:active:${activeSid}`);
          await this.redis.del(`device:active_sid:${userId}:${d.deviceId}`);
        }
      }
    }

    await this.redis.setex(`user:revoked_all:${userId}`, 86400, String(Date.now()));
  }

  async markSessionActive(userId: string, deviceId: string, sid: string): Promise<void> {
    await this.redis.del(`device:revoked:${userId}:${deviceId}`);
    await this.redis.setex(`session:active:${sid}`, 86400, '1');
    await this.redis.setex(`device:active_sid:${userId}:${deviceId}`, 86400, sid);
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<AuthTokens> {
    const user = await this.verifyOtpAndLoadUser(dto);
    return this.issueSessionTokens(user, dto);
  }

  async refreshToken(refreshTokenString: string, deviceId?: string): Promise<AuthTokens> {
    if (!refreshTokenString) {
      throw new UnauthorizedException('Refresh token is required');
    }

    let decoded: any;
    try {
      decoded = jwt.verify(refreshTokenString, this.config.jwtSecret, {
        algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (decoded.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const targetDeviceId = decoded.deviceId || 'default_device';
    if (deviceId && deviceId !== targetDeviceId) {
      throw new BadRequestException('Device ID mismatch');
    }

    try {
      const isRevoked = await this.redis.get(`token:revoked:${refreshTokenString}`);
      if (isRevoked) {
        await this.authRepo.deleteDeviceSession(decoded.userId, targetDeviceId);
        throw new UnauthorizedException('Refresh token reuse detected. Session terminated for security.');
      }

      const redisStatus = await this.redis.get(`user:status:${decoded.userId}`);
      if (redisStatus === 'BLOCKED' || redisStatus === 'SUSPENDED') {
        throw new ForbiddenException(`Account is ${redisStatus.toLowerCase()}`);
      }

      const user = await this.authRepo.findUserById(decoded.userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      if (user.status !== 'ACTIVE') {
        throw new ForbiddenException(`Account is ${user.status.toLowerCase()}`);
      }

      const incomingHash = crypto.createHash('sha256').update(refreshTokenString).digest('hex');
      const deviceSession = await this.authRepo.getDeviceSession(user.id, targetDeviceId);

      if (!deviceSession) {
        throw new UnauthorizedException('Session not found or revoked');
      }

      if (deviceSession.refresh_token_hash !== incomingHash) {
        await this.authRepo.deleteDeviceSession(user.id, targetDeviceId);
        await this.redis.setex(`token:revoked:${refreshTokenString}`, 86400, 'REVOKED');
        throw new UnauthorizedException('Refresh token reuse detected. Session terminated for security.');
      }

      await this.redis.setex(`token:revoked:${refreshTokenString}`, 86400, 'REVOKED');

      const sid = crypto.randomUUID();
      const newAccessToken = this.generateAccessToken(user, targetDeviceId, sid);
      const newRefreshToken = this.generateRefreshToken(user, targetDeviceId);
      await this.markSessionActive(user.id, targetDeviceId, sid);

      await this.authRepo.recordDeviceSession(
        user.id,
        targetDeviceId,
        (deviceSession as { platform?: string }).platform || 'ANDROID',
        newRefreshToken,
      );

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        tokenType: 'Bearer',
        expiresIn: 900,
        user,
      };
    } catch (err: any) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new ServiceUnavailableException(`Database or cache service is unavailable: ${err?.message || err}`);
    }
  }

  async logout(
    token: string,
    userId: string,
    deviceId?: string,
    refreshToken?: string,
    sessionToken?: string,
  ): Promise<{ success: boolean }> {
    if (token) {
      await this.redis.setex(`token:revoked:${token}`, 3600, 'REVOKED');
    }

    if (refreshToken) {
      await this.redis.setex(`token:revoked:${refreshToken}`, 86400, 'REVOKED');
    }

    let sessionTokenHash: string | null = null;
    if (sessionToken) {
      sessionTokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
      await this.redis.del(`web:session:${sessionTokenHash}`);
      if (typeof this.redis.srem === 'function') {
        await this.redis.srem(`web:user_sessions:${userId}`, sessionTokenHash);
      }
    }

    if (deviceId) {
      if (this.authManagerRepo) {
        const res = await this.authManagerRepo.revokeDeviceForUser(userId, deviceId);
        await this.invalidateDeviceSession(userId, deviceId, res.sessionTokenHash || sessionTokenHash);
      } else {
        await this.invalidateDeviceSession(userId, deviceId, sessionTokenHash);
      }
      await this.authRepo.deleteDeviceSession(userId, deviceId);
    }

    return { success: true };
  }

  public generateAccessToken(user: any, deviceId?: string, sid?: string): string {
    return jwt.sign(
      {
        userId: user.id,
        phone: user.phone,
        status: user.status,
        roles: user.roles,
        deviceId: deviceId || 'default_device',
        sid: sid || crypto.randomUUID(),
        jti: crypto.randomUUID(),
      },
      this.config.jwtSecret,
      {
        algorithm: 'HS256',
        expiresIn: this.config.jwtExpiresIn as any,
      }
    );
  }

  public generateRefreshToken(user: any, deviceId?: string): string {
    return jwt.sign(
      {
        userId: user.id,
        type: 'refresh',
        deviceId: deviceId || 'default_device',
        jti: crypto.randomUUID(),
      },
      this.config.jwtSecret,
      {
        algorithm: 'HS256',
        expiresIn: this.config.jwtRefreshExpiresIn as any,
      }
    );
  }
}
