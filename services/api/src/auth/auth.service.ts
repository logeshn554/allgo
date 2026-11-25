import { ForbiddenException, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '../config/config.service.js';
import { DatabaseService } from '../database/database.service.js';
import { RedisService } from '../redis/redis.service.js';
import { LocalOtpDeliveryAdapter } from './adapters/local-otp-delivery.adapter.js';
import { AuthManagerRepository } from './data/auth-manager.repository.js';
import { AuthRepository, UserEntity } from './data/auth.repository.js';
import { SendOtpDto } from './dto/send-otp.dto.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';
import { OtpService } from './otp.service.js';
import { AuthTokens, TokenSessionService } from './token-session.service.js';
import { TwoFactorChallengeResponse, TwoFactorService } from './two-factor.service.js';

export { AuthTokens };

@Injectable()
export class AuthService {
  private readonly authRepo: AuthRepository;
  private readonly otpService: OtpService;
  private readonly tokenSessionService: TokenSessionService;

  constructor(
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly otpAdapter: LocalOtpDeliveryAdapter,
    @Optional() authRepo?: AuthRepository,
    @Optional() otpService?: OtpService,
    @Optional() tokenSessionService?: TokenSessionService,
    @Optional() private readonly authManagerRepo?: AuthManagerRepository,
    @Optional() private readonly twoFactorService?: TwoFactorService,
  ) {
    if (authRepo && otpService && tokenSessionService) {
      this.authRepo = authRepo;
      this.otpService = otpService;
      this.tokenSessionService = tokenSessionService;
    } else {
      this.authRepo = new AuthRepository(this.db);
      this.otpService = new OtpService(this.config, this.redis, this.otpAdapter);
      this.tokenSessionService = new TokenSessionService(
        this.config,
        this.redis,
        this.authRepo,
        this.otpService,
      );
    }
  }

  validateIndianPhone(phone: string): string {
    return this.otpService.validateIndianPhone(phone);
  }

  async sendOtp(
    dto: SendOtpDto,
    clientIp = '127.0.0.1',
  ): Promise<{ status: string; cooldownSeconds: number }> {
    if (this.authManagerRepo) {
      const settings = await this.authManagerRepo.getSettings();
      if (!settings.phoneOtpEnabled) {
        throw new ForbiddenException('Phone OTP authentication is currently disabled.');
      }
    }
    return this.otpService.sendOtp(dto, clientIp);
  }

  async verifyOtp(
    dto: VerifyOtpDto,
    meta?: { ipAddress?: string | null; userAgent?: string | null },
  ): Promise<AuthTokens | TwoFactorChallengeResponse> {
    if (this.twoFactorService && this.authManagerRepo) {
      const settings = await this.authManagerRepo.getSettings();
      if (!settings.phoneOtpEnabled) {
        throw new ForbiddenException('Phone OTP authentication is currently disabled.');
      }
      const user = await this.tokenSessionService.verifyOtpAndLoadUser(dto);
      const extUser = await this.authManagerRepo.findUserById(user.id);
      if (
        extUser &&
        this.twoFactorService.isTwoFactorRequiredForLogin(extUser, settings.twoFactorPolicy)
      ) {
        return this.twoFactorService.createLoginChallenge(extUser, {
          deviceId: dto.deviceId,
          platform: dto.platform || 'WEB',
          ipAddress: meta?.ipAddress || null,
          userAgent: meta?.userAgent || null,
          loginMethod: 'PHONE_OTP',
        });
      }
      await this.authManagerRepo.recordLoginAudit(user.id, 'PHONE_OTP', 'phone', user.phone);
      return this.tokenSessionService.issueSessionTokens(extUser || user, dto, {
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        loginMethod: 'PHONE_OTP',
      });
    }
    return this.tokenSessionService.verifyOtp(dto);
  }

  async refreshToken(refreshTokenString: string, deviceId?: string): Promise<AuthTokens> {
    return this.tokenSessionService.refreshToken(refreshTokenString, deviceId);
  }

  async logout(
    token: string,
    userId: string,
    deviceId?: string,
    refreshToken?: string,
    sessionToken?: string,
  ): Promise<{ success: boolean }> {
    return this.tokenSessionService.logout(token, userId, deviceId, refreshToken, sessionToken);
  }

  async issueWebSession(
    user: any,
    meta: {
      deviceId?: string;
      platform?: string;
      ipAddress?: string | null;
      userAgent?: string | null;
      loginMethod: string;
      refreshToken?: string | null;
    },
  ) {
    return this.tokenSessionService.createWebSession(user, meta);
  }

  async findOrCreateUser(phone: string): Promise<UserEntity> {
    const existing = await this.authRepo.findUserByPhone(phone);
    if (existing) {
      return existing;
    }
    return this.authRepo.createUserWithCustomerRole(phone);
  }

  async findUserById(userId: string): Promise<UserEntity | null> {
    return this.authRepo.findUserById(userId);
  }

  getDevOtpAdapter(): LocalOtpDeliveryAdapter {
    return this.otpService.getDevOtpAdapter();
  }

  async listSessions(userId: string): Promise<any[]> {
    if (this.authManagerRepo) {
      return this.authManagerRepo.listDevicesForUser(userId);
    }
    return this.authRepo.listDeviceSessions(userId);
  }

  async revokeSession(userId: string, deviceId?: string): Promise<{ success: boolean }> {
    if (deviceId) {
      let sessionTokenHash: string | null = null;
      if (this.authManagerRepo) {
        const res = await this.authManagerRepo.revokeDeviceForUser(userId, deviceId);
        sessionTokenHash = res.sessionTokenHash || null;
      }
      await this.authRepo.deleteDeviceSession(userId, deviceId);
      await this.tokenSessionService.invalidateDeviceSession(userId, deviceId, sessionTokenHash);
      return { success: true };
    }

    let revokedDevices: Array<{ deviceId: string; sessionTokenHash?: string | null }> = [];
    if (this.authManagerRepo) {
      const res = await this.authManagerRepo.revokeAllDevicesForUser(userId);
      revokedDevices = res.revokedDevices;
    }
    await this.authRepo.deleteDeviceSession(userId);
    await this.tokenSessionService.invalidateAllUserSessions(userId, revokedDevices);
    return { success: true };
  }
}
