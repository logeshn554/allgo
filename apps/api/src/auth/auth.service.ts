import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { OtpSecurityService } from '@allgo/common';
import { ConfigService } from '../config/config.service.ts';
import { DatabaseService } from '../database/database.service.ts';
import { RedisService } from '../redis/redis.service.ts';
import { LocalOtpDeliveryAdapter } from './adapters/local-otp-delivery.adapter.ts';
import { SendOtpDto } from './dto/send-otp.dto.ts';
import { VerifyOtpDto } from './dto/verify-otp.dto.ts';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: {
    id: string;
    phone: string;
    status: string;
    roles: string[];
    defaultLanguage: string;
  };
}

export class AuthService {
  private readonly otpSecurityService: OtpSecurityService;

  // Local in-memory user registry fallback when PostgreSQL container is offline
  private inMemoryUsers = new Map<string, { id: string; phone: string; status: string; roles: string[]; defaultLanguage: string }>();

  constructor(
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly otpAdapter: LocalOtpDeliveryAdapter
  ) {
    this.otpSecurityService = new OtpSecurityService(
      this.config.otpPepper,
      this.config.otpTtlSeconds,
      this.config.otpMaxAttempts
    );
  }

  validateIndianPhone(phone: string): string {
    if (!phone || typeof phone !== 'string') {
      throw new BadRequestException('Invalid Indian mobile number: Phone number is required.');
    }
    const trimmed = phone.trim();
    const indianPhoneRegex = /^\+91[6-9]\d{9}$/;
    if (!indianPhoneRegex.test(trimmed)) {
      throw new BadRequestException(
        'Invalid Indian mobile number. Must be in E.164 format (+91 followed by 10 digits starting with 6-9).'
      );
    }
    return trimmed;
  }

  async sendOtp(dto: SendOtpDto, clientIp: string = '127.0.0.1'): Promise<{ status: string; cooldownSeconds: number }> {
    const phone = this.validateIndianPhone(dto.phone);

    // 1. Enforce 60-second resend cooldown
    const cooldownKey = `otp:cooldown:${phone}`;
    const inCooldown = await this.redis.exists(cooldownKey);
    if (inCooldown) {
      throw new BadRequestException('Please wait 60 seconds before requesting another OTP.');
    }

    // 2. Enforce Hourly Phone Rate Limit (max 3/hr)
    const phoneRateKey = `otp:rate:phone:${phone}`;
    const phoneRequests = await this.redis.hincrby(phoneRateKey, 'count', 1);
    if (phoneRequests === 1) {
      await this.redis.expire(phoneRateKey, 3600);
    }
    if (phoneRequests > 3) {
      throw new BadRequestException('Too many OTP requests for this phone number. Please try again in an hour.');
    }

    // 3. Enforce IP Rate Limit (max 5/15min)
    const ipRateKey = `otp:rate:ip:${clientIp}`;
    const ipRequests = await this.redis.hincrby(ipRateKey, 'count', 1);
    if (ipRequests === 1) {
      await this.redis.expire(ipRateKey, 900);
    }
    if (ipRequests > 5) {
      throw new BadRequestException('Too many OTP requests from this network. Please try again later.');
    }

    // 4. Generate cryptographically secure 6-digit OTP
    const otp = this.otpSecurityService.generateSecureOtp(6);
    const hmacDigest = this.otpSecurityService.computeOtpHmac(phone, otp);

    // 5. Store challenge in Redis with 300s TTL (never store plaintext OTP)
    const challengeKey = `otp:challenge:${phone}`;
    await this.redis.hset(challengeKey, 'hmac', hmacDigest);
    await this.redis.hset(challengeKey, 'attempts', '0');
    await this.redis.expire(challengeKey, this.config.otpTtlSeconds);

    // 6. Set resend cooldown in Redis (60s)
    await this.redis.setex(cooldownKey, this.config.otpResendCooldownSeconds, '1');

    // 7. Deliver OTP via local adapter
    await this.otpAdapter.deliverOtp(phone, otp);

    return {
      status: 'OTP_SENT',
      cooldownSeconds: this.config.otpResendCooldownSeconds,
    };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<AuthTokens> {
    const phone = this.validateIndianPhone(dto.phone);

    if (!dto.code || !/^\d{6}$/.test(dto.code)) {
      throw new BadRequestException('Invalid OTP format. Must be a 6-digit numeric code.');
    }

    const candidateHmac = this.otpSecurityService.computeOtpHmac(phone, dto.code);
    const challengeKey = `otp:challenge:${phone}`;

    // Execute atomic Redis Lua script
    const result = await this.redis.evalLuaOtpVerify(
      challengeKey,
      candidateHmac,
      this.config.otpMaxAttempts
    );

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
    const user = await this.findOrCreateUser(phone);

    // Enforce account status check
    if (user.status === 'BLOCKED') {
      throw new ForbiddenException('ACCOUNT_BLOCKED: Your account has been permanently blocked.');
    }
    if (user.status === 'SUSPENDED') {
      throw new ForbiddenException('ACCOUNT_SUSPENDED: Your account is temporarily suspended.');
    }

    // Generate JWT access & refresh tokens
    const accessToken = this.generateAccessToken(user, dto.deviceId);
    const refreshToken = this.generateRefreshToken(user, dto.deviceId);

    // Record device session
    await this.recordDeviceSession(user.id, dto.deviceId || 'default_device', dto.platform || 'ANDROID', refreshToken);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 3600,
      user,
    };
  }

  async refreshToken(refreshTokenString: string, deviceId?: string): Promise<AuthTokens> {
    if (!refreshTokenString) {
      throw new UnauthorizedException('Refresh token is required');
    }

    try {
      const decoded = jwt.verify(refreshTokenString, this.config.jwtSecret) as any;
      if (decoded.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Check if user is blocked in Redis
      const isBlocked = await this.redis.get(`user:status:${decoded.userId}`);
      if (isBlocked === 'BLOCKED' || isBlocked === 'SUSPENDED') {
        throw new ForbiddenException(`Account is ${isBlocked.toLowerCase()}`);
      }

      const user = await this.findUserById(decoded.userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const newAccessToken = this.generateAccessToken(user, deviceId);
      const newRefreshToken = this.generateRefreshToken(user, deviceId);

      await this.recordDeviceSession(user.id, deviceId || 'default_device', 'ANDROID', newRefreshToken);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        tokenType: 'Bearer',
        expiresIn: 3600,
        user,
      };
    } catch (err: any) {
      if (err instanceof ForbiddenException) {
        throw err;
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(token: string, userId: string, deviceId?: string): Promise<{ success: boolean }> {
    // Add access token to Redis revocation blocklist
    if (token) {
      await this.redis.setex(`token:revoked:${token}`, 3600, 'REVOKED');
    }

    try {
      if (deviceId) {
        await this.db.query('DELETE FROM devices WHERE user_id = $1 AND device_id = $2;', [userId, deviceId]);
      } else {
        await this.db.query('DELETE FROM devices WHERE user_id = $1;', [userId]);
      }
    } catch {
      // Postgres offline
    }

    return { success: true };
  }

  async findOrCreateUser(phone: string): Promise<{ id: string; phone: string; status: string; roles: string[]; defaultLanguage: string }> {
    try {
      const existing = await this.db.query(
        `SELECT u.id, u.phone, u.status, u.default_language,
                COALESCE(json_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '["CUSTOMER"]') as roles
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
         WHERE u.phone = $1
         GROUP BY u.id;`,
        [phone]
      );

      if (existing.rows.length > 0) {
        const row = existing.rows[0];
        return {
          id: row.id,
          phone: row.phone,
          status: row.status,
          roles: Array.isArray(row.roles) ? row.roles : ['CUSTOMER'],
          defaultLanguage: row.default_language || 'en',
        };
      }

      // Create new user in PostgreSQL
      const newUserId = crypto.randomUUID();
      await this.db.transaction(async (client) => {
        await client.query(
          `INSERT INTO users (id, phone, status, firebase_uid, default_language)
           VALUES ($1, $2, 'ACTIVE', $1, 'en');`,
          [newUserId, phone]
        );

        // Fetch or create CUSTOMER role
        let roleRes = await client.query(`SELECT id FROM roles WHERE name = 'CUSTOMER';`);
        let roleId: string;
        if (roleRes.rows.length === 0) {
          const newRoleId = crypto.randomUUID();
          await client.query(`INSERT INTO roles (id, name, description) VALUES ($1, 'CUSTOMER', 'Default Customer Role');`, [newRoleId]);
          roleId = newRoleId;
        } else {
          roleId = roleRes.rows[0].id;
        }

        await client.query(
          `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
          [newUserId, roleId]
        );
      });

      return {
        id: newUserId,
        phone,
        status: 'ACTIVE',
        roles: ['CUSTOMER'],
        defaultLanguage: 'en',
      };
    } catch {
      // Fallback when PostgreSQL container is offline in local dev
      let user = this.inMemoryUsers.get(phone);
      if (!user) {
        user = {
          id: crypto.randomUUID(),
          phone,
          status: 'ACTIVE',
          roles: ['CUSTOMER'],
          defaultLanguage: 'en',
        };
        this.inMemoryUsers.set(phone, user);
      }
      return user;
    }
  }

  async findUserById(userId: string): Promise<{ id: string; phone: string; status: string; roles: string[]; defaultLanguage: string } | null> {
    try {
      const res = await this.db.query(
        `SELECT u.id, u.phone, u.status, u.default_language,
                COALESCE(json_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '["CUSTOMER"]') as roles
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
         WHERE u.id = $1
         GROUP BY u.id;`,
        [userId]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          id: row.id,
          phone: row.phone,
          status: row.status,
          roles: Array.isArray(row.roles) ? row.roles : ['CUSTOMER'],
          defaultLanguage: row.default_language || 'en',
        };
      }
    } catch {
      for (const u of this.inMemoryUsers.values()) {
        if (u.id === userId) return u;
      }
    }
    return null;
  }

  private generateAccessToken(user: any, deviceId?: string): string {
    return jwt.sign(
      {
        userId: user.id,
        phone: user.phone,
        status: user.status,
        roles: user.roles,
        deviceId: deviceId || 'default',
        jti: crypto.randomUUID(),
      },
      this.config.jwtSecret,
      { expiresIn: this.config.jwtExpiresIn as any }
    );
  }

  private generateRefreshToken(user: any, deviceId?: string): string {
    return jwt.sign(
      {
        userId: user.id,
        type: 'refresh',
        deviceId: deviceId || 'default',
        jti: crypto.randomUUID(),
      },
      this.config.jwtSecret,
      { expiresIn: this.config.jwtRefreshExpiresIn as any }
    );
  }

  private async recordDeviceSession(userId: string, deviceId: string, platform: string, refreshToken: string) {
    try {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await this.db.query(
        `INSERT INTO devices (user_id, device_id, platform, refresh_token_hash, last_active_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (user_id, device_id)
         DO UPDATE SET refresh_token_hash = $4, last_active_at = NOW();`,
        [userId, deviceId, platform, tokenHash]
      );
    } catch {
      // Postgres offline in local dev
    }
  }

  getDevOtpAdapter(): LocalOtpDeliveryAdapter {
    return this.otpAdapter;
  }
}

Injectable()(AuthService);
