import assert from 'node:assert';
import crypto from 'node:crypto';
import { beforeEach, describe, it } from 'node:test';
import { ForbiddenException, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { LocalOtpDeliveryAdapter } from '../../services/api/dist/auth/adapters/local-otp-delivery.adapter.js';
import { AuthService } from '../../services/api/dist/auth/auth.service.js';
import { RefreshTokenDto } from '../../services/api/dist/auth/dto/refresh-token.dto.js';
import { SendOtpDto } from '../../services/api/dist/auth/dto/send-otp.dto.js';
import { VerifyOtpDto } from '../../services/api/dist/auth/dto/verify-otp.dto.js';
import { ConfigService } from '../../services/api/dist/config/config.service.js';
import { InMemoryRedisTestDouble, MockDatabaseService } from '../helpers/test-doubles.ts';

describe('M1 Empirical Stress Test: Refresh Token Rotation & Session Security', () => {
  let authService: AuthService;
  let mockDb: MockDatabaseService;
  let mockRedis: InMemoryRedisTestDouble;
  let config: ConfigService;
  let otpAdapter: LocalOtpDeliveryAdapter;

  const testUser = {
    id: 'usr_empirical_123',
    phone: '+919876543210',
    status: 'ACTIVE',
    default_language: 'en',
    created_at: new Date().toISOString(),
  };

  beforeEach(() => {
    config = new ConfigService();
    mockDb = new MockDatabaseService();
    mockRedis = new InMemoryRedisTestDouble();
    otpAdapter = new LocalOtpDeliveryAdapter();

    // Seed test user with fresh active status
    mockDb.users.set(testUser.id, { ...testUser, status: 'ACTIVE' });
    mockDb.userRoles.set(testUser.id, new Set(['CUSTOMER']));

    authService = new AuthService(config, mockDb as any, mockRedis as any, otpAdapter);
  });

  function mintTokens(user: any, deviceId?: string) {
    const accessToken = jwt.sign(
      {
        userId: user.id,
        phone: user.phone,
        status: user.status,
        roles: ['CUSTOMER'],
        deviceId: deviceId || 'default_device',
        jti: crypto.randomUUID(),
      },
      config.jwtSecret,
      { algorithm: 'HS256', expiresIn: '1h' },
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        type: 'refresh',
        deviceId: deviceId || 'default_device',
        jti: crypto.randomUUID(),
      },
      config.jwtSecret,
      { algorithm: 'HS256', expiresIn: '30d' },
    );

    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    mockDb.devices.set(`${user.id}:${deviceId || 'default_device'}`, {
      user_id: user.id,
      device_id: deviceId || 'default_device',
      platform: 'ANDROID',
      refresh_token_hash: hash,
    });

    return { accessToken, refreshToken, hash };
  }

  describe('4.1 Token Rotation Baseline & Invariant Enforcement', () => {
    it('should rotate refresh token cleanly, updating DB hash and blacklisting old token', async () => {
      const { refreshToken: rt1 } = mintTokens(testUser, 'dev_pixel_9');

      const rotated = await authService.refreshToken(rt1, 'dev_pixel_9');
      assert.ok(rotated.accessToken, 'Must issue new access token');
      assert.ok(rotated.refreshToken, 'Must issue new refresh token');
      assert.notStrictEqual(
        rotated.refreshToken,
        rt1,
        'New refresh token must be different from old',
      );

      // Old token must be marked REVOKED in Redis
      const revokedInRedis = await mockRedis.get(`token:revoked:${rt1}`);
      assert.strictEqual(
        revokedInRedis,
        'REVOKED',
        'Old refresh token must be blacklisted in Redis',
      );

      // DB device record must now hold the hash of the new token
      const deviceRecord = mockDb.devices.get(`${testUser.id}:dev_pixel_9`);
      assert.ok(deviceRecord, 'Device session must exist in DB');
      const expectedNewHash = crypto
        .createHash('sha256')
        .update(rotated.refreshToken)
        .digest('hex');
      assert.strictEqual(
        deviceRecord.refresh_token_hash,
        expectedNewHash,
        'DB must store new token hash',
      );
    });

    it('should rotate cleanly when deviceId is omitted in request (falls back to JWT claim)', async () => {
      const { refreshToken: rt1 } = mintTokens(testUser, 'dev_pixel_9');

      // deviceId argument is omitted
      const rotated = await authService.refreshToken(rt1);
      assert.ok(rotated.accessToken);
      assert.ok(rotated.refreshToken);

      const deviceRecord = mockDb.devices.get(`${testUser.id}:dev_pixel_9`);
      assert.ok(deviceRecord);
      const expectedNewHash = crypto
        .createHash('sha256')
        .update(rotated.refreshToken)
        .digest('hex');
      assert.strictEqual(deviceRecord.refresh_token_hash, expectedNewHash);
    });

    it('should rotate cleanly when deviceId was originally default_device', async () => {
      const { refreshToken: rt1 } = mintTokens(testUser); // default_device

      const rotated = await authService.refreshToken(rt1);
      assert.ok(rotated.accessToken);
      assert.ok(rotated.refreshToken);

      const deviceRecord = mockDb.devices.get(`${testUser.id}:default_device`);
      assert.ok(deviceRecord);
      const expectedNewHash = crypto
        .createHash('sha256')
        .update(rotated.refreshToken)
        .digest('hex');
      assert.strictEqual(deviceRecord.refresh_token_hash, expectedNewHash);
    });
  });

  describe('4.2 Revoked and Deleted Session Edge Cases', () => {
    it('should reject refresh when device session has been deleted from devices table (HTTP 401)', async () => {
      const { refreshToken: rt1 } = mintTokens(testUser, 'dev_iphone_15');

      // Simulate session revocation / logout on this device
      mockDb.devices.delete(`${testUser.id}:dev_iphone_15`);

      await assert.rejects(
        () => authService.refreshToken(rt1, 'dev_iphone_15'),
        (err: any) => {
          assert.ok(err instanceof UnauthorizedException, 'Must throw UnauthorizedException');
          assert.strictEqual(err.message, 'Session not found or revoked');
          return true;
        },
      );
    });

    it('should reject refresh when user account is SUSPENDED in database (HTTP 403)', async () => {
      const { refreshToken: rt1 } = mintTokens(testUser, 'dev_pixel_9');

      // Suspend user in DB
      mockDb.users.get(testUser.id).status = 'SUSPENDED';

      await assert.rejects(
        () => authService.refreshToken(rt1, 'dev_pixel_9'),
        (err: any) => {
          assert.ok(err instanceof ForbiddenException, 'Must throw ForbiddenException');
          assert.ok(err.message.includes('suspended'));
          return true;
        },
      );
    });

    it('should reject refresh when user account is BLOCKED in database (HTTP 403)', async () => {
      const { refreshToken: rt1 } = mintTokens(testUser, 'dev_pixel_9');

      // Block user in DB
      mockDb.users.get(testUser.id).status = 'BLOCKED';

      await assert.rejects(
        () => authService.refreshToken(rt1, 'dev_pixel_9'),
        (err: any) => {
          assert.ok(err instanceof ForbiddenException, 'Must throw ForbiddenException');
          assert.ok(err.message.includes('blocked'));
          return true;
        },
      );
    });

    it('should reject refresh when user status is cached as BLOCKED in Redis (HTTP 403)', async () => {
      const { refreshToken: rt1 } = mintTokens(testUser, 'dev_pixel_9');

      // Cache blocked status in Redis
      await mockRedis.set(`user:status:${testUser.id}`, 'BLOCKED');

      await assert.rejects(
        () => authService.refreshToken(rt1, 'dev_pixel_9'),
        (err: any) => {
          assert.ok(err instanceof ForbiddenException, 'Must throw ForbiddenException');
          assert.ok(err.message.includes('blocked'));
          return true;
        },
      );
    });
  });

  describe('4.3 Adversarial Token Edge Cases & Malformed Inputs', () => {
    it('should reject completely bogus non-JWT token string (HTTP 401)', async () => {
      await assert.rejects(
        () => authService.refreshToken('not_a_valid_jwt_token_string'),
        (err: any) => {
          assert.ok(err instanceof UnauthorizedException);
          assert.strictEqual(err.message, 'Invalid or expired refresh token');
          return true;
        },
      );
    });

    it('should reject access token presented to refresh endpoint (HTTP 401)', async () => {
      const { accessToken } = mintTokens(testUser, 'dev_pixel_9');

      await assert.rejects(
        () => authService.refreshToken(accessToken, 'dev_pixel_9'),
        (err: any) => {
          assert.ok(err instanceof UnauthorizedException);
          assert.strictEqual(err.message, 'Invalid token type');
          return true;
        },
      );
    });

    it('should reject token signed with invalid / different HMAC secret (HTTP 401)', async () => {
      const forgedToken = jwt.sign(
        { userId: testUser.id, type: 'refresh', deviceId: 'dev_pixel_9' },
        'attacker-wrong-secret-key-1234567890',
        { algorithm: 'HS256' },
      );

      await assert.rejects(
        () => authService.refreshToken(forgedToken, 'dev_pixel_9'),
        (err: any) => {
          assert.ok(err instanceof UnauthorizedException);
          assert.strictEqual(err.message, 'Invalid or expired refresh token');
          return true;
        },
      );
    });

    it('should reject expired refresh token (HTTP 401)', async () => {
      const expiredToken = jwt.sign(
        { userId: testUser.id, type: 'refresh', deviceId: 'dev_pixel_9' },
        config.jwtSecret,
        { algorithm: 'HS256', expiresIn: '-1s' },
      );

      await assert.rejects(
        () => authService.refreshToken(expiredToken, 'dev_pixel_9'),
        (err: any) => {
          assert.ok(err instanceof UnauthorizedException);
          assert.strictEqual(err.message, 'Invalid or expired refresh token');
          return true;
        },
      );
    });
  });

  describe('4.4 Replay Attack / Reuse Detection Behavioral Analysis', () => {
    it('should analyze behavior when an already rotated token (RT1) is submitted again', async () => {
      const { refreshToken: rt1 } = mintTokens(testUser, 'dev_pixel_9');

      // 1st rotation: Legitimate user rotates RT1 -> RT2
      const rotated = await authService.refreshToken(rt1, 'dev_pixel_9');
      const rt2 = rotated.refreshToken;

      // 2nd submission: Attacker replays RT1
      let caughtError: any = null;
      try {
        await authService.refreshToken(rt1, 'dev_pixel_9');
      } catch (err) {
        caughtError = err;
      }

      assert.ok(caughtError, 'Replay attempt must be rejected');
      assert.ok(caughtError instanceof UnauthorizedException, 'Must be 401 Unauthorized');

      // Log empirical observation of replay defense mechanism:
      // Note whether it was intercepted by Redis blocklist or DB hash comparison
      const interceptedByRedis = caughtError.message === 'Refresh token has been revoked';
      const interceptedByDbReuse = caughtError.message.includes('Refresh token reuse detected');

      assert.ok(
        interceptedByRedis || interceptedByDbReuse,
        `Unexpected error message on replay: ${caughtError.message}`,
      );

      // CRITICAL SECURITY EMPIRICAL CHECK:
      // Under OAuth 2.0 RFC 6819 Section 5.2.2.3, when a previously rotated token is reused,
      // the authorization server SHOULD revoke the family of tokens / terminate the session.
      // Check whether the active device session in DB was deleted or left active:
      const sessionAfterReplay = mockDb.devices.get(`${testUser.id}:dev_pixel_9`);

      // Record this empirical finding:
      // If intercepted by Redis blocklist, the session in devices is NOT deleted.
      // If intercepted by DB reuse detection, the session IS deleted.
      console.log('REPLAY DEFENSE AUDIT FINDING:');
      console.log(`- Intercepted by Redis blocklist? ${interceptedByRedis}`);
      console.log(`- Intercepted by DB reuse check? ${interceptedByDbReuse}`);
      console.log(
        `- Active device session retained in DB after replay? ${sessionAfterReplay !== undefined}`,
      );
    });
  });

  describe('2.7 Extra Fields Stripping via ValidationPipe Transformation', () => {
    it('should strip unwhitelisted fields from SendOtpDto', async () => {
      const pipe = new ValidationPipe({ whitelist: true, transform: true });

      const maliciousPayload = {
        phone: '+919876543210',
        deviceId: 'dev_valid_id',
        role: 'SUPER_ADMIN',
        isAdmin: true,
        bypassAuth: true,
        extraCredit: 1000000,
      };

      const transformed = await pipe.transform(maliciousPayload, {
        type: 'body',
        metatype: SendOtpDto,
      });

      assert.strictEqual(transformed.phone, '+919876543210');
      assert.strictEqual(transformed.deviceId, 'dev_valid_id');
      assert.strictEqual((transformed as any).role, undefined, 'role field must be stripped');
      assert.strictEqual((transformed as any).isAdmin, undefined, 'isAdmin field must be stripped');
      assert.strictEqual(
        (transformed as any).bypassAuth,
        undefined,
        'bypassAuth field must be stripped',
      );
      assert.strictEqual(
        (transformed as any).extraCredit,
        undefined,
        'extraCredit field must be stripped',
      );
    });

    it('should strip unwhitelisted fields from VerifyOtpDto', async () => {
      const pipe = new ValidationPipe({ whitelist: true, transform: true });

      const maliciousPayload = {
        phone: '+919876543210',
        code: '123456',
        platform: 'ANDROID',
        injectedSql: 'DROP TABLE users;',
        roles: ['ADMIN'],
      };

      const transformed = await pipe.transform(maliciousPayload, {
        type: 'body',
        metatype: VerifyOtpDto,
      });

      assert.strictEqual(transformed.phone, '+919876543210');
      assert.strictEqual(transformed.code, '123456');
      assert.strictEqual(transformed.platform, 'ANDROID');
      assert.strictEqual(
        (transformed as any).injectedSql,
        undefined,
        'injectedSql must be stripped',
      );
      assert.strictEqual((transformed as any).roles, undefined, 'roles must be stripped');
    });

    it('should strip unwhitelisted fields from RefreshTokenDto', async () => {
      const pipe = new ValidationPipe({ whitelist: true, transform: true });

      const maliciousPayload = {
        refreshToken: 'valid-refresh-token-string',
        deviceId: 'dev_123',
        userId: 'injected_user_id',
        status: 'ACTIVE',
      };

      const transformed = await pipe.transform(maliciousPayload, {
        type: 'body',
        metatype: RefreshTokenDto,
      });

      assert.strictEqual(transformed.refreshToken, 'valid-refresh-token-string');
      assert.strictEqual(transformed.deviceId, 'dev_123');
      assert.strictEqual((transformed as any).userId, undefined, 'userId must be stripped');
      assert.strictEqual((transformed as any).status, undefined, 'status must be stripped');
    });
  });
});
