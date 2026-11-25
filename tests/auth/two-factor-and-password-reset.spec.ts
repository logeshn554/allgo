import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LocalOtpDeliveryAdapter } from '../../services/api/dist/auth/adapters/local-otp-delivery.adapter.js';
import { AuthService } from '../../services/api/dist/auth/auth.service.js';
import { AuthManagerRepository } from '../../services/api/dist/auth/data/auth-manager.repository.js';
import { AuthRepository } from '../../services/api/dist/auth/data/auth.repository.js';
import { EmailAuthService } from '../../services/api/dist/auth/email-auth.service.js';
import { OtpService } from '../../services/api/dist/auth/otp.service.js';
import { TokenSessionService } from '../../services/api/dist/auth/token-session.service.js';
import { TwoFactorService } from '../../services/api/dist/auth/two-factor.service.js';
import {
  base32Decode,
  base32Encode,
  buildOtpAuthUri,
  generateBackupCodes,
  generateTotpCode,
  generateTotpSecret,
  hashBackupCode,
  verifyAndConsumeBackupCode,
  verifyTotpCode,
} from '../../services/api/src/auth/totp.util.ts';

function createInMemoryRedis() {
  const store = new Map<string, string>();
  const hashes = new Map<string, Map<string, string>>();
  return {
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async setex(key: string, _ttl: number, value: string) {
      store.set(key, value);
      return 'OK';
    },
    async del(key: string) {
      const existed = store.delete(key) || hashes.delete(key);
      return existed ? 1 : 0;
    },
    async hset(key: string, field: string, value: string) {
      let m = hashes.get(key);
      if (!m) {
        m = new Map();
        hashes.set(key, m);
      }
      m.set(field, value);
      return 1;
    },
    async expire(_key: string, _ttl: number) {
      return 1;
    },
    async evalLuaOtpVerify() {
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

function buildAuthTestHarness() {
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
  const twoFactorService = new TwoFactorService(
    config,
    redis,
    authManagerRepo,
    tokenSessionService,
  );
  const emailAuthService = new EmailAuthService(
    config,
    redis,
    authManagerRepo,
    tokenSessionService,
    twoFactorService,
    otpService,
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
    twoFactorService,
  );

  return {
    config,
    redis,
    authManagerRepo,
    twoFactorService,
    emailAuthService,
    authService,
  };
}

describe('TOTP & Backup Code Utilities', () => {
  it('encodes and decodes Base32 round-trip', () => {
    const raw = Buffer.from('AllGoSecretKey12345');
    const encoded = base32Encode(raw);
    const decoded = base32Decode(encoded);
    assert.deepEqual(decoded, raw);
  });

  it('generates and verifies 6-digit TOTP codes with window drift', () => {
    const secret = generateTotpSecret();
    const now = 1_700_000_000_000;
    const code = generateTotpCode(secret, now);
    assert.match(code, /^\d{6}$/);
    assert.equal(verifyTotpCode(secret, code, 1, now), true);
    assert.equal(verifyTotpCode(secret, code, 1, now + 30_000), true);
    assert.equal(verifyTotpCode(secret, code, 0, now + 30_000), false);
    assert.equal(verifyTotpCode(secret, '000000', 1, now), code === '000000');
    assert.equal(verifyTotpCode(secret, 'abc', 1, now), false);
  });

  it('builds standard otpauth:// URI', () => {
    const uri = buildOtpAuthUri({
      secret: 'JBSWY3DPEHPK3PXP',
      accountName: 'admin@allgo.in',
      issuer: 'AllGo',
    });
    assert.ok(uri.startsWith('otpauth://totp/AllGo:admin%40allgo.in?'));
    assert.ok(uri.includes('secret=JBSWY3DPEHPK3PXP'));
    assert.ok(uri.includes('issuer=AllGo'));
  });

  it('generates, hashes, and consumes single-use backup codes', () => {
    const codes = generateBackupCodes(8);
    assert.equal(codes.length, 8);
    for (const c of codes) {
      assert.match(c, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    }

    const pepper = 'test-pepper';
    const hashes = codes.map((c) => hashBackupCode(c, pepper));

    const first = verifyAndConsumeBackupCode(codes[0]!.toLowerCase(), hashes, pepper);
    assert.equal(first.valid, true);
    assert.equal(first.remainingHashes.length, 7);

    // Reusing the same code must fail
    const reuse = verifyAndConsumeBackupCode(codes[0]!, first.remainingHashes, pepper);
    assert.equal(reuse.valid, false);
    assert.equal(reuse.remainingHashes.length, 7);

    // Wrong code must fail
    const wrong = verifyAndConsumeBackupCode('XXXX-YYYY', first.remainingHashes, pepper);
    assert.equal(wrong.valid, false);
  });
});

describe('Account Lookup & No-Account Handling', () => {
  it('returns exists=false and respects allowSelfSignup for unknown email/phone', async () => {
    const { authManagerRepo, emailAuthService } = buildAuthTestHarness();
    await authManagerRepo.updateSettings({ allowSelfSignup: false });

    const emailLookup = await emailAuthService.lookupIdentifier('nobody@allgo.in');
    assert.equal(emailLookup.exists, false);
    assert.equal(emailLookup.identifierType, 'email');
    assert.equal(emailLookup.normalizedIdentifier, 'nobody@allgo.in');
    assert.equal(emailLookup.allowSelfSignup, false);

    const phoneLookup = await emailAuthService.lookupIdentifier('9876543210');
    assert.equal(phoneLookup.exists, false);
    assert.equal(phoneLookup.identifierType, 'phone');
    assert.equal(phoneLookup.normalizedIdentifier, '+919876543210');
    assert.equal(phoneLookup.allowSelfSignup, false);
  });

  it('returns exists=true and hasPassword status for registered user', async () => {
    const { emailAuthService } = buildAuthTestHarness();
    await emailAuthService.registerWithEmail({
      email: 'alice@allgo.in',
      password: 'Password123!',
      fullName: 'Alice',
    });

    const lookup = await emailAuthService.lookupIdentifier('ALICE@allgo.in');
    assert.equal(lookup.exists, true);
    assert.equal(lookup.hasPassword, true);
    assert.equal(lookup.twoFactorEnabled, false);
    assert.equal(lookup.availableMethods.password, true);
  });
});

describe('Password Reset & Change Password Flow', () => {
  it('completes forgot -> reset -> login with new password and enforces cooldown/attempts', async () => {
    const { emailAuthService } = buildAuthTestHarness();
    await emailAuthService.registerWithEmail({
      email: 'reset@allgo.in',
      password: 'OldPassword123!',
      fullName: 'Reset User',
    });

    const sent = await emailAuthService.requestPasswordReset('reset@allgo.in');
    assert.equal(sent.status, 'RESET_SENT');
    assert.equal(sent.cooldownSeconds, 60);

    // Immediate second request hits cooldown
    await assert.rejects(
      () => emailAuthService.requestPasswordReset('reset@allgo.in'),
      /wait before requesting/i,
    );

    const devCode = emailAuthService.getLastDevResetCode('reset@allgo.in');
    assert.ok(devCode && /^\d{6}$/.test(devCode));

    // Wrong code fails
    await assert.rejects(
      () =>
        emailAuthService.resetPassword({
          email: 'reset@allgo.in',
          code: '000000',
          newPassword: 'NewPassword123!',
        }),
      /Invalid password reset code/i,
    );

    // Valid code resets password
    const resetRes = await emailAuthService.resetPassword({
      email: 'reset@allgo.in',
      code: devCode!,
      newPassword: 'NewPassword123!',
    });
    assert.equal(resetRes.success, true);

    // Old password fails
    await assert.rejects(
      () =>
        emailAuthService.loginWithEmail({
          email: 'reset@allgo.in',
          password: 'OldPassword123!',
        }),
      /Invalid email or password/i,
    );

    // New password succeeds
    const loginRes = await emailAuthService.loginWithEmail({
      email: 'reset@allgo.in',
      password: 'NewPassword123!',
    });
    assert.ok('accessToken' in loginRes);
  });

  it('allows authenticated password change and rejects wrong current password', async () => {
    const { emailAuthService } = buildAuthTestHarness();
    const reg = await emailAuthService.registerWithEmail({
      email: 'chg@allgo.in',
      password: 'FirstPassword1!',
    });

    await assert.rejects(
      () =>
        emailAuthService.changePassword(reg.user.id, {
          currentPassword: 'WrongPassword!',
          newPassword: 'SecondPassword2!',
        }),
      /Current password is incorrect/i,
    );

    const res = await emailAuthService.changePassword(reg.user.id, {
      currentPassword: 'FirstPassword1!',
      newPassword: 'SecondPassword2!',
    });
    assert.equal(res.success, true);

    const loginRes = await emailAuthService.loginWithEmail({
      email: 'chg@allgo.in',
      password: 'SecondPassword2!',
    });
    assert.ok('accessToken' in loginRes);
  });
});

describe('Two-Factor Authentication (2FA) End-to-End Flow', () => {
  it('enrolls 2FA, requires 2FA challenge on login, verifies TOTP and backup codes, and supports disable', async () => {
    const { authManagerRepo, twoFactorService, emailAuthService } = buildAuthTestHarness();
    const reg = await emailAuthService.registerWithEmail({
      email: '2fa@allgo.in',
      password: 'StrongPassword1!',
      fullName: '2FA User',
    });

    // Begin setup
    const setup = await twoFactorService.beginSetup(reg.user.id);
    assert.ok(setup.secret.length >= 16);
    assert.ok(setup.otpAuthUri.startsWith('otpauth://totp/'));

    // Confirm enable with valid TOTP
    const validTotp = generateTotpCode(setup.secret);
    const enabled = await twoFactorService.confirmEnable(reg.user.id, validTotp);
    assert.equal(enabled.enabled, true);
    assert.equal(enabled.backupCodes.length, 8);

    // Login must now return a 2FA challenge instead of tokens
    const challenge = await emailAuthService.loginWithEmail({
      email: '2fa@allgo.in',
      password: 'StrongPassword1!',
    });
    assert.equal('requiresTwoFactor' in challenge, true);
    if (!('requiresTwoFactor' in challenge)) throw new Error('Expected 2FA challenge');

    // Verify with TOTP completes login
    const tokens = await twoFactorService.verifyLoginChallenge({
      twoFactorToken: challenge.twoFactorToken,
      code: generateTotpCode(setup.secret),
    });
    assert.ok(tokens.accessToken);
    assert.equal(tokens.user.id, reg.user.id);

    // Second login verified with a single-use backup code
    const challenge2 = await emailAuthService.loginWithEmail({
      email: '2fa@allgo.in',
      password: 'StrongPassword1!',
    });
    if (!('requiresTwoFactor' in challenge2)) throw new Error('Expected 2FA challenge');

    const tokens2 = await twoFactorService.verifyLoginChallenge({
      twoFactorToken: challenge2.twoFactorToken,
      code: enabled.backupCodes[0]!,
      isBackupCode: true,
    });
    assert.ok(tokens2.accessToken);

    const statusAfter = await twoFactorService.getStatus(reg.user.id);
    assert.equal(statusAfter.backupCodesRemaining, 7);

    // Policy DISABLED skips 2FA challenge
    await authManagerRepo.updateSettings({ twoFactorPolicy: 'DISABLED' });
    const directLogin = await emailAuthService.loginWithEmail({
      email: '2fa@allgo.in',
      password: 'StrongPassword1!',
    });
    assert.ok('accessToken' in directLogin);

    // Policy REQUIRED_FOR_ALL blocks user from disabling 2FA
    await authManagerRepo.updateSettings({ twoFactorPolicy: 'REQUIRED_FOR_ALL' });
    await assert.rejects(
      () => twoFactorService.disable(reg.user.id, generateTotpCode(setup.secret)),
      /required by your organization policy/i,
    );

    // Restore policy and disable 2FA
    await authManagerRepo.updateSettings({ twoFactorPolicy: 'OPTIONAL' });
    const disabled = await twoFactorService.disable(reg.user.id, generateTotpCode(setup.secret));
    assert.equal(disabled.enabled, false);
  });
});

describe('Email OTP Cooldown, Lockout & Policy Guards', () => {
  it('enforces cooldown on sendEmailOtp and 5-attempt lockout on verifyEmailOtp', async () => {
    const { emailAuthService } = buildAuthTestHarness();

    const sent = await emailAuthService.sendEmailOtp('otp-lockout@allgo.in');
    assert.equal(sent.status, 'OTP_SENT');
    assert.equal(sent.cooldownSeconds, 60);

    // Immediate resend hits cooldown
    await assert.rejects(
      () => emailAuthService.sendEmailOtp('otp-lockout@allgo.in'),
      /wait before requesting/i,
    );

    // 4 wrong attempts -> Invalid Email OTP code, 5th -> Maximum verification attempts exceeded
    for (let i = 0; i < 4; i++) {
      await assert.rejects(
        () =>
          emailAuthService.verifyEmailOtp({
            email: 'otp-lockout@allgo.in',
            code: '000000',
          }),
        /Invalid Email OTP code/i,
      );
    }

    await assert.rejects(
      () =>
        emailAuthService.verifyEmailOtp({
          email: 'otp-lockout@allgo.in',
          code: '000000',
        }),
      /Maximum verification attempts exceeded/i,
    );

    // Challenge is deleted after lockout
    const devOtp = emailAuthService.getLastDevEmailOtp('otp-lockout@allgo.in');
    await assert.rejects(
      () =>
        emailAuthService.verifyEmailOtp({
          email: 'otp-lockout@allgo.in',
          code: devOtp!,
        }),
      /expired or not requested/i,
    );
  });

  it('blocks Phone OTP when phoneOtpEnabled=false and blocks Email OTP signup when allowSelfSignup=false', async () => {
    const { authManagerRepo, authService, emailAuthService } = buildAuthTestHarness();

    await authManagerRepo.updateSettings({ phoneOtpEnabled: false, allowSelfSignup: false });
    await assert.rejects(
      () => authService.sendOtp({ phone: '+919876543210' }),
      /Phone OTP authentication is currently disabled/i,
    );

    await emailAuthService.sendEmailOtp('nosignup@allgo.in');
    const code = emailAuthService.getLastDevEmailOtp('nosignup@allgo.in')!;
    await assert.rejects(
      () => emailAuthService.verifyEmailOtp({ email: 'nosignup@allgo.in', code }),
      /Self-registration is disabled/i,
    );
  });
});
