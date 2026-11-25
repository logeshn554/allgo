import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UnauthorizedException } from '@nestjs/common';
import { AuthManagerRepository } from '../../apps/api/dist/auth/data/auth-manager.repository.js';
import { TokenSessionService } from '../../apps/api/dist/auth/token-session.service.js';
import { OtpService } from '../../apps/api/dist/auth/otp.service.js';
import { AuthService } from '../../apps/api/dist/auth/auth.service.js';
import { AuthRepository } from '../../apps/api/dist/auth/data/auth.repository.js';
import { LocalOtpDeliveryAdapter } from '../../apps/api/dist/auth/adapters/local-otp-delivery.adapter.js';
import { JwtAuthGuard } from '../../apps/api/dist/common/guards/jwt-auth.guard.js';

function createInMemoryRedis() {
  const store = new Map<string, string>();
  const sets = new Map<string, Set<string>>();
  return {
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async setex(key: string, _ttl: number, value: string) {
      store.set(key, value);
      return 'OK';
    },
    async del(key: string) {
      const existed = store.delete(key) || sets.delete(key);
      return existed ? 1 : 0;
    },
    async sadd(key: string, ...members: string[]) {
      let s = sets.get(key);
      if (!s) {
        s = new Set();
        sets.set(key, s);
      }
      let added = 0;
      for (const m of members) {
        if (!s.has(m)) {
          s.add(m);
          added++;
        }
      }
      return added;
    },
    async srem(key: string, ...members: string[]) {
      const s = sets.get(key);
      if (!s) return 0;
      let removed = 0;
      for (const m of members) {
        if (s.delete(m)) removed++;
      }
      return removed;
    },
    async smembers(key: string) {
      const s = sets.get(key);
      return s ? Array.from(s) : [];
    },
    async expire(_key: string, _ttl: number) {
      return 1;
    },
  } as any;
}

function createOfflineDb() {
  return {
    async query() {
      throw new Error('Database offline in unit test');
    },
    async transaction() {
      throw new Error('Database offline in unit test');
    },
  } as any;
}

function createTestConfig() {
  return {
    nodeEnv: 'test',
    isDevelopment: true,
    isProduction: false,
    jwtSecret: 'test-jwt-secret-key-for-unit-tests-123456',
    jwtExpiresIn: '15m',
    jwtRefreshExpiresIn: '7d',
    otpPepper: 'test-otp-pepper-123456',
    otpTtlSeconds: 300,
    otpMaxAttempts: 5,
    otpResendCooldownSeconds: 60,
    port: 3000,
  } as any;
}

function makeHttpContext(headers: Record<string, string>) {
  const req: any = { headers, cookies: {} };
  return {
    req,
    ctx: {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as any,
  };
}

function buildHarness() {
  const config = createTestConfig();
  const db = createOfflineDb();
  const redis = createInMemoryRedis();
  const authRepo = new AuthRepository(db);
  const authManagerRepo = new AuthManagerRepository(db, config);
  const otpAdapter = new LocalOtpDeliveryAdapter();
  const otpService = new OtpService(config, redis, otpAdapter);
  const tokenSessionService = new TokenSessionService(
    config,
    redis,
    authRepo,
    otpService,
    authManagerRepo,
  );
  const authService = new AuthService(
    config,
    db,
    redis,
    otpAdapter,
    authRepo,
    otpService,
    tokenSessionService,
    authManagerRepo,
  );
  const guard = new JwtAuthGuard(config, redis, db);
  return { authService, authManagerRepo, tokenSessionService, guard, redis };
}

describe('Opaque HttpOnly Cookie Auth & Login Device Revocation', () => {
  const testUser = {
    id: 'user-admin-1',
    phone: '+919999999999',
    email: 'admin@allgo.in',
    fullName: 'Admin User',
    status: 'ACTIVE',
    roles: ['ADMIN'],
    defaultLanguage: 'en',
  };

  it('issues non-JWT opaque session cookie and authenticates via JwtAuthGuard', async () => {
    const { authService, guard } = buildHarness();

    const session = await authService.issueWebSession(testUser, {
      deviceId: 'web_browser_1',
      platform: 'WEB',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 Chrome/125.0',
      loginMethod: 'EMAIL_PASSWORD',
    });

    // Opaque token must NOT be a 3-part JWT
    assert.equal(session.sessionToken.split('.').length, 1);
    assert.ok(session.sessionToken.length >= 32);

    const { req, ctx } = makeHttpContext({
      cookie: `allgo_admin_token=${encodeURIComponent(session.sessionToken)}`,
    });
    const allowed = await guard.canActivate(ctx);
    assert.equal(allowed, true);
    assert.equal(req.user.userId, testUser.id);
    assert.equal(req.user.deviceId, 'web_browser_1');
    assert.equal(req.user.authType, 'cookie');
  });

  it('rejects revoked device cookie immediately while keeping other devices active', async () => {
    const { authService, guard } = buildHarness();

    const sess1 = await authService.issueWebSession(testUser, {
      deviceId: 'web_device_a',
      platform: 'WEB',
      ipAddress: '10.0.0.1',
      userAgent: 'Chrome/125.0',
      loginMethod: 'PASSWORD',
    });
    const sess2 = await authService.issueWebSession(testUser, {
      deviceId: 'web_device_b',
      platform: 'WEB',
      ipAddress: '10.0.0.2',
      userAgent: 'Firefox/126.0',
      loginMethod: 'EMAIL_OTP',
    });

    let devices = await authService.listSessions(testUser.id);
    assert.equal(devices.length, 2);

    // Revoke only device A
    await authService.revokeSession(testUser.id, 'web_device_a');

    // Cookie for device A must be rejected with UnauthorizedException
    const ctxA = makeHttpContext({
      cookie: `allgo_admin_token=${encodeURIComponent(sess1.sessionToken)}`,
    });
    await assert.rejects(() => guard.canActivate(ctxA.ctx), UnauthorizedException);

    // Cookie for device B must still work
    const ctxB = makeHttpContext({
      cookie: `allgo_admin_token=${encodeURIComponent(sess2.sessionToken)}`,
    });
    assert.equal(await guard.canActivate(ctxB.ctx), true);

    devices = await authService.listSessions(testUser.id);
    assert.equal(devices.length, 1);
    assert.equal(devices[0].deviceId, 'web_device_b');
  });

  it('rejects all cookies immediately on revokeAllSessions and allows fresh re-login', async () => {
    const { authService, guard } = buildHarness();

    const sess1 = await authService.issueWebSession(testUser, {
      deviceId: 'web_device_1',
      platform: 'WEB',
      loginMethod: 'PASSWORD',
    });
    const sess2 = await authService.issueWebSession(testUser, {
      deviceId: 'web_device_2',
      platform: 'WEB',
      loginMethod: 'OAUTH',
    });

    // Revoke all sessions
    await authService.revokeSession(testUser.id);

    const ctx1 = makeHttpContext({
      cookie: `allgo_admin_token=${encodeURIComponent(sess1.sessionToken)}`,
    });
    const ctx2 = makeHttpContext({
      cookie: `allgo_admin_token=${encodeURIComponent(sess2.sessionToken)}`,
    });
    await assert.rejects(() => guard.canActivate(ctx1.ctx), UnauthorizedException);
    await assert.rejects(() => guard.canActivate(ctx2.ctx), UnauthorizedException);
    assert.equal((await authService.listSessions(testUser.id)).length, 0);

    // Ensure an immediate same-millisecond re-login on the same deviceId succeeds while old cookie stays rejected
    const fresh = await authService.issueWebSession(testUser, {
      deviceId: 'web_device_1',
      platform: 'WEB',
      loginMethod: 'PASSWORD',
    });
    const ctxFresh = makeHttpContext({
      cookie: `allgo_admin_token=${encodeURIComponent(fresh.sessionToken)}`,
    });
    assert.equal(await guard.canActivate(ctxFresh.ctx), true);
    await assert.rejects(() => guard.canActivate(ctx1.ctx), UnauthorizedException);
  });

  it('rejects missing, malformed, and expired opaque cookies', async () => {
    const { guard, redis } = buildHarness();

    // Missing cookie
    const ctxEmpty = makeHttpContext({});
    await assert.rejects(() => guard.canActivate(ctxEmpty.ctx), UnauthorizedException);

    // Malformed / unknown cookie
    const ctxBad = makeHttpContext({ cookie: 'allgo_admin_token=not-a-real-session' });
    await assert.rejects(() => guard.canActivate(ctxBad.ctx), UnauthorizedException);

    // Expired session in Redis
    const crypto = await import('node:crypto');
    const expiredToken = 'expired-opaque-token-value-1234567890';
    const hash = crypto.createHash('sha256').update(expiredToken).digest('hex');
    await redis.setex(
      `web:session:${hash}`,
      60,
      JSON.stringify({
        userId: testUser.id,
        status: 'ACTIVE',
        roles: ['ADMIN'],
        deviceId: 'web_expired',
        issuedAt: Date.now() - 10_000,
        expiresAt: Date.now() - 1_000,
      }),
    );
    const ctxExpired = makeHttpContext({ cookie: `allgo_admin_token=${expiredToken}` });
    await assert.rejects(() => guard.canActivate(ctxExpired.ctx), UnauthorizedException);
  });

  it('filters expired sessions from listSessions and logout without deviceId does not wipe other devices', async () => {
    const { authService, authManagerRepo } = buildHarness();

    const sessA = await authService.issueWebSession(testUser, {
      deviceId: 'web_keep_1',
      platform: 'WEB',
      loginMethod: 'PASSWORD',
    });
    await authService.issueWebSession(testUser, {
      deviceId: 'web_keep_2',
      platform: 'WEB',
      loginMethod: 'EMAIL_OTP',
    });

    // Logout without deviceId must NOT delete other devices
    await authService.logout('', testUser.id, undefined, undefined, sessA.sessionToken);
    const remaining = await authService.listSessions(testUser.id);
    assert.equal(remaining.length, 2);

    // Expire web_keep_1 in-memory session hash and verify listSessions filters it
    const key = `${testUser.id}:web_keep_1`;
    (authManagerRepo as any).memSessionHashes.set(key, {
      sessionTokenHash: 'expired-hash',
      sessionExpiresAt: Date.now() - 1000,
    });
    const activeOnly = await authService.listSessions(testUser.id);
    assert.equal(activeOnly.length, 1);
    assert.equal(activeOnly[0].deviceId, 'web_keep_2');
  });
});
