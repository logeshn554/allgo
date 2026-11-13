import {
  Injectable,
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
import { AuthRepository } from './data/auth.repository.js';
import { OtpService } from './otp.service.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';

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

@Injectable()
export class TokenSessionService {
  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly authRepo: AuthRepository,
    private readonly otpService: OtpService,
  ) {}

  async verifyOtp(dto: VerifyOtpDto): Promise<AuthTokens> {
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
      user = await this.authRepo.createUserWithCustomerRole(phone);
    }

    if (user.status === 'BLOCKED') {
      throw new ForbiddenException('ACCOUNT_BLOCKED: Your account has been permanently blocked.');
    }
    if (user.status === 'SUSPENDED') {
      throw new ForbiddenException('ACCOUNT_SUSPENDED: Your account is temporarily suspended.');
    }

    const accessToken = this.generateAccessToken(user, dto.deviceId);
    const refreshToken = this.generateRefreshToken(user, dto.deviceId);

    await this.authRepo.recordDeviceSession(
      user.id,
      dto.deviceId || 'default_device',
      dto.platform || 'ANDROID',
      refreshToken
    );

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

      const newAccessToken = this.generateAccessToken(user, targetDeviceId);
      const newRefreshToken = this.generateRefreshToken(user, targetDeviceId);

      await this.authRepo.recordDeviceSession(user.id, targetDeviceId, 'ANDROID', newRefreshToken);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        tokenType: 'Bearer',
        expiresIn: 3600,
        user,
      };
    } catch (err: any) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new ServiceUnavailableException(`Database or cache service is unavailable: ${err?.message || err}`);
    }
  }

  async logout(token: string, userId: string, deviceId?: string, refreshToken?: string): Promise<{ success: boolean }> {
    if (token) {
      await this.redis.setex(`token:revoked:${token}`, 3600, 'REVOKED');
    }

    if (refreshToken) {
      await this.redis.setex(`token:revoked:${refreshToken}`, 86400, 'REVOKED');
    }

    await this.authRepo.deleteDeviceSession(userId, deviceId);

    return { success: true };
  }

  public generateAccessToken(user: any, deviceId?: string): string {
    return jwt.sign(
      {
        userId: user.id,
        phone: user.phone,
        status: user.status,
        roles: user.roles,
        deviceId: deviceId || 'default_device',
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
