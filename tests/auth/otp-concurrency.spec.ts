import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  OtpSecurityService,
  AtomicOtpChallengeStore,
  OtpVerificationStatus,
  ATOMIC_OTP_VERIFY_AND_CONSUME_LUA,
} from '../../packages/common/src/auth/otp-service.ts';

const TEST_PEPPER = 'allgo-production-cryptographic-pepper-2026';
const TEST_PHONE = '+919876543210';

/**
 * Test Environment Clarification:
 * These tests execute against AtomicOtpChallengeStore, an in-memory single-threaded atomic
 * challenge store simulator that models Redis's single-threaded event loop and atomic Lua script
 * execution semantics.
 *
 * Classification: Unit / Contract Tests.
 * (Live Redis server concurrency integration tests require Docker / live Redis daemon,
 * provided in tests/auth/redis-live-integration.spec.ts, which executes when Docker/Redis is online).
 */

describe('Task 5 / Finding 2.B: OTP Cryptographic Security & Concurrency Unit / Contract Tests (In-Memory Atomic Simulator)', () => {
  let securityService: OtpSecurityService;
  let store: AtomicOtpChallengeStore;

  beforeEach(() => {
    securityService = new OtpSecurityService(TEST_PEPPER, 300, 3);
    store = new AtomicOtpChallengeStore(securityService);
  });

  describe('Cryptographic OTP Generation', () => {
    it('should generate 6-digit cryptographically secure numeric OTPs with uniform length', () => {
      const generated = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const otp = securityService.generateSecureOtp(6);
        assert.strictEqual(otp.length, 6, 'Generated OTP must be exactly 6 characters');
        assert.match(otp, /^\d{6}$/, 'Generated OTP must consist of exactly 6 digits');
        generated.add(otp);
      }
      // With crypto.randomInt, collisions across 50 random 6-digit numbers should be negligible
      assert.ok(generated.size >= 48, 'Generated OTPs must exhibit high cryptographic entropy');
    });

    it('should require a strong server pepper of at least 16 characters', () => {
      assert.throws(() => {
        new OtpSecurityService('short-pepper');
      }, /min 16 chars/);
    });
  });

  describe('Keyed HMAC Storage & Plaintext Protection', () => {
    it('should compute deterministic HMAC-SHA256 digest and never store plaintext OTP', async () => {
      const rawOtp = '482910';
      const hmac = await store.setChallenge(TEST_PHONE, rawOtp, 300, 3);

      const challenge = store.getChallenge(TEST_PHONE);
      assert.ok(challenge, 'Challenge must exist in store');
      assert.strictEqual(challenge.hmac, hmac, 'Store must hold the computed HMAC');
      assert.notStrictEqual(challenge.hmac, rawOtp, 'Store must NEVER hold the plaintext OTP');
      assert.strictEqual(challenge.hmac.length, 64, 'HMAC-SHA256 hex digest must be 64 characters');
    });
  });

  describe('Single-Threaded Sequential Verification & Attempt Limits', () => {
    it('should successfully verify a valid OTP and consume it atomically', async () => {
      const otp = '849201';
      await store.setChallenge(TEST_PHONE, otp, 300, 3);

      const result = await store.verifyAndConsumeOtp(TEST_PHONE, otp, 3);
      assert.strictEqual(result, OtpVerificationStatus.SUCCESS);

      // Challenge must be immediately consumed/deleted
      const postVerifyChallenge = store.getChallenge(TEST_PHONE);
      assert.strictEqual(postVerifyChallenge, undefined, 'Challenge must be deleted immediately upon successful verification');

      // Subsequent attempt with identical OTP must fail (replay attack blocked)
      const replayResult = await store.verifyAndConsumeOtp(TEST_PHONE, otp, 3);
      assert.strictEqual(replayResult, OtpVerificationStatus.EXPIRED_OR_NOT_FOUND, 'Replay attempt must be rejected');
    });

    it('should increment attempts on invalid OTP and destroy challenge on 3rd failure', async () => {
      const otp = '123456';
      await store.setChallenge(TEST_PHONE, otp, 300, 3);

      // 1st failed attempt
      const attempt1 = await store.verifyAndConsumeOtp(TEST_PHONE, '000000', 3);
      assert.strictEqual(attempt1, OtpVerificationStatus.INVALID_OTP);
      assert.strictEqual(store.getChallenge(TEST_PHONE)?.attempts, 1);

      // 2nd failed attempt
      const attempt2 = await store.verifyAndConsumeOtp(TEST_PHONE, '111111', 3);
      assert.strictEqual(attempt2, OtpVerificationStatus.INVALID_OTP);
      assert.strictEqual(store.getChallenge(TEST_PHONE)?.attempts, 2);

      // 3rd failed attempt -> Max attempts exceeded, challenge destroyed
      const attempt3 = await store.verifyAndConsumeOtp(TEST_PHONE, '222222', 3);
      assert.strictEqual(attempt3, OtpVerificationStatus.MAX_ATTEMPTS_EXCEEDED);
      assert.strictEqual(store.getChallenge(TEST_PHONE), undefined, 'Challenge must be deleted upon exceeding max attempts');
    });

    it('should reject expired challenges', async () => {
      const otp = '999999';
      // Set challenge with 0-second TTL (immediately expired)
      await store.setChallenge(TEST_PHONE, otp, 0, 3);

      // Artificially simulate timestamp advancement
      const challenge = store.getChallenge(TEST_PHONE)!;
      challenge.expiresAt = Date.now() - 1000;

      const result = await store.verifyAndConsumeOtp(TEST_PHONE, otp, 3);
      assert.strictEqual(result, OtpVerificationStatus.EXPIRED_OR_NOT_FOUND, 'Expired challenge must be rejected');
    });
  });

  describe('Critical: Atomic Verification & Concurrency Race Condition Tests', () => {
    it('should guarantee that two simultaneous verification requests cannot both succeed using the same OTP', async () => {
      const validOtp = '582914';
      await store.setChallenge(TEST_PHONE, validOtp, 300, 3);

      // Launch 2 simultaneous asynchronous requests trying to verify the exact same valid OTP
      const [res1, res2] = await Promise.all([
        store.verifyAndConsumeOtp(TEST_PHONE, validOtp, 3),
        store.verifyAndConsumeOtp(TEST_PHONE, validOtp, 3),
      ]);

      const results = [res1, res2];
      const successCount = results.filter((r) => r === OtpVerificationStatus.SUCCESS).length;
      const consumedCount = results.filter((r) => r === OtpVerificationStatus.EXPIRED_OR_NOT_FOUND).length;

      assert.strictEqual(successCount, 1, 'Exactly one concurrent verification request must succeed');
      assert.strictEqual(consumedCount, 1, 'The competing concurrent request must see the challenge as already consumed/expired');
    });

    it('should guarantee exactly-once consumption across 10 simultaneous high-concurrency requests', async () => {
      const validOtp = '739102';
      await store.setChallenge(TEST_PHONE, validOtp, 300, 3);

      // Launch 10 simultaneous concurrent requests racing to consume the same OTP
      const concurrentRequests = Array.from({ length: 10 }, () =>
        store.verifyAndConsumeOtp(TEST_PHONE, validOtp, 3)
      );

      const outcomes = await Promise.all(concurrentRequests);

      const successes = outcomes.filter((status) => status === OtpVerificationStatus.SUCCESS);
      const rejections = outcomes.filter((status) => status === OtpVerificationStatus.EXPIRED_OR_NOT_FOUND);

      assert.strictEqual(successes.length, 1, 'Strictly ONE request out of 10 concurrent racers must succeed');
      assert.strictEqual(rejections.length, 9, 'All 9 competing racers must be rejected as challenge consumed');
      assert.strictEqual(store.getChallenge(TEST_PHONE), undefined, 'Challenge must no longer exist in store');
    });

    it('should define a production Redis Lua script with atomic EXISTS, HGET, HINCRBY, and DEL semantics', () => {
      assert.ok(ATOMIC_OTP_VERIFY_AND_CONSUME_LUA.includes("redis.call('EXISTS'"), 'Must invoke EXISTS');
      assert.ok(ATOMIC_OTP_VERIFY_AND_CONSUME_LUA.includes("redis.call('HGET'"), 'Must invoke HGET');
      assert.ok(ATOMIC_OTP_VERIFY_AND_CONSUME_LUA.includes("redis.call('DEL'"), 'Must invoke DEL on match or attempt limit');
      assert.ok(ATOMIC_OTP_VERIFY_AND_CONSUME_LUA.includes("redis.call('HINCRBY'"), 'Must invoke HINCRBY on mismatch');
    });
  });
});

