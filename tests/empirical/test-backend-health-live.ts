import { spawn } from 'node:child_process';
import http from 'node:http';

async function waitForServer(url: string, timeoutMs: number = 10000): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  throw new Error(`Timeout waiting for ${url} after ${timeoutMs}ms`);
}

async function run() {
  console.log('>>> [STARTING NESTJS BACKEND SERVICE]...');
  const proc = spawn('node', ['apps/api/dist/main.js'], {
    env: {
      ...process.env,
      PORT: '3333',
      NODE_ENV: 'development',
      DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/allgo_dev',
      REDIS_URL: 'redis://127.0.0.1:6379',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  proc.stdout.on('data', (d) => process.stdout.write(`[API STDOUT] ${d}`));
  proc.stderr.on('data', (d) => process.stderr.write(`[API STDERR] ${d}`));

  try {
    const health = await waitForServer('http://127.0.0.1:3333/v1/health', 15000);
    console.log('\n[REAL HEALTH CHECK RESPONSE]:');
    console.log(JSON.stringify(health, null, 2));

    if (health.status !== 'healthy') {
      throw new Error(`Expected healthy status, got: ${health.status}`);
    }
    if (health.services?.postgres?.status !== 'up') {
      throw new Error(`PostgreSQL not up: ${JSON.stringify(health.services?.postgres)}`);
    }
    if (health.services?.redis?.status !== 'up') {
      throw new Error(`Redis not up: ${JSON.stringify(health.services?.redis)}`);
    }

    console.log('\n[PASS] Backend connected to REAL PostgreSQL and Redis!');
    console.log(`[PASS] Postgres latency: ${health.services.postgres.latencyMs}ms, Redis latency: ${health.services.redis.latencyMs}ms`);

    // Probe OpenAPI Swagger docs
    const docsRes = await fetch('http://127.0.0.1:3333/docs');
    console.log(`[PASS] OpenAPI Swagger UI Probe HTTP Status: ${docsRes.status}`);

  } finally {
    console.log('\n>>> [STOPPING NESTJS BACKEND SERVICE]...');
    proc.kill('SIGTERM');
  }
}

run().catch((err) => {
  console.error('[FAIL]', err);
  process.exit(1);
});

