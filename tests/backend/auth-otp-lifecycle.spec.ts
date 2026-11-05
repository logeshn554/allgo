import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { OtpSecurityService, OtpVerificationStatus } from '@allgo/common';
import { AuthService } from '../../apps/api/src/auth/auth.service.ts';
import { LocalOtpDeliveryAdapter } from '../../apps/api/src/auth/adapters/local-otp-delivery.adapter.ts';
import { ConfigService } from '../../apps/api/src/config/config.service.ts';
import { DatabaseService } from '../../apps/api/src/database/database.service.ts';
import { RedisService } from '../../apps/api/src/redis/redis.service.ts';

describe('Phase 1 Backend: Phone OTP Authentication Lifecycle (Unit & Contract Tests)', () => {
  let authService: AuthService;
  let redisService: RedisService;
  let otpAdapter: LocalOtpDeliveryAdapter;
  let configService: ConfigService;

  beforeEach(async () => {
    configService = new ConfigService();
    const dbService = new DatabaseService(configService);
    redisService = new RedisService(configService);
    await redisService.onModuleInit();

    otpAdapter = new LocalOtpDeliveryAdapter(configService);
    authService = new AuthService(configService, dbService, redisService, otpAdapter);
  });

  describe('Indian Mobile Phone Number Validation', () => {
    it('should accept valid E.164 Indian mobile numbers starting with 6, 7, 8, or 9', () => {
      const validNumbers = [
        '+919876543210',
        '+918765432109',
        '+917654321098',
        '+916543210987',
      ];
      for (const phone of validNumbers) {
        assert.doesNotThrow(() => authService.validateIndianPhone(phone));
      }
    });

    it('should reject invalid mobile numbers, landlines, or incorrect country codes', () => {
      const invalidNumbers = [
        '9876543210', // Missing +91
        '+915876543210', // Starts with 5 (invalid in India)
        '+91987654321', // 9 digits (too short)
        '+9198765432100', // 11 digits (too long)
        '+14155552671', // US country code
        '+9198765abcd', // Alpha characters
        '', // Empty
      ];
      for (const phone of invalidNumbers) {
        assert.throws(
          () => authService.validateIndianPhone(phone),
          /Invalid Indian mobile number/i,
          `Should reject ${phone}`
        );
      }
    });
  });

  describe('OTP Generation, Entropy & Rate Limiting', () => {
    it('should generate cryptographically secure 6-digit numeric OTPs', () => {
      const otpService = new OtpSecurityService('test_server_pepper_secret_key_32_chars');
      const otps = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const code = otpService.generateSecureOtp(6);
        assert.strictEqual(code.length, 6);
        assert.match(code, /^\d{6}$/);
        otps.add(code);
      }
      assert.ok(otps.size >= 45, 'Random OTPs must show strong cryptographic entropy');
    });

    it('should dispatch OTP and enforce 60-second cooldown on consecutive requests', async () => {
      const phone = '+919876543210';
      const res = await authService.sendOtp({ phone });
      assert.strictEqual(res.status, 'OTP_SENT');
      assert.strictEqual(res.cooldownSeconds, 60);

      // Immediate second request within cooldown must fail
      await assert.rejects(
        async () => authService.sendOtp({ phone }),
        /wait 60 seconds before requesting another OTP/i
      );
    });

    it('should deliver OTP to local dev adapter without exposing plaintext in production', async () => {
      const phone = '+919988776655';
      await authService.sendOtp({ phone });

      const deliveredOtp = otpAdapter.getLastIssuedOtpForDevTesting(phone);
      assert.ok(deliveredOtp, 'Local adapter must receive the issued OTP in dev mode');
      assert.match(deliveredOtp!, /^\d{6}$/);
    });
  });

  describe('Atomic Verification & Consumption Contract', () => {
    it('should successfully verify a valid OTP and atomically consume the challenge', async () => {
      const phone = '+919123456789';
      await authService.sendOtp({ phone });

      const issuedOtp = otpAdapter.getLastIssuedOtpForDevTesting(phone)!;
      assert.ok(issuedOtp);

      const authRes = await authService.verifyOtp({ phone, code: issuedOtp });
      assert.ok(authRes.accessToken, 'Must issue access token');
      assert.ok(authRes.refreshToken, 'Must issue refresh token');
      assert.strictEqual(authRes.user.phone, phone);
      assert.strictEqual(authRes.user.status, 'ACTIVE');

      // Attempting to reuse the exact same OTP immediately must be rejected
      await assert.rejects(
        async () => authService.verifyOtp({ phone, code: issuedOtp }),
        /OTP has expired or has already been used/i,
        'Consumed challenge must be atomically deleted upon first match'
      );
    });

    it('should reject invalid OTP codes and lock challenge after 3 failed attempts', async () => {
      const phone = '+919111222333';
      await authService.sendOtp({ phone });

      // Attempt 1: Invalid code
      await assert.rejects(
        async () => authService.verifyOtp({ phone, code: '000000' }),
        /Invalid OTP code/i
      );

      // Attempt 2: Invalid code
      await assert.rejects(
        async () => authService.verifyOtp({ phone, code: '111111' }),
        /Invalid OTP code/i
      );

      // Attempt 3: Invalid code (locks out challenge)
      await assert.rejects(
        async () => authService.verifyOtp({ phone, code: '222222' }),
        /Maximum verification attempts exceeded/i
      );

      // Attempt 4: Even if user now presents the real code, challenge is destroyed
      const issuedOtp = otpAdapter.getLastIssuedOtpForDevTesting(phone)!;
      await assert.rejects(
        async () => authService.verifyOtp({ phone, code: issuedOtp }),
        /OTP has expired or has already been used/i
      );
    });

    it('should prevent race condition in concurrent OTP verification', async () => {
      const phone = '+919444555666';
      await authService.sendOtp({ phone });
      const issuedOtp = otpAdapter.getLastIssuedOtpForDevTesting(phone)!;

      // Launch 5 concurrent verification attempts simultaneously with the same valid code
      const promises = [
        authService.verifyOtp({ phone, code: issuedOtp }).catch((e) => e),
        authService.verifyOtp({ phone, code: issuedOtp }).catch((e) => e),
        authService.verifyOtp({ phone, code: issuedOtp }).catch((e) => e),
        authService.verifyOtp({ phone, code: issuedOtp }).catch((e) => e),
        authService.verifyOtp({ phone, code: issuedOtp }).catch((e) => e),
      ];

      const results = await Promise.all(promises);
      const successes = results.filter((r) => r && r.accessToken);
      const failures = results.filter((r) => r instanceof Error);

      assert.strictEqual(successes.length, 1, 'Exactly one concurrent request must succeed');
      assert.strictEqual(failures.length, 4, 'Remaining concurrent requests must fail');
    });
  });
});
