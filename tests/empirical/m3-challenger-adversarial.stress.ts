import 'reflect-metadata';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, it } from 'node:test';

import { LocalOtpDeliveryAdapter } from '../../services/api/dist/auth/adapters/local-otp-delivery.adapter.js';
import { AuthService } from '../../services/api/dist/auth/auth.service.js';
import { ConfigService } from '../../services/api/dist/config/config.service.js';
import { UsersService } from '../../services/api/dist/users/users.service.js';
import { InMemoryRedisTestDouble, MockDatabaseService } from '../helpers/test-doubles.ts';

const ROOT_DIR = path.resolve(import.meta.dirname, '../../');
const BASELINE_COMMIT = '5fe64927af3c97a37ae7b3da973761ec2ac54f91';

describe('Challenger M3-1 Adversarial Stress & Verification Suite', () => {
  let config: ConfigService;
  let redisDouble: InMemoryRedisTestDouble;
  let mockDb: MockDatabaseService;
  let otpAdapter: LocalOtpDeliveryAdapter;
  let authService: AuthService;
  let usersService: UsersService;

  beforeEach(() => {
    config = new ConfigService();
    redisDouble = new InMemoryRedisTestDouble();
    mockDb = new MockDatabaseService();
    otpAdapter = new LocalOtpDeliveryAdapter(config);
    authService = new AuthService(config, mockDb as any, redisDouble as any, otpAdapter);
    usersService = new UsersService(mockDb as any, redisDouble as any);
  });

  // =========================================================================
  // Target 1: Monorepo Test Doubles Behavioral & Cryptographic Integrity
  // =========================================================================
  describe('Target 1: Test Doubles Anti-Mocking & Cryptographic Integrity', () => {
    it('1A: InMemoryRedisTestDouble must enforce exact Lua atomic OTP consumption logic', async () => {
      const challengeKey = 'otp:challenge:+919876543210';
      const validHmac = crypto
        .createHmac('sha256', 'test_pepper')
        .update('+919876543210:123456')
        .digest('hex');
      const invalidHmac = crypto
        .createHmac('sha256', 'test_pepper')
        .update('+919876543210:000000')
        .digest('hex');

      await redisDouble.hset(challengeKey, 'hmac', validHmac);
      await redisDouble.hset(challengeKey, 'attempts', '0');

      // Attempt 1: Invalid HMAC -> must return 0 (mismatch) and increment attempts
      const res1 = await redisDouble.evalLuaOtpVerify(challengeKey, invalidHmac, 3);
      assert.strictEqual(res1, 0, 'Must return 0 on HMAC mismatch');
      const attemptsAfter1 = await redisDouble.hget(challengeKey, 'attempts');
      assert.strictEqual(attemptsAfter1, '1');

      // Attempt 2: Another Invalid HMAC -> attempts increment to 2
      const res2 = await redisDouble.evalLuaOtpVerify(challengeKey, invalidHmac, 3);
      assert.strictEqual(res2, 0);
      const attemptsAfter2 = await redisDouble.hget(challengeKey, 'attempts');
      assert.strictEqual(attemptsAfter2, '2');

      // Attempt 3: 3rd Invalid HMAC -> must return -2 (lockout) and delete challenge
      const res3 = await redisDouble.evalLuaOtpVerify(challengeKey, invalidHmac, 3);
      assert.strictEqual(res3, -2, 'Must return -2 when max attempts reached');
      const existsAfterLockout = await redisDouble.exists(challengeKey);
      assert.strictEqual(existsAfterLockout, 0, 'Key must be deleted upon lockout');

      // Attempt 4: Even presenting valid HMAC now must return -1 (challenge destroyed)
      const res4 = await redisDouble.evalLuaOtpVerify(challengeKey, validHmac, 3);
      assert.strictEqual(res4, -1, 'Must return -1 for destroyed challenge');
    });

    it('1B: InMemoryRedisTestDouble must atomically delete challenge upon successful verification (replay protection)', async () => {
      const challengeKey = 'otp:challenge:+919876543211';
      const validHmac = crypto
        .createHmac('sha256', 'test_pepper')
        .update('+919876543211:654321')
        .digest('hex');

      await redisDouble.hset(challengeKey, 'hmac', validHmac);
      await redisDouble.hset(challengeKey, 'attempts', '0');

      // Verify with valid HMAC
      const verifySuccess = await redisDouble.evalLuaOtpVerify(challengeKey, validHmac, 3);
      assert.strictEqual(verifySuccess, 1, 'Must return 1 on successful verification');

      // Immediate second attempt with same valid HMAC must fail (replay attack defense)
      const replayAttempt = await redisDouble.evalLuaOtpVerify(challengeKey, validHmac, 3);
      assert.strictEqual(replayAttempt, -1, 'Consumed challenge must return -1 on replay');

      const existsAfterVerify = await redisDouble.exists(challengeKey);
      assert.strictEqual(existsAfterVerify, 0, 'Key must be completely removed from store');
    });

    it('1C: AuthService under heavy concurrent verification must permit exactly 1 success', async () => {
      const phone = '+919999888877';
      await authService.sendOtp({ phone });
      const issuedOtp = otpAdapter.getLastIssuedOtpForDevTesting(phone)!;
      assert.ok(issuedOtp, 'OTP must be issued');

      // Fire 10 concurrent verification requests
      const promises = Array.from({ length: 10 }, () =>
        authService.verifyOtp({ phone, code: issuedOtp }).catch((err) => err),
      );

      const results = await Promise.all(promises);
      const successes = results.filter((r) => r && r.accessToken);
      const failures = results.filter((r) => r instanceof Error);

      assert.strictEqual(successes.length, 1, 'Exactly one concurrent verification must succeed');
      assert.strictEqual(failures.length, 9, 'All 9 remaining concurrent requests must fail');
    });

    it('1D: AuthService must strictly enforce cooldown and hourly rate limits', async () => {
      const phone = '+919123456780';
      const sendRes = await authService.sendOtp({ phone });
      assert.strictEqual(sendRes.status, 'OTP_SENT');
      assert.strictEqual(sendRes.cooldownSeconds, 60);

      // Immediate 2nd attempt during cooldown must fail
      await assert.rejects(async () => authService.sendOtp({ phone }), /wait 60 seconds/i);

      // Advance/clear cooldown key but keep rate count
      await redisDouble.del(`otp:cooldown:${phone}`);

      // Attempt 2 (valid)
      await authService.sendOtp({ phone });
      await redisDouble.del(`otp:cooldown:${phone}`);

      // Attempt 3 (valid)
      await authService.sendOtp({ phone });
      await redisDouble.del(`otp:cooldown:${phone}`);

      // Attempt 4 (>3 per hour) -> Must be rejected by hourly rate limit
      await assert.rejects(
        async () => authService.sendOtp({ phone }),
        /Too many OTP requests for this phone number/i,
      );
    });
  });

  // =========================================================================
  // Target 2: Host Tooling Verification (Flutter SDK Absence)
  // =========================================================================
  describe('Target 2: Host Tooling Verification (Flutter SDK Absence)', () => {
    it('2A: where.exe flutter must exit with code 1', () => {
      let exitCode = 0;
      let output = '';
      try {
        output = execSync('where.exe flutter', { stdio: 'pipe' }).toString();
      } catch (err: any) {
        exitCode = err.status;
        output = err.stdout ? err.stdout.toString() : '';
      }
      assert.strictEqual(exitCode, 1, 'where.exe flutter must return exit code 1');
    });

    it('2B: Worker handoff report must acknowledge Flutter SDK absence honestly', () => {
      const handoffPath = path.join(ROOT_DIR, '.agents/teamwork/teamwork_worker_m3/handoff.md');
      assert.ok(fs.existsSync(handoffPath), 'Worker M3 handoff.md must exist');
      const content = fs.readFileSync(handoffPath, 'utf8');

      assert.ok(
        content.includes('where.exe flutter') && content.includes('Exit Code: 1'),
        'Worker handoff must document where.exe flutter exit code 1',
      );
      assert.ok(
        content.includes('Implemented but not executed / Blocked by missing host tooling'),
        'Worker handoff must classify mobile apps accurately',
      );
    });
  });

  // =========================================================================
  // Target 3: Cross-Application Contract Alignment
  // =========================================================================
  describe('Target 3: Cross-Application Contract Alignment', () => {
    it('3A: Mobile shared API client endpoints must align with Backend controllers', () => {
      const mobileApiClientPath = path.join(
        ROOT_DIR,
        'packages/mobile_shared/lib/src/api/api_client.dart',
      );
      assert.ok(fs.existsSync(mobileApiClientPath));
      const mobileCode = fs.readFileSync(mobileApiClientPath, 'utf8');

      // Verify mobile endpoints match backend endpoints
      assert.ok(mobileCode.includes('/v1/auth/otp/send'), 'Mobile must target /v1/auth/otp/send');
      assert.ok(
        mobileCode.includes('/v1/auth/otp/verify'),
        'Mobile must target /v1/auth/otp/verify',
      );
      assert.ok(mobileCode.includes('/v1/auth/me'), 'Mobile must target /v1/auth/me');
      assert.ok(mobileCode.includes('/v1/auth/logout'), 'Mobile must target /v1/auth/logout');
      assert.ok(mobileCode.includes('/v1/health'), 'Mobile must target /v1/health');
      assert.ok(
        mobileCode.includes("'X-AllGo-Role': activeRole"),
        'Mobile must send X-AllGo-Role header',
      );
    });

    it('3B: Admin API client endpoints must align with Backend controllers', () => {
      const adminApiClientPath = path.join(ROOT_DIR, 'apps/admin/src/lib/api-client.ts');
      assert.ok(fs.existsSync(adminApiClientPath));
      const adminCode = fs.readFileSync(adminApiClientPath, 'utf8');

      // Verify admin endpoints match backend endpoints
      assert.ok(adminCode.includes('/v1/auth/otp/send'), 'Admin must target /v1/auth/otp/send');
      assert.ok(adminCode.includes('/v1/auth/otp/verify'), 'Admin must target /v1/auth/otp/verify');
      assert.ok(adminCode.includes('/v1/users'), 'Admin must target /v1/users');
      assert.ok(adminCode.includes('/v1/users/${id}'), 'Admin must target /v1/users/:id');
      assert.ok(
        adminCode.includes('/v1/users/${id}/status'),
        'Admin must target /v1/users/:id/status',
      );
      assert.ok(
        adminCode.includes('/v1/users/${userId}/roles'),
        'Admin must target /v1/users/:userId/roles',
      );
      assert.ok(adminCode.includes('/v1/auth/logout'), 'Admin must target /v1/auth/logout');
      assert.ok(adminCode.includes('/v1/auth/me'), 'Admin must target /v1/auth/me');
      assert.ok(
        adminCode.includes("'X-AllGo-Role': 'ADMIN'"),
        'Admin must send X-AllGo-Role: ADMIN',
      );
    });

    it('3C: Backend OpenAPI controllers must implement all cross-app endpoints with Swagger metadata', () => {
      const authControllerPath = path.join(ROOT_DIR, 'apps/api/src/auth/auth.controller.ts');
      const usersControllerPath = path.join(ROOT_DIR, 'apps/api/src/users/users.controller.ts');
      const healthControllerPath = path.join(ROOT_DIR, 'apps/api/src/health/health.controller.ts');
      const mainPath = path.join(ROOT_DIR, 'apps/api/src/main.ts');

      const authContent = fs.readFileSync(authControllerPath, 'utf8');
      const usersContent = fs.readFileSync(usersControllerPath, 'utf8');
      const healthContent = fs.readFileSync(healthControllerPath, 'utf8');
      const mainContent = fs.readFileSync(mainPath, 'utf8');

      // Backend route definitions & OpenAPI decorators
      assert.ok(
        authContent.includes("@Controller('v1/auth')"),
        'AuthController must route v1/auth',
      );
      assert.ok(authContent.includes("@Post('otp/send')"), 'AuthController must have otp/send');
      assert.ok(authContent.includes("@Post('otp/verify')"), 'AuthController must have otp/verify');
      assert.ok(authContent.includes("@Post('logout')"), 'AuthController must have logout');
      assert.ok(authContent.includes("@Get('me')"), 'AuthController must have me');
      assert.ok(authContent.includes('@ApiTags('), 'AuthController must declare OpenAPI ApiTags');

      assert.ok(
        usersContent.includes("@Controller('v1/users')"),
        'UsersController must route v1/users',
      );
      assert.ok(
        usersContent.includes("@Patch(':id/status')"),
        'UsersController must have :id/status',
      );
      assert.ok(usersContent.includes("@Post(':id/roles')"), 'UsersController must have :id/roles');
      assert.ok(usersContent.includes('@ApiTags('), 'UsersController must declare OpenAPI ApiTags');

      assert.ok(
        healthContent.includes("@Controller('v1/health')"),
        'HealthController must route v1/health',
      );

      // CORS allowed headers
      assert.ok(mainContent.includes("'X-AllGo-Role'"), 'Backend CORS must allow X-AllGo-Role');
      assert.ok(
        mainContent.includes('SwaggerModule'),
        'Backend main.ts must configure SwaggerModule',
      );
    });
  });

  // =========================================================================
  // Target 4: Phase 0 Baseline Integrity
  // =========================================================================
  describe('Target 4: Phase 0 Baseline Integrity', () => {
    it('4A: Phase 0 paths must have 0 diff against frozen baseline commit', () => {
      const diffCmd = `git diff --name-only ${BASELINE_COMMIT} -- docs/ infra/terraform/ database/migrations/ database/seeds/ scripts/cost-calculator.ts`;
      const output = execSync(diffCmd, { cwd: ROOT_DIR, encoding: 'utf8' }).trim();
      assert.strictEqual(output, '', `Phase 0 frozen paths were modified: \n${output}`);
    });
  });
});
