import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import { AuthService } from '../../apps/api/dist/auth/auth.service.js';
import { LocalOtpDeliveryAdapter } from '../../apps/api/dist/auth/adapters/local-otp-delivery.adapter.js';
import { ConfigService } from '../../apps/api/dist/config/config.service.js';
import { UsersService } from '../../apps/api/dist/users/users.service.js';
import { UsersController } from '../../apps/api/dist/users/users.controller.js';
import { InMemoryRedisTestDouble, MockDatabaseService } from '../helpers/test-doubles.ts';

describe('Phase 1 Backend: Sessions, Token Rotation & Role Enforcement', () => {
  let authService: AuthService;
  let usersService: UsersService;
  let redisService: InMemoryRedisTestDouble;
  let dbService: MockDatabaseService;
  let configService: ConfigService;
  let otpAdapter: LocalOtpDeliveryAdapter;

  beforeEach(async () => {
    configService = new ConfigService();
    dbService = new MockDatabaseService();
    redisService = new InMemoryRedisTestDouble();

    // Seed mockDb with initial admin user for directory retrieval tests
    dbService.users.set('usr_admin_001', {
      id: 'usr_admin_001',
      phone: '+919876543210',
      status: 'ACTIVE',
      default_language: 'en',
      created_at: new Date().toISOString(),
    });
    dbService.userRoles.set('usr_admin_001', new Set(['ADMIN', 'CUSTOMER']));

    otpAdapter = new LocalOtpDeliveryAdapter(configService);
    authService = new AuthService(configService, dbService as any, redisService as any, otpAdapter);
    usersService = new UsersService(dbService as any, redisService as any);
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

    it('should enforce IDOR prevention on user profile endpoint', async () => {
      const controller = new UsersController(usersService);
      
      // 1. Owner accessing their own profile should succeed
      const ownerReq = { user: { userId: 'usr_admin_001', roles: ['CUSTOMER'] } };
      const ownerResult = await controller.getUser(ownerReq, 'usr_admin_001');
      assert.strictEqual(ownerResult.id, 'usr_admin_001');

      // 2. Admin accessing another user profile should succeed
      const adminReq = { user: { userId: 'usr_different_admin', roles: ['ADMIN'] } };
      const adminResult = await controller.getUser(adminReq, 'usr_admin_001');
      assert.strictEqual(adminResult.id, 'usr_admin_001');

      // 3. Different non-admin user attempting cross-user IDOR access must be rejected with 403 Forbidden
      const attackerReq = { user: { userId: 'usr_attacker_999', roles: ['CUSTOMER'] } };
      await assert.rejects(
        async () => {
          await controller.getUser(attackerReq, 'usr_admin_001');
        },
        {
          name: 'ForbiddenException',
          message: 'Access denied: You do not have permission to view this profile.',
        }
      );
    });

    it('should update user self-service profile and persist changes', async () => {
      const controller = new UsersController(usersService);
      const req = { user: { userId: 'usr_admin_001', roles: ['CUSTOMER'] } };

      const updated = await controller.updateProfile(req, {
        fullName: 'Karthik Raja',
        defaultLanguage: 'ta',
      });

      assert.strictEqual(updated.fullName, 'Karthik Raja');
      assert.strictEqual(updated.defaultLanguage, 'ta');

      // Fetch via getProfile to confirm persistence
      const profile = await controller.getProfile(req);
      assert.strictEqual(profile.fullName, 'Karthik Raja');
      assert.strictEqual(profile.defaultLanguage, 'ta');

      // Also verify updateMe alias works
      const aliasUpdated = await controller.updateMe(req, {
        fullName: 'Karthik R',
      });
      assert.strictEqual(aliasUpdated.fullName, 'Karthik R');
      assert.strictEqual(aliasUpdated.defaultLanguage, 'ta');
    });

    it('should enforce IDOR prevention and reject profile update without user context', async () => {
      const controller = new UsersController(usersService);
      const unauthReq = { user: undefined };

      await assert.rejects(
        async () => {
          await controller.updateProfile(unauthReq, { fullName: 'Hacker' });
        },
        {
          name: 'ForbiddenException',
          message: 'User context is missing',
        }
      );
    });
  });
});
