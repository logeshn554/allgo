import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import {
  BadRequestException,
  UnauthorizedException,
  ServiceUnavailableException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthService } from '../../apps/api/dist/auth/auth.service.js';
import { ConfigService } from '../../apps/api/dist/config/config.service.js';
import { LocalOtpDeliveryAdapter } from '../../apps/api/dist/auth/adapters/local-otp-delivery.adapter.js';
import { InMemoryRedisTestDouble, MockDatabaseService } from '../helpers/test-doubles.ts';

describe('Adversarial Challenger M1 Iteration 2 Stress Suite', () => {
  let authService: AuthService;
  let mockDb: MockDatabaseService;
  let mockRedis: InMemoryRedisTestDouble;
  let config: ConfigService;
  let otpAdapter: LocalOtpDeliveryAdapter;

  const testUser = {
    id: 'usr_challenger_999',
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

    mockDb.users.set(testUser.id, { ...testUser });
    mockDb.userRoles.set(testUser.id, new Set(['CUSTOMER']));

    authService = new AuthService(
      config,
      mockDb as any,
      mockRedis as any,
      otpAdapter
    );
  });

  function mintTokenPair(user: any, deviceId?: string) {
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
      { algorithm: 'HS256', expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        type: 'refresh',
        deviceId: deviceId || 'default_device',
        jti: crypto.randomUUID(),
      },
      config.jwtSecret,
      { algorithm: 'HS256', expiresIn: '30d' }
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

  describe('Adversarial Target 1: RFC 6819 Token Replay Revocation & Session Purge', () => {
    it('CHALLENGE 1.1: Replay of rotated token (Redis blocklist hit) MUST delete device session from DB', async () => {
      const { refreshToken: rt1 } = mintTokenPair(testUser, 'dev_pixel_9');

      // 1st rotation: rt1 -> rt2
      const rotated = await authService.refreshToken(rt1, 'dev_pixel_9');
      const rt2 = rotated.refreshToken;

      // Verify active session exists in DB with rt2 hash
      const sessionBeforeReplay = mockDb.devices.get(`${testUser.id}:dev_pixel_9`);
      assert.ok(sessionBeforeReplay, 'Device session must exist prior to replay');
      const rt2Hash = crypto.createHash('sha256').update(rt2).digest('hex');
      assert.strictEqual(sessionBeforeReplay.refresh_token_hash, rt2Hash);

      // 2nd submission (Replay attack with rt1)
      await assert.rejects(
        () => authService.refreshToken(rt1, 'dev_pixel_9'),
        (err: any) => {
          assert.ok(err instanceof UnauthorizedException, 'Must throw 401 UnauthorizedException');
          assert.strictEqual(err.getStatus(), 401);
          assert.strictEqual(
            err.message,
            'Refresh token reuse detected. Session terminated for security.'
          );
          return true;
        }
      );

      // EMPIRICAL VERIFICATION: Active device session MUST be deleted from devices table
      const sessionAfterReplay = mockDb.devices.get(`${testUser.id}:dev_pixel_9`);
      assert.strictEqual(
        sessionAfterReplay,
        undefined,
        'CRITICAL RFC 6819 VIOLATION: Device session was NOT deleted from DB on replay!'
      );
    });

    it('CHALLENGE 1.2: Replay of rotated token without deviceId in body MUST still purge device session based on JWT claim', async () => {
      const { refreshToken: rt1 } = mintTokenPair(testUser, 'dev_samsung_s24');

      // Rotate once
      await authService.refreshToken(rt1);

      // Replay without providing deviceId in body
      await assert.rejects(
        () => authService.refreshToken(rt1),
        (err: any) => {
          assert.ok(err instanceof UnauthorizedException);
          assert.strictEqual(
            err.message,
            'Refresh token reuse detected. Session terminated for security.'
          );
          return true;
        }
      );

      // Session must still be deleted
      const session = mockDb.devices.get(`${testUser.id}:dev_samsung_s24`);
      assert.strictEqual(session, undefined, 'Session for JWT deviceId must be purged even if body omitted deviceId');
    });

    it('CHALLENGE 1.3: Replay detection via DB hash mismatch (when Redis blocklist expired/evicted) MUST purge session', async () => {
      const { refreshToken: rt1 } = mintTokenPair(testUser, 'dev_laptop');

      // Rotate once
      const { refreshToken: rt2 } = await authService.refreshToken(rt1, 'dev_laptop');

      // Simulate Redis cache eviction: remove token from Redis blocklist
      await mockRedis.del(`token:revoked:${rt1}`);
      const redisCheck = await mockRedis.get(`token:revoked:${rt1}`);
      assert.strictEqual(redisCheck, null, 'Redis blocklist must be cleared for this scenario');

      // Submit old token rt1 again.
      // Redis won't catch it, but DB devices table will see hash mismatch!
      await assert.rejects(
        () => authService.refreshToken(rt1, 'dev_laptop'),
        (err: any) => {
          assert.ok(err instanceof UnauthorizedException);
          assert.strictEqual(
            err.message,
            'Refresh token reuse detected. Session terminated for security.'
          );
          return true;
        }
      );

      // EMPIRICAL VERIFICATION: DB session must be purged!
      const session = mockDb.devices.get(`${testUser.id}:dev_laptop`);
      assert.strictEqual(
        session,
        undefined,
        'DB-level reuse detection MUST purge device session even if Redis blocklist is cold'
      );

      // Also verify rt1 was re-added to Redis blocklist
      const reRevoked = await mockRedis.get(`token:revoked:${rt1}`);
      assert.strictEqual(reRevoked, 'REVOKED', 'Must re-blacklist token in Redis');
    });

    it('CHALLENGE 1.4: Replaying compromised token does NOT wipe other legitimate devices for the user', async () => {
      // User has 2 devices: Phone and Tablet
      const phonePair = mintTokenPair(testUser, 'dev_phone');
      const tabletPair = mintTokenPair(testUser, 'dev_tablet');

      // Rotate phone token
      await authService.refreshToken(phonePair.refreshToken, 'dev_phone');

      // Replay old phone token
      await assert.rejects(
        () => authService.refreshToken(phonePair.refreshToken, 'dev_phone'),
        UnauthorizedException
      );

      // Phone session must be deleted
      assert.strictEqual(mockDb.devices.get(`${testUser.id}:dev_phone`), undefined);

      // Tablet session MUST remain intact!
      const tabletSession = mockDb.devices.get(`${testUser.id}:dev_tablet`);
      assert.ok(tabletSession, 'Legitimate tablet session must NOT be wiped by phone token compromise');
      assert.strictEqual(tabletSession.refresh_token_hash, tabletPair.hash);
    });
  });

  describe('Adversarial Target 2: Infrastructure Outage Error Propagation (503 vs 401)', () => {
    it('CHALLENGE 2.1: PostgreSQL outage during refreshToken MUST return HTTP 503, NEVER masked as 401', async () => {
      const { refreshToken: rt } = mintTokenPair(testUser, 'dev_pixel_9');

      // Inject DB failure on query
      mockDb.query = async () => {
        throw new Error('FATAL: connection to PostgreSQL server lost (ECONNREFUSED 5432)');
      };

      await assert.rejects(
        () => authService.refreshToken(rt, 'dev_pixel_9'),
        (err: any) => {
          assert.ok(
            err instanceof ServiceUnavailableException,
            `Expected ServiceUnavailableException but got: ${err?.constructor?.name} (${err?.message})`
          );
          assert.strictEqual(err.getStatus(), 503, 'HTTP status must be 503');
          assert.ok(
            err.message.includes('service is unavailable'),
            `Unexpected error message: ${err.message}`
          );
          assert.ok(
            err.message.includes('FATAL: connection to PostgreSQL server lost'),
            'Should include upstream error details'
          );
          return true;
        }
      );
    });

    it('CHALLENGE 2.2: Redis outage during refreshToken MUST return HTTP 503, NEVER masked as 401', async () => {
      const { refreshToken: rt } = mintTokenPair(testUser, 'dev_pixel_9');

      // Inject Redis failure on get
      mockRedis.get = async () => {
        throw new Error('CLUSTERDOWN: Redis node is unreachable (ETIMEDOUT 6379)');
      };

      await assert.rejects(
        () => authService.refreshToken(rt, 'dev_pixel_9'),
        (err: any) => {
          assert.ok(
            err instanceof ServiceUnavailableException,
            `Expected ServiceUnavailableException but got: ${err?.constructor?.name}`
          );
          assert.strictEqual(err.getStatus(), 503, 'HTTP status must be 503');
          assert.ok(
            err.message.includes('CLUSTERDOWN: Redis node is unreachable'),
            `Expected Redis error details, got: ${err.message}`
          );
          return true;
        }
      );
    });

    it('CHALLENGE 2.3: Cryptographic JWT failure MUST still return HTTP 401 (Not masked as 503)', async () => {
      // Bogus token
      await assert.rejects(
        () => authService.refreshToken('forged.invalid.token'),
        (err: any) => {
          assert.ok(err instanceof UnauthorizedException);
          assert.strictEqual(err.getStatus(), 401);
          assert.strictEqual(err.message, 'Invalid or expired refresh token');
          return true;
        }
      );
    });

    it('CHALLENGE 2.4: Database outage during findUserById MUST return HTTP 503', async () => {
      mockDb.query = async () => {
        throw new Error('Connection pool exhausted');
      };

      await assert.rejects(
        () => authService.findUserById('usr_challenger_999'),
        (err: any) => {
          assert.ok(err instanceof ServiceUnavailableException);
          assert.strictEqual(err.getStatus(), 503);
          assert.ok(err.message.includes('Connection pool exhausted'));
          return true;
        }
      );
    });

    it('CHALLENGE 2.5: Database outage during findOrCreateUser MUST return HTTP 503', async () => {
      mockDb.query = async () => {
        throw new Error('PostgreSQL socket disconnected');
      };

      await assert.rejects(
        () => authService.findOrCreateUser('+919876543210'),
        (err: any) => {
          assert.ok(err instanceof ServiceUnavailableException);
          assert.strictEqual(err.getStatus(), 503);
          assert.ok(err.message.includes('PostgreSQL socket disconnected'));
          return true;
        }
      );
    });
  });

  describe('Adversarial Target 3: Device ID Authority & Body Mismatch Rejection', () => {
    it('CHALLENGE 3.1: Body deviceId mismatch against signed JWT claim MUST reject with HTTP 400', async () => {
      const { refreshToken: rt } = mintTokenPair(testUser, 'dev_pixel_9');

      // Attempt to refresh specifying a completely different deviceId in the request body
      await assert.rejects(
        () => authService.refreshToken(rt, 'dev_attacker_rogue_device'),
        (err: any) => {
          assert.ok(
            err instanceof BadRequestException,
            `Expected BadRequestException but got ${err?.constructor?.name}: ${err?.message}`
          );
          assert.strictEqual(err.getStatus(), 400);
          assert.strictEqual(err.message, 'Device ID mismatch');
          return true;
        }
      );
    });

    it('CHALLENGE 3.2: Tampering body deviceId to match another user device session MUST fail with 400', async () => {
      // User has dev1 and dev2
      mintTokenPair(testUser, 'dev_legit_1');
      const { refreshToken: rt2 } = mintTokenPair(testUser, 'dev_legit_2');

      // Present token for dev2 but claim to be dev1
      await assert.rejects(
        () => authService.refreshToken(rt2, 'dev_legit_1'),
        (err: any) => {
          assert.ok(err instanceof BadRequestException);
          assert.strictEqual(err.getStatus(), 400);
          assert.strictEqual(err.message, 'Device ID mismatch');
          return true;
        }
      );
    });

    it('CHALLENGE 3.3: Missing body deviceId uses JWT deviceId and succeeds', async () => {
      const { refreshToken: rt } = mintTokenPair(testUser, 'dev_authorized');

      const rotated = await authService.refreshToken(rt);
      assert.ok(rotated.accessToken);

      const decodedAccess: any = jwt.decode(rotated.accessToken);
      assert.strictEqual(decodedAccess.deviceId, 'dev_authorized', 'Issued token must retain authoritative deviceId');

      const decodedRefresh: any = jwt.decode(rotated.refreshToken);
      assert.strictEqual(decodedRefresh.deviceId, 'dev_authorized');
    });

    it('CHALLENGE 3.4: Matching body deviceId succeeds without error', async () => {
      const { refreshToken: rt } = mintTokenPair(testUser, 'dev_exact_match');

      const rotated = await authService.refreshToken(rt, 'dev_exact_match');
      assert.ok(rotated.accessToken);
      assert.ok(rotated.refreshToken);
    });
  });

  describe('Adversarial Target 4: Multi-Role Revocation & Account Status Invariants', () => {
    it('CHALLENGE 4.1: Blocked account in Redis rejects immediately with 403 Forbidden', async () => {
      const { refreshToken: rt } = mintTokenPair(testUser, 'dev_pixel_9');
      await mockRedis.set(`user:status:${testUser.id}`, 'BLOCKED');

      await assert.rejects(
        () => authService.refreshToken(rt, 'dev_pixel_9'),
        (err: any) => {
          assert.ok(err instanceof ForbiddenException);
          assert.strictEqual(err.getStatus(), 403);
          assert.strictEqual(err.message, 'Account is blocked');
          return true;
        }
      );
    });

    it('CHALLENGE 4.2: Suspended account in DB rejects with 403 Forbidden', async () => {
      const { refreshToken: rt } = mintTokenPair(testUser, 'dev_pixel_9');
      mockDb.users.get(testUser.id).status = 'SUSPENDED';

      await assert.rejects(
        () => authService.refreshToken(rt, 'dev_pixel_9'),
        (err: any) => {
          assert.ok(err instanceof ForbiddenException);
          assert.strictEqual(err.getStatus(), 403);
          assert.strictEqual(err.message, 'Account is suspended');
          return true;
        }
      );
    });

    it('CHALLENGE 4.3: Deleted user in DB throws 401 Unauthorized', async () => {
      const { refreshToken: rt } = mintTokenPair(testUser, 'dev_pixel_9');
      mockDb.users.delete(testUser.id);

      await assert.rejects(
        () => authService.refreshToken(rt, 'dev_pixel_9'),
        (err: any) => {
          assert.ok(err instanceof UnauthorizedException);
          assert.strictEqual(err.getStatus(), 401);
          assert.strictEqual(err.message, 'User not found');
          return true;
        }
      );
    });
  });

  describe('Adversarial Target 5: Cryptographic Invariants & Tamper Resistance', () => {
    it('CHALLENGE 5.1: Algorithm confusion: Reject token with alg=none (HTTP 401)', async () => {
      // Create token header with alg: 'none'
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(
        JSON.stringify({ userId: testUser.id, type: 'refresh', deviceId: 'dev_pixel_9' })
      ).toString('base64url');
      const forgedNoneToken = `${header}.${payload}.`;

      await assert.rejects(
        () => authService.refreshToken(forgedNoneToken, 'dev_pixel_9'),
        (err: any) => {
          assert.ok(err instanceof UnauthorizedException);
          assert.strictEqual(err.getStatus(), 401);
          assert.strictEqual(err.message, 'Invalid or expired refresh token');
          return true;
        }
      );
    });

    it('CHALLENGE 5.2: Token type tampering: Reject refresh token with type=access or casing variations (HTTP 401)', async () => {
      const accessClaimToken = jwt.sign(
        { userId: testUser.id, type: 'access', deviceId: 'dev_pixel_9' },
        config.jwtSecret,
        { algorithm: 'HS256' }
      );
      const upperCaseToken = jwt.sign(
        { userId: testUser.id, type: 'REFRESH', deviceId: 'dev_pixel_9' },
        config.jwtSecret,
        { algorithm: 'HS256' }
      );

      await assert.rejects(
        () => authService.refreshToken(accessClaimToken, 'dev_pixel_9'),
        (err: any) => {
          assert.ok(err instanceof UnauthorizedException);
          assert.strictEqual(err.getStatus(), 401);
          assert.strictEqual(err.message, 'Invalid token type');
          return true;
        }
      );

      await assert.rejects(
        () => authService.refreshToken(upperCaseToken, 'dev_pixel_9'),
        (err: any) => {
          assert.ok(err instanceof UnauthorizedException);
          assert.strictEqual(err.getStatus(), 401);
          assert.strictEqual(err.message, 'Invalid token type');
          return true;
        }
      );
    });

    it('CHALLENGE 5.3: Mid-flow DB failure during SELECT refresh_token_hash bubbles as HTTP 503', async () => {
      const { refreshToken: rt } = mintTokenPair(testUser, 'dev_pixel_9');

      const originalQuery = mockDb.query.bind(mockDb);
      mockDb.query = async (text: string, params: any[] = []) => {
        if (text.includes('SELECT refresh_token_hash FROM devices')) {
          throw new Error('Deadlock detected in devices table');
        }
        return originalQuery(text, params);
      };

      await assert.rejects(
        () => authService.refreshToken(rt, 'dev_pixel_9'),
        (err: any) => {
          assert.ok(err instanceof ServiceUnavailableException);
          assert.strictEqual(err.getStatus(), 503);
          assert.ok(err.message.includes('Deadlock detected in devices table'));
          return true;
        }
      );
    });

    it('CHALLENGE 5.4: Concurrent replay race condition terminates session safely', async () => {
      const { refreshToken: rt1 } = mintTokenPair(testUser, 'dev_pixel_9');

      // First rotation
      await authService.refreshToken(rt1, 'dev_pixel_9');

      // Concurrent replay storm: 10 concurrent requests replaying rt1
      const promises = Array.from({ length: 10 }, () =>
        authService
          .refreshToken(rt1, 'dev_pixel_9')
          .then(() => 'RESOLVED')
          .catch((err) => ({ status: err.getStatus(), message: err.message }))
      );

      const results = await Promise.all(promises);

      // All 10 MUST fail with 401 Unauthorized
      for (const res of results) {
        assert.notStrictEqual(res, 'RESOLVED', 'Replay must NEVER succeed');
        assert.strictEqual((res as any).status, 401);
        assert.strictEqual((res as any).message, 'Refresh token reuse detected. Session terminated for security.');
      }

      // Session must be completely deleted
      assert.strictEqual(mockDb.devices.get(`${testUser.id}:dev_pixel_9`), undefined);
    });
  });
});
