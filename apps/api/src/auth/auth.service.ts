import { Injectable } from '@nestjs/common';
import { ConfigService } from '../config/config.service.js';
import { DatabaseService } from '../database/database.service.js';
import { RedisService } from '../redis/redis.service.js';
import { LocalOtpDeliveryAdapter } from './adapters/local-otp-delivery.adapter.js';
import { SendOtpDto } from './dto/send-otp.dto.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';
import { AuthRepository, UserEntity } from './data/auth.repository.js';
import { OtpService } from './otp.service.js';
import { TokenSessionService, AuthTokens } from './token-session.service.js';

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
    authRepo?: AuthRepository,
    otpService?: OtpService,
    tokenSessionService?: TokenSessionService,
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
        this.otpService
      );
    }
  }

  validateIndianPhone(phone: string): string {
    return this.otpService.validateIndianPhone(phone);
  }

  async sendOtp(dto: SendOtpDto, clientIp: string = '127.0.0.1'): Promise<{ status: string; cooldownSeconds: number }> {
    return this.otpService.sendOtp(dto, clientIp);
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<AuthTokens> {
    return this.tokenSessionService.verifyOtp(dto);
  }

  async refreshToken(refreshTokenString: string, deviceId?: string): Promise<AuthTokens> {
    return this.tokenSessionService.refreshToken(refreshTokenString, deviceId);
  }

  async logout(token: string, userId: string, deviceId?: string, refreshToken?: string): Promise<{ success: boolean }> {
    return this.tokenSessionService.logout(token, userId, deviceId, refreshToken);
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
}
