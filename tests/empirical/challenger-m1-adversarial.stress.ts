import 'reflect-metadata';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { beforeEach, describe, it } from 'node:test';
import {
  BadRequestException,
  HttpStatus,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { AuthService } from '../../services/api/dist/auth/auth.service.js';
import { SendOtpDto } from '../../services/api/dist/auth/dto/send-otp.dto.js';
import { VerifyOtpDto } from '../../services/api/dist/auth/dto/verify-otp.dto.js';
import { ConfigService } from '../../services/api/dist/config/config.service.js';
import { HealthController } from '../../services/api/dist/health/health.controller.js';
import { HealthService } from '../../services/api/dist/health/health.service.js';

describe('Challenger M1 Adversarial Suite (Instance 2)', () => {
  let config: ConfigService;

  beforeEach(() => {
    config = new ConfigService();
  });

  describe('Target 1: RFC 6819 Token Replay Revocation & Session Deletion', () => {
    it('Scenario 1A: Replay intercepted by Redis revocation list MUST delete device session from DB', async () => {
      let deletedUserId = '';
      let deletedDeviceId = '';

      const testUser = { id: 'usr_adv_1', phone: '+919876543210', status: 'ACTIVE' };
      const targetDevice = 'device_pixel_8';
      const rt1 = jwt.sign(
        { userId: testUser.id, type: 'refresh', deviceId: targetDevice },
        config.jwtSecret,
        { algorithm: 'HS256', expiresIn: '7d' },
      );

      const mockRedis = {
        get: async (key: string) => {
          if (key === `token:revoked:${rt1}`) return 'REVOKED';
          return null;
        },
      };

      const mockDb = {
        query: async (sql: string, params: any[]) => {
          if (sql.includes('DELETE FROM devices')) {
            deletedUserId = params[0];
            deletedDeviceId = params[1];
            return { rowCount: 1, rows: [] };
          }
          return { rows: [] };
        },
      };

      const authService = new AuthService(config, mockDb as any, mockRedis as any, null);

      await assert.rejects(
        () => authService.refreshToken(rt1, targetDevice),
        (err: any) => {
          assert.ok(err instanceof UnauthorizedException, 'Must throw UnauthorizedException');
          assert.strictEqual(err.getStatus(), 401);
          assert.strictEqual(
            err.message,
            'Refresh token reuse detected. Session terminated for security.',
          );
          return true;
        },
      );

      // Verify that device session was deleted from DB
      assert.strictEqual(deletedUserId, testUser.id, 'Must delete matching user_id in DB');
      assert.strictEqual(deletedDeviceId, targetDevice, 'Must delete matching device_id in DB');
    });

    it('Scenario 1B: Replay intercepted by DB hash mismatch MUST delete device session and record revocation in Redis', async () => {
      let deletedUserId = '';
      let deletedDeviceId = '';
      let setexKey = '';
      let setexVal = '';

      const testUser = { id: 'usr_adv_2', phone: '+919876543210', status: 'ACTIVE' };
      const targetDevice = 'device_galaxy_s24';
      const oldRt = jwt.sign(
        { userId: testUser.id, type: 'refresh', deviceId: targetDevice },
        config.jwtSecret,
        { algorithm: 'HS256', expiresIn: '7d' },
      );

      // Redis has no entry (e.g. key expired or evicted)
      const mockRedis = {
        get: async () => null,
        setex: async (key: string, _ttl: number, val: string) => {
          setexKey = key;
          setexVal = val;
        },
      };

      // DB has a DIFFERENT hash (indicating rotation already took place)
      const newHash = crypto.createHash('sha256').update('brand_new_token').digest('hex');
      const mockDb = {
        query: async (sql: string, params: any[]) => {
          if (sql.includes('SELECT u.id')) {
            return {
              rows: [
                {
                  id: testUser.id,
                  phone: testUser.phone,
                  status: 'ACTIVE',
                  default_language: 'en',
                  roles: ['CUSTOMER'],
                },
              ],
            };
          }
          if (sql.includes('SELECT refresh_token_hash FROM devices')) {
            return { rows: [{ refresh_token_hash: newHash }] };
          }
          if (sql.includes('DELETE FROM devices')) {
            deletedUserId = params[0];
            deletedDeviceId = params[1];
            return { rowCount: 1, rows: [] };
          }
          return { rows: [] };
        },
      };

      const authService = new AuthService(config, mockDb as any, mockRedis as any, null);

      await assert.rejects(
        () => authService.refreshToken(oldRt, targetDevice),
        (err: any) => {
          assert.ok(err instanceof UnauthorizedException);
          assert.strictEqual(err.getStatus(), 401);
          assert.strictEqual(
            err.message,
            'Refresh token reuse detected. Session terminated for security.',
          );
          return true;
        },
      );

      assert.strictEqual(deletedUserId, testUser.id);
      assert.strictEqual(deletedDeviceId, targetDevice);
      assert.strictEqual(setexKey, `token:revoked:${oldRt}`);
      assert.strictEqual(setexVal, 'REVOKED');
    });
  });

  describe('Target 2: Database and Redis Outage Error Propagation (503 vs 401)', () => {
    it('Scenario 2A: DB connection error during user check MUST throw 503 ServiceUnavailable, NOT 401', async () => {
      const rt = jwt.sign({ userId: 'u1', type: 'refresh', deviceId: 'dev_1' }, config.jwtSecret, {
        algorithm: 'HS256',
      });

      const mockRedis = { get: async () => null };
      const mockDb = {
        query: async () => {
          throw new Error('connect ECONNREFUSED 127.0.0.1:5432');
        },
      };

      const authService = new AuthService(config, mockDb as any, mockRedis as any, null);

      await assert.rejects(
        () => authService.refreshToken(rt, 'dev_1'),
        (err: any) => {
          assert.ok(
            err instanceof ServiceUnavailableException,
            `Expected ServiceUnavailableException but got: ${err.constructor.name} (${err.message})`,
          );
          assert.strictEqual(err.getStatus(), 503);
          assert.ok(err.message.includes('ECONNREFUSED'));
          return true;
        },
      );
    });

    it('Scenario 2B: Redis connection drop during revocation check MUST throw 503 ServiceUnavailable, NOT 401', async () => {
      const rt = jwt.sign({ userId: 'u1', type: 'refresh', deviceId: 'dev_1' }, config.jwtSecret, {
        algorithm: 'HS256',
      });

      const mockRedis = {
        get: async () => {
          throw new Error('Redis connection lost: ETIMEDOUT');
        },
      };
      const mockDb = { query: async () => ({ rows: [] }) };

      const authService = new AuthService(config, mockDb as any, mockRedis as any, null);

      await assert.rejects(
        () => authService.refreshToken(rt, 'dev_1'),
        (err: any) => {
          assert.ok(err instanceof ServiceUnavailableException);
          assert.strictEqual(err.getStatus(), 503);
          assert.ok(err.message.includes('ETIMEDOUT'));
          return true;
        },
      );
    });

    it('Scenario 2C: Malformed or forged JWT MUST throw 401 Unauthorized, NOT 503', async () => {
      const badTokens = [
        'invalid.jwt.token',
        jwt.sign({ userId: 'u1' }, 'wrong_secret'),
        jwt.sign({ userId: 'u1', type: 'refresh' }, config.jwtSecret, { expiresIn: '-1s' }),
      ];

      const authService = new AuthService(config, {} as any, {} as any, null);

      for (const token of badTokens) {
        await assert.rejects(
          () => authService.refreshToken(token),
          (err: any) => {
            assert.ok(err instanceof UnauthorizedException);
            assert.strictEqual(err.getStatus(), 401);
            return true;
          },
        );
      }
    });
  });

  describe('Target 3: Device ID Authority & Body Mismatch Rejection', () => {
    it('Scenario 3A: Tampered body deviceId mismatching JWT claim MUST be rejected with HTTP 400', async () => {
      const rt = jwt.sign(
        { userId: 'u1', type: 'refresh', deviceId: 'authorized_phone_1' },
        config.jwtSecret,
        { algorithm: 'HS256' },
      );

      const authService = new AuthService(config, {} as any, {} as any, null);

      await assert.rejects(
        () => authService.refreshToken(rt, 'attacker_phone_2'),
        (err: any) => {
          assert.ok(err instanceof BadRequestException);
          assert.strictEqual(err.getStatus(), 400);
          assert.strictEqual(err.message, 'Device ID mismatch');
          return true;
        },
      );
    });

    it('Scenario 3B: Matching body deviceId MUST be accepted', async () => {
      const rt = jwt.sign(
        { userId: 'u1', type: 'refresh', deviceId: 'authorized_phone_1' },
        config.jwtSecret,
        { algorithm: 'HS256' },
      );

      const mockRedis = {
        get: async () => null,
        setex: async () => {},
      };

      const hash = crypto.createHash('sha256').update(rt).digest('hex');
      const mockDb = {
        query: async (sql: string) => {
          if (sql.includes('SELECT u.id')) {
            return {
              rows: [
                {
                  id: 'u1',
                  phone: '+919876543210',
                  status: 'ACTIVE',
                  default_language: 'en',
                  roles: ['CUSTOMER'],
                },
              ],
            };
          }
          if (sql.includes('SELECT refresh_token_hash FROM devices')) {
            return { rows: [{ refresh_token_hash: hash }] };
          }
          if (sql.includes('INSERT INTO devices')) {
            return { rowCount: 1 };
          }
          return { rows: [] };
        },
      };

      const authService = new AuthService(config, mockDb as any, mockRedis as any, null);
      const res = await authService.refreshToken(rt, 'authorized_phone_1');
      assert.ok(res.accessToken);
      assert.ok(res.refreshToken);
    });

    it('Scenario 3C: Omitted body deviceId MUST fallback to JWT claim deviceId', async () => {
      const rt = jwt.sign(
        { userId: 'u1', type: 'refresh', deviceId: 'token_claimed_device' },
        config.jwtSecret,
        { algorithm: 'HS256' },
      );

      let queriedDevice = '';
      const hash = crypto.createHash('sha256').update(rt).digest('hex');
      const mockRedis = {
        get: async () => null,
        setex: async () => {},
      };
      const mockDb = {
        query: async (sql: string, params: any[]) => {
          if (sql.includes('SELECT u.id')) {
            return {
              rows: [
                {
                  id: 'u1',
                  phone: '+919876543210',
                  status: 'ACTIVE',
                  default_language: 'en',
                  roles: ['CUSTOMER'],
                },
              ],
            };
          }
          if (sql.includes('SELECT refresh_token_hash FROM devices')) {
            queriedDevice = params[1];
            return { rows: [{ refresh_token_hash: hash }] };
          }
          if (sql.includes('INSERT INTO devices')) {
            return { rowCount: 1 };
          }
          return { rows: [] };
        },
      };

      const authService = new AuthService(config, mockDb as any, mockRedis as any, null);
      const res = await authService.refreshToken(rt); // deviceId omitted
      assert.ok(res.accessToken);
      assert.strictEqual(queriedDevice, 'token_claimed_device');
    });
  });

  describe('Target 4: ValidationPipe Prototype Pollution & Injection Defense', () => {
    it('Scenario 4A: Prototype pollution in SendOtpDto must be safely stripped', async () => {
      const pipe = new ValidationPipe({ whitelist: true, transform: true });

      const maliciousPayload = JSON.parse(
        '{"phone": "+919876543210", "__proto__": {"polluted": true}, "constructor": {"prototype": {"admin": true}}}',
      );

      const transformed = await pipe.transform(maliciousPayload, {
        type: 'body',
        metatype: SendOtpDto,
      });

      assert.strictEqual(transformed.phone, '+919876543210');
      assert.strictEqual((Object.prototype as any).polluted, undefined);
      assert.strictEqual((Object.prototype as any).admin, undefined);
    });

    it('Scenario 4B: Array of phone numbers must be rejected with 400', async () => {
      const pipe = new ValidationPipe({ whitelist: true, transform: true });
      await assert.rejects(
        () => pipe.transform({ phone: ['+919876543210'] }, { type: 'body', metatype: SendOtpDto }),
        (err: any) => err instanceof BadRequestException,
      );
    });

    it('Scenario 4C: VerifyOtpDto must reject non-numeric code injections', async () => {
      const pipe = new ValidationPipe({ whitelist: true, transform: true });
      const badCodes = ['12345', '1234567', 'abcdef', '12 345', '12-345', '<svg/onload=alert(1)>'];

      for (const code of badCodes) {
        await assert.rejects(
          () =>
            pipe.transform(
              { phone: '+919876543210', code },
              { type: 'body', metatype: VerifyOtpDto },
            ),
          (err: any) => err instanceof BadRequestException,
        );
      }
    });
  });

  describe('Target 5: Health Check Degraded & Unhealthy States', () => {
    function createMockResponse() {
      const res = {
        statusCode: 0,
        body: null as any,
        status(code: number) {
          res.statusCode = code;
          return res;
        },
        json(data: any) {
          res.body = data;
          return res;
        },
      };
      return res;
    }

    it('Scenario 5A: DB DOWN & Redis UP -> 503 degraded', async () => {
      const db = {
        checkConnection: async () => ({ connected: false, latencyMs: 1, error: 'DB down' }),
      };
      const redis = { checkConnection: async () => ({ connected: true, latencyMs: 1 }) };
      const service = new HealthService(db as any, redis as any);
      const controller = new HealthController(service);

      const res = createMockResponse();
      await controller.getHealth(res as any);

      assert.strictEqual(res.statusCode, HttpStatus.SERVICE_UNAVAILABLE);
      assert.strictEqual(res.body.status, 'degraded');
      assert.strictEqual(res.body.services.postgres.status, 'down');
      assert.strictEqual(res.body.services.redis.status, 'up');
    });

    it('Scenario 5B: DB UP & Redis DOWN -> 503 degraded', async () => {
      const db = { checkConnection: async () => ({ connected: true, latencyMs: 1 }) };
      const redis = {
        checkConnection: async () => ({ connected: false, latencyMs: 0, error: 'Redis down' }),
      };
      const service = new HealthService(db as any, redis as any);
      const controller = new HealthController(service);

      const res = createMockResponse();
      await controller.getHealth(res as any);

      assert.strictEqual(res.statusCode, HttpStatus.SERVICE_UNAVAILABLE);
      assert.strictEqual(res.body.status, 'degraded');
      assert.strictEqual(res.body.services.postgres.status, 'up');
      assert.strictEqual(res.body.services.redis.status, 'down');
    });

    it('Scenario 5C: DB DOWN & Redis DOWN -> 503 unhealthy', async () => {
      const db = {
        checkConnection: async () => ({ connected: false, latencyMs: 1, error: 'DB down' }),
      };
      const redis = {
        checkConnection: async () => ({ connected: false, latencyMs: 0, error: 'Redis down' }),
      };
      const service = new HealthService(db as any, redis as any);
      const controller = new HealthController(service);

      const res = createMockResponse();
      await controller.getHealth(res as any);

      assert.strictEqual(res.statusCode, HttpStatus.SERVICE_UNAVAILABLE);
      assert.strictEqual(res.body.status, 'unhealthy');
      assert.strictEqual(res.body.services.postgres.status, 'down');
      assert.strictEqual(res.body.services.redis.status, 'down');
    });

    it('Scenario 5D: DB UP & Redis UP -> 200 healthy', async () => {
      const db = { checkConnection: async () => ({ connected: true, latencyMs: 2 }) };
      const redis = { checkConnection: async () => ({ connected: true, latencyMs: 1 }) };
      const service = new HealthService(db as any, redis as any);
      const controller = new HealthController(service);

      const res = createMockResponse();
      await controller.getHealth(res as any);

      assert.strictEqual(res.statusCode, HttpStatus.OK);
      assert.strictEqual(res.body.status, 'healthy');
      assert.strictEqual(res.body.services.postgres.status, 'up');
      assert.strictEqual(res.body.services.redis.status, 'up');
    });
  });
});
