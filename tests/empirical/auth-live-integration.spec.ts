import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import { ConfigService } from '../../apps/api/dist/config/config.service.js';
import { DatabaseService } from '../../apps/api/dist/database/database.service.js';
import { RedisService } from '../../apps/api/dist/redis/redis.service.js';
import { LocalOtpDeliveryAdapter } from '../../apps/api/dist/auth/adapters/local-otp-delivery.adapter.js';
import { AuthService } from '../../apps/api/dist/auth/auth.service.js';

describe('Phase 1 Real Infrastructure Authentication Integration Suite (Live PostgreSQL & Live Redis)', () => {
  let config: ConfigService;
  let db: DatabaseService;
  let redis: RedisService;
  let otpAdapter: LocalOtpDeliveryAdapter;
  let authService: AuthService;
  let isLiveAvailable = false;

  before(async () => {
    config = new ConfigService();
    db = new DatabaseService(config);
    redis = new RedisService(config);

    await db.onModuleInit();
    await redis.onModuleInit();

    otpAdapter = new LocalOtpDeliveryAdapter(config);
    authService = new AuthService(config, db, redis, otpAdapter);

    if (redis.isLive) {
      try {
        await db.query('SELECT 1;');
        isLiveAvailable = true;
      } catch {
        isLiveAvailable = false;
      }
    }

    if (isLiveAvailable) {
      // Clean up test phone records and rate limit keys from live DB/Redis
      for (let i = 1; i <= 10; i++) {
        const p = `+91987651000${i}`;
        await redis.del(`otp:cooldown:${p}`);
        await redis.del(`otp:challenge:${p}`);
        await redis.del(`otp:rate:phone:${p}`);
        await redis.del(`otp:rate:ip:10.0.1.${i}`);
      }
    }
  });

  after(async () => {
    await redis.onModuleDestroy();
    await db.onModuleDestroy();
  });

  it('[LIVE INTEGRATION] 1. Should generate cryptographically secure OTP and verify against live Redis & PostgreSQL', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandboxed environment');
      return;
    }
    const phone = '+919876510001';
    const ip = '10.0.1.1';
    const sendRes = await authService.sendOtp({ phone }, ip);
    assert.strictEqual(sendRes.status, 'OTP_SENT');
    assert.strictEqual(sendRes.cooldownSeconds, 60);

    const issuedOtp = otpAdapter.getLastIssuedOtpForDevTesting(phone);
    assert.ok(issuedOtp, 'OTP must be captured by local test adapter');
    assert.match(issuedOtp!, /^\d{6}$/);

    // Verify OTP against real Redis and create user in real PostgreSQL
    const authRes = await authService.verifyOtp({ phone, code: issuedOtp! });
    assert.ok(authRes.accessToken);
    assert.ok(authRes.refreshToken);
    assert.strictEqual(authRes.user.phone, phone);
    assert.strictEqual(authRes.user.status, 'ACTIVE');

    // Verify user persisted in real PostgreSQL
    const userInDb = await db.query('SELECT * FROM users WHERE phone = $1;', [phone]);
    assert.strictEqual(userInDb.rows.length, 1);
    assert.strictEqual(userInDb.rows[0].phone, phone);

    // Verify challenge in Redis was atomically consumed/deleted
    const challengeExists = await redis.exists(`otp:challenge:${phone}`);
    assert.strictEqual(challengeExists, 0, 'Challenge key must be deleted upon successful verification');
  });

  it('[LIVE INTEGRATION] 2. Should enforce 60s resend cooldown in real Redis', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandboxed environment');
      return;
    }
    const phone = '+919876510002';
    const ip = '10.0.1.2';
    await authService.sendOtp({ phone }, ip);

    // Immediate second send must be rejected by Redis cooldown check
    await assert.rejects(
      async () => authService.sendOtp({ phone }, ip),
      /wait 60 seconds before requesting another OTP/i
    );

    // Verify cooldown key in real Redis
    const ttl = await redis.ttl(`otp:cooldown:${phone}`);
    assert.ok(ttl > 0 && ttl <= 60, `Cooldown TTL should be <= 60s, got ${ttl}`);
  });

  it('[LIVE INTEGRATION] 3. Should enforce attempt limits and lock out challenge after 3 failed attempts in real Redis', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandboxed environment');
      return;
    }
    const phone = '+919876510003';
    const ip = '10.0.1.3';
    await authService.sendOtp({ phone }, ip);
    const realOtp = otpAdapter.getLastIssuedOtpForDevTesting(phone)!;

    // Attempt 1: Invalid
    await assert.rejects(async () => authService.verifyOtp({ phone, code: '000000' }), /Invalid OTP code/i);

    // Attempt 2: Invalid
    await assert.rejects(async () => authService.verifyOtp({ phone, code: '111111' }), /Invalid OTP code/i);

    // Attempt 3: Invalid (triggers lockout in Redis Lua)
    await assert.rejects(async () => authService.verifyOtp({ phone, code: '222222' }), /Maximum verification attempts exceeded/i);

    // Attempt 4: Even with correct code, Redis challenge is destroyed
    await assert.rejects(
      async () => authService.verifyOtp({ phone, code: realOtp }),
      /OTP has expired or has already been used/i
    );
  });

  it('[LIVE INTEGRATION] 4. Should enforce atomicity under concurrent verification in real Redis', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandboxed environment');
      return;
    }
    const phone = '+919876510004';
    const ip = '10.0.1.4';
    await authService.sendOtp({ phone }, ip);
    const realOtp = otpAdapter.getLastIssuedOtpForDevTesting(phone)!;

    // Launch 5 concurrent verification calls simultaneously against real Redis
    const promises = [
      authService.verifyOtp({ phone, code: realOtp }).catch((e) => e),
      authService.verifyOtp({ phone, code: realOtp }).catch((e) => e),
      authService.verifyOtp({ phone, code: realOtp }).catch((e) => e),
      authService.verifyOtp({ phone, code: realOtp }).catch((e) => e),
      authService.verifyOtp({ phone, code: realOtp }).catch((e) => e),
    ];

    const results = await Promise.all(promises);
    const successes = results.filter((r) => r && r.accessToken);
    const failures = results.filter((r) => r instanceof Error);

    assert.strictEqual(successes.length, 1, 'Exactly 1 concurrent request must succeed via Redis EVAL atomicity');
    assert.strictEqual(failures.length, 4, '4 concurrent requests must fail due to atomic consumption');
  });

  it('[LIVE INTEGRATION] 5. Should rotate refresh token and record device session in real PostgreSQL & Redis', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandboxed environment');
      return;
    }
    const phone = '+919876510005';
    const ip = '10.0.1.5';
    await authService.sendOtp({ phone }, ip);
    const otp = otpAdapter.getLastIssuedOtpForDevTesting(phone)!;
    const initialSession = await authService.verifyOtp({ phone, code: otp, deviceId: 'dev_test_005' });

    // Rotate refresh token
    const rotatedSession = await authService.refreshToken(initialSession.refreshToken, 'dev_test_005');
    assert.ok(rotatedSession.accessToken);
    assert.ok(rotatedSession.refreshToken);
    assert.notStrictEqual(rotatedSession.refreshToken, initialSession.refreshToken);

    // Verify old refresh token is marked revoked in real Redis
    const isRevoked = await redis.get(`token:revoked:${initialSession.refreshToken}`);
    assert.strictEqual(isRevoked, 'REVOKED');

    // Verify new refresh token hash is in real PostgreSQL devices table
    const devRes = await db.query('SELECT * FROM devices WHERE user_id = $1 AND device_id = $2;', [
      initialSession.user.id,
      'dev_test_005',
    ]);
    assert.strictEqual(devRes.rows.length, 1);
  });

  it('[LIVE INTEGRATION] 6. Should detect refresh token reuse and terminate session per RFC 6819', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandboxed environment');
      return;
    }
    const phone = '+919876510006';
    const ip = '10.0.1.6';
    await authService.sendOtp({ phone }, ip);
    const otp = otpAdapter.getLastIssuedOtpForDevTesting(phone)!;
    const initialSession = await authService.verifyOtp({ phone, code: otp, deviceId: 'dev_test_006' });

    // Legitimate rotation
    await authService.refreshToken(initialSession.refreshToken, 'dev_test_006');

    // Malicious or accidental reuse of initial rotated refresh token
    await assert.rejects(
      async () => authService.refreshToken(initialSession.refreshToken, 'dev_test_006'),
      /Refresh token reuse detected\. Session terminated for security\./i
    );

    // Device session must be deleted from PostgreSQL
    const devRes = await db.query('SELECT * FROM devices WHERE user_id = $1 AND device_id = $2;', [
      initialSession.user.id,
      'dev_test_006',
    ]);
    assert.strictEqual(devRes.rows.length, 0, 'Device session must be wiped upon reuse detection');
  });

  it('[LIVE INTEGRATION] 7. Should logout and revoke session in real Redis & PostgreSQL', async (t: any) => {
    if (!isLiveAvailable) {
      t.skip('Live PostgreSQL & Redis socket unreachable in sandboxed environment');
      return;
    }
    const phone = '+919876510007';
    const ip = '10.0.1.7';
    await authService.sendOtp({ phone }, ip);
    const otp = otpAdapter.getLastIssuedOtpForDevTesting(phone)!;
    const session = await authService.verifyOtp({ phone, code: otp, deviceId: 'dev_test_007' });

    const logoutRes = await authService.logout(session.accessToken, session.user.id, 'dev_test_007');
    assert.strictEqual(logoutRes.success, true);

    // Access token revoked in Redis
    const isRevoked = await redis.get(`token:revoked:${session.accessToken}`);
    assert.strictEqual(isRevoked, 'REVOKED');

    // Device session deleted from PostgreSQL
    const devRes = await db.query('SELECT * FROM devices WHERE user_id = $1 AND device_id = $2;', [
      session.user.id,
      'dev_test_007',
    ]);
    assert.strictEqual(devRes.rows.length, 0);
  });

  it('[LIVE INTEGRATION] 8. Should fail-closed if Redis becomes disconnected', async () => {
    // Create an auth service with a disconnected Redis client
    const disconnectedRedis = new RedisService(config);
    // Not calling onModuleInit() ensures client is disconnected
    const failClosedAuth = new AuthService(config, db, disconnectedRedis, otpAdapter);

    await assert.rejects(
      async () => failClosedAuth.sendOtp({ phone: '+919876510008' }, '10.0.1.8'),
      /Redis cache service is unavailable/i
    );
  });
});
