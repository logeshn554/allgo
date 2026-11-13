import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RedisService } from '../../redis/redis.service.js';

@Injectable()
export class DeliveryOtpRateLimiterGuard implements CanActivate {
  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const orderId = request.params.id || request.params.jobId || request.body?.orderId || request.body?.jobId;

    if (!orderId) {
      return true;
    }

    const lockKey = `otp:lock:${orderId}`;
    const attemptsKey = `otp:attempts:${orderId}`;

    // 1. Check if order OTP verification is currently locked
    const isLocked = await this.redis.get(lockKey);
    if (isLocked) {
      const ttl = await this.redis.ttl(lockKey);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'TOO_MANY_ATTEMPTS',
          message: `Verification locked due to 3 failed attempts. Please retry after ${Math.ceil(ttl / 60)} minutes.`,
          retryAfterSeconds: ttl,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Attach orderId and helper methods to request
    request.otpRateLimit = {
      recordFailure: async () => {
        const attempts = await this.redis.hincrby(attemptsKey, 'count', 1);
        if (attempts === 1) {
          await this.redis.expire(attemptsKey, 900); // 15-minute sliding window
        }
        if (attempts >= 3) {
          // Lock verification for 15 minutes (900 seconds)
          await this.redis.setex(lockKey, 900, 'LOCKED');
          await this.redis.del(attemptsKey);
        }
        return attempts;
      },
      recordSuccess: async () => {
        await this.redis.del(attemptsKey);
        await this.redis.del(lockKey);
      },
    };

    return true;
  }
}
