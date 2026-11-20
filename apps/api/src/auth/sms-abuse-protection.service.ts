import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { RedisService } from '../redis/redis.service.js';

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
  reason?: string;
  isPumpingAttack?: boolean;
}

@Injectable()
export class SmsAbuseProtectionService {
  private readonly logger = new Logger(SmsAbuseProtectionService.name);

  // Per-phone: 1 per 60s cooldown, max 3 per hr, max 5 per 24hr
  // Per-IP: max 5 per 15 min, max 20 per hr, max 50 per 24hr
  // SMS pumping heuristic: >10 distinct phones requested from same IP/subnet in 10 minutes

  constructor(private readonly redis: RedisService) {}

  async checkAndRecordSmsRequest(phone: string, clientIp: string): Promise<RateLimitResult> {
    const now = Math.floor(Date.now() / 1000);

    // 1. Resend cooldown per phone (60s)
    const cooldownKey = `otp:cooldown:${phone}`;
    const inCooldown = await this.redis.exists(cooldownKey);
    if (inCooldown) {
      return {
        allowed: false,
        retryAfterSeconds: 60,
        reason: 'Please wait 60 seconds before requesting another OTP.',
      };
    }

    // 2. Hourly Phone Limit (max 3/hr)
    const phoneHourlyKey = `otp:rate:phone:hr:${phone}`;
    const phoneCount = await this.redis.hincrby(phoneHourlyKey, 'count', 1);
    if (phoneCount === 1) {
      await this.redis.expire(phoneHourlyKey, 3600);
    }
    if (phoneCount > 3) {
      return {
        allowed: false,
        retryAfterSeconds: 3600,
        reason: 'Maximum SMS limit exceeded for this phone number (max 3 per hour).',
      };
    }

    // 3. Daily Phone Limit (max 5/24hr)
    const phoneDailyKey = `otp:rate:phone:day:${phone}`;
    const phoneDailyCount = await this.redis.hincrby(phoneDailyKey, 'count', 1);
    if (phoneDailyCount === 1) {
      await this.redis.expire(phoneDailyKey, 86400);
    }
    if (phoneDailyCount > 5) {
      return {
        allowed: false,
        retryAfterSeconds: 86400,
        reason: 'Daily SMS quota exceeded for this phone number (max 5 per day).',
      };
    }

    // 4. SMS Pumping Alert Detection (Evaluated before general IP threshold)
    // Track distinct phones hit by this IP within a 10-minute sliding window
    const pumpingSetKey = `otp:pumping:ip:${clientIp}:phones`;
    await this.redis.sadd(pumpingSetKey, phone);
    await this.redis.expire(pumpingSetKey, 600);
    const setMembers = await this.redis.smembers(pumpingSetKey);
    const distinctPhonesCount = Array.isArray(setMembers) ? setMembers.length : 1;

    if (distinctPhonesCount >= 8) {
      this.logger.error(
        `🚨 CRITICAL SECURITY ALERT [SMS PUMPING FRAUD DETECTED] IP=${clientIp} ` +
        `targeted ${distinctPhonesCount} unique phone numbers in 10 minutes!`
      );
      return {
        allowed: false,
        retryAfterSeconds: 86400,
        reason: 'Traffic pattern identified as high-risk automated SMS pumping. Access blocked.',
        isPumpingAttack: true,
      };
    }

    // 5. General IP Rate Limits: 5 per 15 min for normal requests
    const ip15MinKey = `otp:rate:ip:15m:${clientIp}`;
    const ip15MinCount = await this.redis.hincrby(ip15MinKey, 'count', 1);
    if (ip15MinCount === 1) {
      await this.redis.expire(ip15MinKey, 900);
    }
    if (ip15MinCount > 5) {
      return {
        allowed: false,
        retryAfterSeconds: 900,
        reason: 'Too many requests from this network. Please try again in 15 minutes.',
      };
    }

    // Set 60s cooldown
    await this.redis.setex(cooldownKey, 60, '1');

    return { allowed: true };
  }
}
