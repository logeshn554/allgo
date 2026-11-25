import assert from 'node:assert';
import { Redis } from 'ioredis';

async function main() {
  const client = new Redis('redis://127.0.0.1:6379');
  console.log('[CONNECTED] Connected to live Redis 7.0 on 127.0.0.1:6379');

  const testPrefix = 'allgo:test:verify:';

  // 1. Basic Ping
  const ping = await client.ping();
  console.log('Redis PING response:', ping);
  assert.strictEqual(ping, 'PONG');

  // 2. OTP Expiration Behavior
  const otpKey = `${testPrefix}otp:usr_123`;
  await client.set(otpKey, 'SAMPLE_HASHED_VAL', 'EX', 2);
  const ttl = await client.ttl(otpKey);
  console.log('OTP TTL set to:', ttl, 'seconds');
  assert.ok(ttl > 0 && ttl <= 2);

  // 3. Distributed Lock Acquisition (NX = true, EX = 5)
  const lockKey = `${testPrefix}lock:order_456`;
  const lockAcquired = await client.set(lockKey, 'worker_1', 'EX', 5, 'NX');
  console.log('First lock acquisition result:', lockAcquired);
  assert.strictEqual(lockAcquired, 'OK');

  // Second worker attempts lock acquisition (must fail)
  const lockConflict = await client.set(lockKey, 'worker_2', 'EX', 5, 'NX');
  console.log('Second lock acquisition attempt (conflict):', lockConflict);
  assert.strictEqual(lockConflict, null, 'Concurrent lock acquisition must return null');

  // 4. Idempotency Key Handling
  const idemKey = `${testPrefix}idem:req_789`;
  const setFirst = await client.set(
    idemKey,
    JSON.stringify({ status: 'PROCESSED' }),
    'EX',
    60,
    'NX',
  );
  assert.strictEqual(setFirst, 'OK');
  const getCached = await client.get(idemKey);
  assert.strictEqual(JSON.parse(getCached!).status, 'PROCESSED');

  // Clean up test keys
  await client.del(otpKey, lockKey, idemKey);
  console.log('Cleaned up test keys.');

  await client.quit();
  console.log('\n[ALL LIVE REDIS VERIFICATION CHECKS PASSED]');
}

main().catch((err) => {
  console.error('[REDIS VERIFICATION FAILED]', err);
  process.exit(1);
});
