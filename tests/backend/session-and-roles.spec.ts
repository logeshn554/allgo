import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import { AuthService } from '../../apps/api/src/auth/auth.service.ts';
import { LocalOtpDeliveryAdapter } from '../../apps/api/src/auth/adapters/local-otp-delivery.adapter.ts';
import { ConfigService } from '../../apps/api/src/config/config.service.ts';
import { DatabaseService } from '../../apps/api/src/database/database.service.ts';
import { RedisService } from '../../apps/api/src/redis/redis.service.ts';
import { UsersService } from '../../apps/api/src/users/users.service.ts';

describe('Phase 1 Backend: Sessions, Token Rotation & Role Enforcement', () => {
  let authService: AuthService;
  let usersService: UsersService;
  let redisService: RedisService;
  let configService: ConfigService;
  let otpAdapter: LocalOtpDeliveryAdapter;

  beforeEach(async () => {
    configService = new ConfigService();
    const dbService = new DatabaseService(configService);
    redisService = new RedisService(configService);
    await redisService.onModuleInit();

    otpAdapter = new LocalOtpDeliveryAdapter(configService);
    authService = new AuthService(configService, dbService, redisService, otpAdapter);
    usersService = new UsersService(dbService, redisService);
  });

  describe('Session Creation & Refresh Token Rotation', () => {
    it('should rotate refresh token and issue new token pair', async () => {
      const phone = '+919876500001';
      await authService.sendOtp({ phone });
      const otp = otpAdapter.getLastIssuedOtpForDevTesting(phone)!;

      const initialSession = await authService.verifyOtp({ phone, code: otp });
      assert.ok(initialSession.accessToken);
      assert.ok(initialSession.refreshToken);

      // Perform refresh token rotation
      const rotatedSession = await authService.refreshToken(initialSession.refreshToken);
      assert.ok(rotatedSession.accessToken);
      assert.ok(rotatedSession.refreshToken);
      assert.notStrictEqual(rotatedSession.refreshToken, initialSession.refreshToken, 'Refresh token must be rotated');
    });

    it('should reject refresh when refresh token is malformed or forged', async () => {
      await assert.rejects(
        async () => authService.refreshToken('invalid_jwt_string'),
        /Invalid or expired refresh token/i
      );
    });

    it('should invalidate token on logout via Redis revocation blocklist', async () => {
      const phone = '+919876500002';
      await authService.sendOtp({ phone });
      const otp = otpAdapter.getLastIssuedOtpForDevTesting(phone)!;

      const session = await authService.verifyOtp({ phone, code: otp });
      const res = await authService.logout(session.accessToken, session.user.id);
      assert.strictEqual(res.success, true);

      // Verify token is in Redis revocation list
      const isRevoked = await redisService.get(`token:revoked:${session.accessToken}`);
      assert.strictEqual(isRevoked, 'REVOKED');
    });
  });

  describe('Immediate Account Status & Revocation Enforcement', () => {
    it('should immediately block requests for BLOCKED user independent of JWT expiry', async () => {
      const phone = '+919876500003';
      await authService.sendOtp({ phone });
      const otp = otpAdapter.getLastIssuedOtpForDevTesting(phone)!;

      const session = await authService.verifyOtp({ phone, code: otp });
      const userId = session.user.id;

      // Admin suspends user account
      await usersService.updateUserStatus(userId, 'BLOCKED');

      // Check Redis status cache populated with BLOCKED
      const redisStatus = await redisService.get(`user:status:${userId}`);
      assert.strictEqual(redisStatus, 'BLOCKED');

      // Attempting to refresh tokens with valid unexpired JWT must be rejected
      await assert.rejects(
        async () => authService.refreshToken(session.refreshToken),
        /Account is blocked/i
      );
    });

    it('should reject suspended user from protected operations', async () => {
      const phone = '+919876500004';
      await authService.sendOtp({ phone });
      const otp = otpAdapter.getLastIssuedOtpForDevTesting(phone)!;

      const session = await authService.verifyOtp({ phone, code: otp });
      await usersService.updateUserStatus(session.user.id, 'SUSPENDED');

      await assert.rejects(
        async () => authService.refreshToken(session.refreshToken),
        /Account is suspended/i
      );
    });
  });

  describe('User Directory & Role Assignment Foundation', () => {
    it('should list users with pagination and role metadata', async () => {
      const result = await usersService.listUsers({ page: 1, limit: 10 });
      assert.ok(Array.isArray(result.users));
      assert.ok(result.total >= 0);
    });

    it('should retrieve single user details by ID', async () => {
      const result = await usersService.getUserById('usr_admin_001');
      assert.ok(result);
      assert.strictEqual(result.phone, '+919876543210');
      assert.ok(result.roles.includes('ADMIN'));
    });
  });
});
