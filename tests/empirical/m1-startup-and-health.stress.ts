import 'reflect-metadata';
import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { HttpStatus } from '@nestjs/common';
import { HealthController } from '../../apps/api/dist/health/health.controller.js';
import { HealthService } from '../../apps/api/dist/health/health.service.js';

function createMockResponse() {
  const mockRes = {
    statusCode: 0,
    body: null as any,
    status(code: number) {
      mockRes.statusCode = code;
      return mockRes;
    },
    json(data: any) {
      mockRes.body = data;
      return mockRes;
    },
  };
  return mockRes;
}

describe('M1 Empirical Stress Test: NestJS Production Build & Health Check', () => {
  describe('1. Production Build Artifacts Verification', () => {
    it('should verify compiled dist artifacts for @allgo/common', () => {
      const commonDist = path.resolve('packages/common/dist');
      assert.ok(fs.existsSync(commonDist), 'packages/common/dist must exist');
      assert.ok(fs.existsSync(path.join(commonDist, 'index.js')), 'index.js must exist');
      assert.ok(fs.existsSync(path.join(commonDist, 'index.d.ts')), 'index.d.ts must exist');
      assert.ok(fs.existsSync(path.join(commonDist, 'enums/vertical.enum.js')), 'vertical.enum.js must exist');
    });

    it('should verify compiled dist artifacts for apps/api', () => {
      const apiDist = path.resolve('apps/api/dist');
      assert.ok(fs.existsSync(apiDist), 'apps/api/dist must exist');
      assert.ok(fs.existsSync(path.join(apiDist, 'main.js')), 'main.js must exist');
      assert.ok(fs.existsSync(path.join(apiDist, 'app.module.js')), 'app.module.js must exist');
      assert.ok(fs.existsSync(path.join(apiDist, 'auth/auth.service.js')), 'auth.service.js must exist');
      assert.ok(fs.existsSync(path.join(apiDist, 'health/health.service.js')), 'health.service.js must exist');
    });
  });

  describe('3. Health Check HTTP Status & Dependency State Mapping', () => {
    it('3.1 should return HTTP 503 when both Postgres and Redis are down', async () => {
      const mockDb = {
        checkConnection: async () => ({
          connected: false,
          latencyMs: 2,
          error: 'connect ECONNREFUSED 127.0.0.1:5432',
        }),
      };
      const mockRedis = {
        checkConnection: async () => ({
          connected: false,
          latencyMs: 0,
          error: 'Redis client not connected (daemon offline)',
        }),
      };

      const healthService = new HealthService(mockDb as any, mockRedis as any);
      const controller = new HealthController(healthService);

      const res = createMockResponse();
      await controller.getHealth(res as any);

      assert.strictEqual(res.statusCode, HttpStatus.SERVICE_UNAVAILABLE, 'HTTP status must be 503');
      assert.strictEqual(res.body.status, 'unhealthy', 'Report status must be unhealthy');
      assert.strictEqual(res.body.services.postgres.status, 'down');
      assert.strictEqual(res.body.services.redis.status, 'down');
      assert.ok(res.body.services.postgres.error.includes('ECONNREFUSED'));
      assert.ok(res.body.services.redis.error.includes('Redis client not connected'));
      assert.ok(typeof res.body.uptimeSeconds === 'number');
    });

    it('3.2 should return HTTP 503 when Postgres is down and Redis is up (degraded fails closed)', async () => {
      const mockDb = {
        checkConnection: async () => ({
          connected: false,
          latencyMs: 1,
          error: 'connect ECONNREFUSED 127.0.0.1:5432',
        }),
      };
      const mockRedis = {
        checkConnection: async () => ({
          connected: true,
          latencyMs: 1,
        }),
      };

      const healthService = new HealthService(mockDb as any, mockRedis as any);
      const controller = new HealthController(healthService);

      const res = createMockResponse();
      await controller.getHealth(res as any);

      assert.strictEqual(res.statusCode, HttpStatus.SERVICE_UNAVAILABLE, 'Degraded status must fail closed with 503');
      assert.strictEqual(res.body.status, 'degraded');
      assert.strictEqual(res.body.services.postgres.status, 'down');
      assert.strictEqual(res.body.services.redis.status, 'up');
    });

    it('3.3 should return HTTP 503 when Postgres is up and Redis is down (degraded fails closed)', async () => {
      const mockDb = {
        checkConnection: async () => ({
          connected: true,
          latencyMs: 1,
        }),
      };
      const mockRedis = {
        checkConnection: async () => ({
          connected: false,
          latencyMs: 0,
          error: 'Redis offline',
        }),
      };

      const healthService = new HealthService(mockDb as any, mockRedis as any);
      const controller = new HealthController(healthService);

      const res = createMockResponse();
      await controller.getHealth(res as any);

      assert.strictEqual(res.statusCode, HttpStatus.SERVICE_UNAVAILABLE, 'Degraded status must fail closed with 503');
      assert.strictEqual(res.body.status, 'degraded');
      assert.strictEqual(res.body.services.postgres.status, 'up');
      assert.strictEqual(res.body.services.redis.status, 'down');
    });

    it('3.4 should return HTTP 200 OK only when both Postgres and Redis are healthy', async () => {
      const mockDb = {
        checkConnection: async () => ({
          connected: true,
          latencyMs: 3,
        }),
      };
      const mockRedis = {
        checkConnection: async () => ({
          connected: true,
          latencyMs: 1,
        }),
      };

      const healthService = new HealthService(mockDb as any, mockRedis as any);
      const controller = new HealthController(healthService);

      const res = createMockResponse();
      await controller.getHealth(res as any);

      assert.strictEqual(res.statusCode, HttpStatus.OK, 'Healthy status must return 200 OK');
      assert.strictEqual(res.body.status, 'healthy');
      assert.strictEqual(res.body.services.postgres.status, 'up');
      assert.strictEqual(res.body.services.redis.status, 'up');
    });

    it('3.5 should survive 50 rapid concurrent calls without crashing or race conditions', async () => {
      const mockDb = {
        checkConnection: async () => ({
          connected: false,
          latencyMs: Math.floor(Math.random() * 5),
          error: 'connect ECONNREFUSED 127.0.0.1:5432',
        }),
      };
      const mockRedis = {
        checkConnection: async () => ({
          connected: false,
          latencyMs: 0,
          error: 'Redis offline',
        }),
      };

      const healthService = new HealthService(mockDb as any, mockRedis as any);
      const controller = new HealthController(healthService);

      const calls = Array.from({ length: 50 }, async () => {
        const res = createMockResponse();
        await controller.getHealth(res as any);
        return res;
      });

      const results = await Promise.all(calls);
      assert.strictEqual(results.length, 50);
      for (const res of results) {
        assert.strictEqual(res.statusCode, HttpStatus.SERVICE_UNAVAILABLE);
        assert.strictEqual(res.body.status, 'unhealthy');
        assert.strictEqual(res.body.services.postgres.status, 'down');
        assert.strictEqual(res.body.services.redis.status, 'down');
      }
    });
  });
});
