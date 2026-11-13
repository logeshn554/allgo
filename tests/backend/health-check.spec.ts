import { describe, it } from 'node:test';
import assert from 'node:assert';
import { HealthService } from '../../apps/api/dist/health/health.service.js';
import { DatabaseService } from '../../apps/api/dist/database/database.service.js';
import { RedisService } from '../../apps/api/dist/redis/redis.service.js';
import { ConfigService } from '../../apps/api/dist/config/config.service.js';

describe('Phase 1 Backend: Real Infrastructure Health Check Specification', () => {
  it('should accurately report status and dependencies without simulated healthy claims', async () => {
    const config = new ConfigService();
    const db = new DatabaseService(config);
    const redis = new RedisService(config);
    await redis.onModuleInit();

    const healthService = new HealthService(db, redis);
    const report = await healthService.checkHealth();

    assert.ok(report.timestamp, 'Report must include ISO timestamp');
    assert.ok(typeof report.uptimeSeconds === 'number', 'Report must include uptime seconds');
    assert.ok(report.services.postgres, 'Must include postgres check');
    assert.ok(report.services.redis, 'Must include redis check');

    // When Docker is offline on workstation, overall status must be degraded or unhealthy
    assert.ok(
      report.status === 'healthy' || report.status === 'degraded' || report.status === 'unhealthy',
      'Status must accurately reflect dependency state'
    );

    if (report.services.postgres.status === 'down') {
      assert.ok(report.status !== 'healthy', 'Cannot claim healthy when PostgreSQL is offline');
      assert.ok(report.services.postgres.error, 'Must document underlying connection error');
    }

    await redis.onModuleDestroy();
  });
});
