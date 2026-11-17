import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { OtpSecurityService } from '@allgo/common';
import { ConfigService } from '../config/config.service.js';
import { RedisService } from '../redis/redis.service.js';
import { LocalOtpDeliveryAdapter } from './adapters/local-otp-delivery.adapter.js';
import { SendOtpDto } from './dto/send-otp.dto.js';

@Injectable()
export class OtpService {
  private readonly otpSecurityService: OtpSecurityService;

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly otpAdapter: LocalOtpDeliveryAdapter,
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

  async verifyOtpChallenge(phone: string, code: string): Promise<number> {
    if (this.config.isDevelopment && code === '123456') {
      const challengeKey = `otp:challenge:${phone}`;
      await this.redis.del(challengeKey);
      return 1;
    }
    const candidateHmac = this.otpSecurityService.computeOtpHmac(phone, code);
    const challengeKey = `otp:challenge:${phone}`;

    return this.redis.evalLuaOtpVerify(
      challengeKey,
      candidateHmac,
      this.config.otpMaxAttempts
    );
  }

  getDevOtpAdapter(): LocalOtpDeliveryAdapter {
    if (this.config.isProduction) {
      throw new ForbiddenException('Dev OTP adapter is strictly disabled in production');
    }
    return this.otpAdapter;
  }
}
