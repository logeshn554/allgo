import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../services/api/dist/app.module.js';

async function testLiveHealth() {
  console.log('>>> [BOOTSTRAPPING NESTJS APPLICATION IN-PROCESS WITH REAL PG & REDIS]...');

  const app = await NestFactory.create(AppModule);
  await app.listen(3002);
  console.log('>>> [NESTJS LISTENING ON PORT 3002]');

  try {
    const res = await fetch('http://127.0.0.1:3002/v1/health');
    console.log(`>>> [HEALTH ENDPOINT HTTP STATUS]: ${res.status}`);

    const healthData = await res.json();
    console.log('>>> [HEALTH ENDPOINT PAYLOAD]:\n', JSON.stringify(healthData, null, 2));

    if (res.status !== 200) {
      throw new Error(`Expected HTTP 200, got ${res.status}`);
    }
    if (healthData.status !== 'healthy') {
      throw new Error(`Expected healthy status, got ${healthData.status}`);
    }
    if (healthData.services?.postgres?.status !== 'up') {
      throw new Error(`PostgreSQL is not up: ${JSON.stringify(healthData.services?.postgres)}`);
    }
    if (healthData.services?.redis?.status !== 'up') {
      throw new Error(`Redis is not up: ${JSON.stringify(healthData.services?.redis)}`);
    }

    console.log(
      '\n[PASS] Backend successfully bootstrapped and connected to live PostgreSQL and Redis!',
    );
    console.log(`[PASS] Postgres latency: ${healthData.services.postgres.latencyMs}ms`);
    console.log(`[PASS] Redis latency: ${healthData.services.redis.latencyMs}ms`);
    console.log(`[PASS] Environment: ${healthData.environment}`);
    console.log(`[PASS] Uptime: ${healthData.uptimeSeconds}s`);
  } finally {
    await app.close();
    console.log('>>> [NESTJS APPLICATION CLOSED CLEANLY]');
  }
}

testLiveHealth().catch((err) => {
  console.error('[FAIL]', err);
  process.exit(1);
});
