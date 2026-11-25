import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { EmailAuthService } from '../dist/auth/email-auth.service.js';
import { AuthManagerRepository } from '../dist/auth/data/auth-manager.repository.js';
import { TokenSessionService } from '../dist/auth/token-session.service.js';
import { TwoFactorService } from '../dist/auth/two-factor.service.js';
import { OtpService } from '../dist/auth/otp.service.js';
import { OAuthService } from '../dist/auth/oauth.service.js';
import { generateBackupCodes, hashBackupCode } from '../dist/auth/totp.util.js';

function createMockRedis() {
  const store = new Map();
  return {
    store,
    async get(k) {
      return store.has(k) ? store.get(k) : null;
    },
    async setex(k, _ttl, v) {
      store.set(k, v);
      return 'OK';
    },
    async del(k) {
      store.delete(k);
      return 1;
    },
  };
}

function createHarness() {
  const config = {
    nodeEnv: 'test',
    otpPepper: 'test-pepper-1234567890',
    jwtSecret: 'test-jwt-secret-1234567890-abcdef',
    jwtExpiresIn: '15m',
    jwtRefreshExpiresIn: '7d',
    port: 3000,
  };
  const redis = createMockRedis();
  // Mock db that throws on query so AuthManagerRepository uses its in-memory store
  const db = {
    async query() {
      throw new Error('offline-test-db');
    },
    async transaction() {
      throw new Error('offline-test-db');
    },
  };
  const authManagerRepo = new AuthManagerRepository(db, config);
  const otpService = new OtpService(config, redis, { sendOtp: async () => {} });
  const tokenSessionService = new TokenSessionService(config, redis, {}, otpService, authManagerRepo);
  const twoFactorService = new TwoFactorService(config, redis, authManagerRepo, tokenSessionService);
  const emailAuthService = new EmailAuthService(
    config,
    redis,
    authManagerRepo,
    tokenSessionService,
    twoFactorService,
    otpService,
  );

  const oauthService = new OAuthService(
    config,
    redis,
    authManagerRepo,
    tokenSessionService,
    twoFactorService,
  );

  return { config, redis, authManagerRepo, emailAuthService, twoFactorService, oauthService };
}

test('lookupIdentifier detects phone with password vs without password', async () => {
  const { authManagerRepo, emailAuthService } = createHarness();
  const passwordHash = await emailAuthService.hashPassword('AdminPass123!');

  await authManagerRepo.createUserWithIdentity({
    phone: '+919876543210',
    email: 'admin@allgo.in',
    fullName: 'Super Admin',
    passwordHash,
    emailVerified: true,
    phoneVerified: true,
    role: 'ADMIN',
    provider: 'phone',
    providerAccountId: '+919876543210',
    loginMethod: 'SEED',
  });

  const phoneLookup = await emailAuthService.lookupIdentifier('9876543210');
  assert.equal(phoneLookup.exists, true);
  assert.equal(phoneLookup.identifierType, 'phone');
  assert.equal(phoneLookup.normalizedIdentifier, '+919876543210');
  assert.equal(phoneLookup.hasPassword, true);
  assert.equal(phoneLookup.availableMethods.password, true);
  assert.equal(phoneLookup.availableMethods.phoneOtp, true);

  const missingPhoneLookup = await emailAuthService.lookupIdentifier('+919999988888');
  assert.equal(missingPhoneLookup.exists, false);
  assert.equal(missingPhoneLookup.hasPassword, false);
  assert.equal(missingPhoneLookup.availableMethods.password, false);
});

test('loginWithPassword succeeds for both email and phone, rejects invalid password, and triggers 2FA when enabled', async () => {
  const { authManagerRepo, emailAuthService } = createHarness();
  const passwordHash = await emailAuthService.hashPassword('AdminPass123!');

  const user = await authManagerRepo.createUserWithIdentity({
    phone: '+919876543210',
    email: 'admin@allgo.in',
    fullName: 'Super Admin',
    passwordHash,
    emailVerified: true,
    phoneVerified: true,
    role: 'ADMIN',
    provider: 'phone',
    providerAccountId: '+919876543210',
    loginMethod: 'SEED',
  });

  // Email + password
  const emailRes = await emailAuthService.loginWithPassword({
    identifier: 'ADMIN@ALLGO.IN',
    password: 'AdminPass123!',
  });
  assert.ok('accessToken' in emailRes);
  assert.equal(emailRes.user.id, user.id);

  // Phone + password (normalized)
  const phoneRes = await emailAuthService.loginWithPassword({
    identifier: '9876543210',
    password: 'AdminPass123!',
  });
  assert.ok('accessToken' in phoneRes);
  assert.equal(phoneRes.user.id, user.id);

  // Wrong password
  await assert.rejects(
    () =>
      emailAuthService.loginWithPassword({
        identifier: '+919876543210',
        password: 'WrongPassword!',
      }),
    /Invalid credentials/,
  );

  // Enable 2FA on user and verify login returns 2FA challenge
  const encryptedSecret = authManagerRepo.encryptSecret('JBSWY3DPEHPK3PXP');
  await authManagerRepo.enableTwoFactor(user.id, encryptedSecret, []);
  const twoFactorRes = await emailAuthService.loginWithPassword({
    identifier: '+919876543210',
    password: 'AdminPass123!',
  });
  assert.equal(twoFactorRes.requiresTwoFactor, true);
  assert.ok(twoFactorRes.twoFactorToken);
});

test('self-service phone and email linking verifies OTP, rejects conflicts, and prevents unlinking last identity', async () => {
  const { config, redis, authManagerRepo, emailAuthService } = createHarness();

  const user1 = await authManagerRepo.createUserWithIdentity({
    phone: '+919876543210',
    fullName: 'Admin One',
    phoneVerified: true,
    role: 'ADMIN',
    provider: 'phone',
    providerAccountId: '+919876543210',
    loginMethod: 'PHONE_OTP',
  });

  const user2 = await authManagerRepo.createUserWithIdentity({
    email: 'other@allgo.in',
    fullName: 'Admin Two',
    emailVerified: true,
    role: 'ADMIN',
    provider: 'email',
    providerAccountId: 'other@allgo.in',
    loginMethod: 'EMAIL_OTP',
  });

  // Cannot unlink the only remaining identity
  const initialIdentities = await authManagerRepo.listIdentitiesForUser(user1.id);
  assert.equal(initialIdentities.length, 1);
  await assert.rejects(
    () => authManagerRepo.unlinkIdentity(user1.id, initialIdentities[0].id),
    /only remaining authentication method/,
  );

  // Conflict: user1 tries to link user2's email
  await assert.rejects(
    () => emailAuthService.sendLinkEmailOtp(user1.id, 'other@allgo.in'),
    /already linked to another account/,
  );

  // Link a new email to user1
  const sendRes = await emailAuthService.sendLinkEmailOtp(user1.id, 'linked-admin@allgo.in');
  assert.equal(sendRes.status, 'OTP_SENT');
  const devCode = emailAuthService.getLastDevEmailOtp('linked-admin@allgo.in');
  assert.match(devCode, /^\d{6}$/);

  // Wrong code rejected
  await assert.rejects(
    () => emailAuthService.verifyLinkEmailOtp(user1.id, 'linked-admin@allgo.in', '000000'),
    /Invalid verification code/,
  );

  // Correct code links identity
  const linkedEmail = await emailAuthService.verifyLinkEmailOtp(
    user1.id,
    'linked-admin@allgo.in',
    devCode,
  );
  assert.equal(linkedEmail.identity.provider, 'email');
  assert.equal(linkedEmail.identity.email, 'linked-admin@allgo.in');
  assert.equal(linkedEmail.identity.verified, true);

  // Link a new phone to user2
  await emailAuthService.sendLinkPhoneOtp(user2.id, '9123456789');
  // Compute expected HMAC or inject known code into redis to test verifyLinkPhoneOtp
  const phoneCode = '654321';
  const phoneHash = crypto
    .createHmac('sha256', config.otpPepper)
    .update(`link_phone:${user2.id}:+919123456789:${phoneCode}`)
    .digest('hex');
  await redis.setex(
    `link_phone_otp:${user2.id}:+919123456789`,
    300,
    JSON.stringify({ hash: phoneHash, attempts: 0 }),
  );
  const linkedPhone = await emailAuthService.verifyLinkPhoneOtp(user2.id, '9123456789', phoneCode);
  assert.equal(linkedPhone.identity.provider, 'phone');
  assert.equal(linkedPhone.identity.phone, '+919123456789');

  // Conflict: user1 cannot link an OAuth identity already owned by user2
  await authManagerRepo.linkIdentity({
    userId: user2.id,
    provider: 'google',
    providerAccountId: 'google-sub-999',
    email: 'other@allgo.in',
    verified: true,
  });
  await assert.rejects(
    () =>
      authManagerRepo.linkIdentity({
        userId: user1.id,
        provider: 'google',
        providerAccountId: 'google-sub-999',
        email: 'other@allgo.in',
        verified: true,
      }),
    /already linked to another user/,
  );

  // Linked email resolves user1 on lookup/login, and unlinking clears it
  const linkedLookup = await emailAuthService.lookupIdentifier('linked-admin@allgo.in');
  assert.equal(linkedLookup.exists, true);
  await authManagerRepo.unlinkIdentity(user1.id, linkedEmail.identity.id);
  const unlinkedLookup = await emailAuthService.lookupIdentifier('linked-admin@allgo.in');
  assert.equal(unlinkedLookup.exists, false);
});

test('OAuthService rejects unconfigured providers and triggers 2FA challenge on OAuth login when enabled', async () => {
  const { config, redis, authManagerRepo, twoFactorService, oauthService } = createHarness();

  // Unconfigured provider (enabled but no clientId) must reject createAuthorizationUrl
  await authManagerRepo.upsertProvider({
    slug: 'google',
    enabled: true,
    clientId: null,
    clientSecret: null,
  });
  await assert.rejects(
    () =>
      oauthService.createAuthorizationUrl({
        slug: 'google',
        frontendRedirect: 'http://localhost:3003/login',
      }),
    /missing Client ID/,
  );

  // Configure Google provider and create user with Google identity + 2FA enabled
  await authManagerRepo.upsertProvider({
    slug: 'google',
    enabled: true,
    clientId: 'test-google-client-id',
    clientSecret: 'test-google-client-secret',
  });
  const backupCodes = generateBackupCodes(2);
  const backupHashes = backupCodes.map((c) => hashBackupCode(c, config.otpPepper));
  const user = await authManagerRepo.createUserWithIdentity({
    email: 'oauth-2fa@allgo.in',
    fullName: 'OAuth 2FA Admin',
    emailVerified: true,
    role: 'ADMIN',
    provider: 'google',
    providerAccountId: 'google-sub-2fa',
    loginMethod: 'OAUTH_GOOGLE',
  });
  const encryptedSecret = authManagerRepo.encryptSecret('JBSWY3DPEHPK3PXP');
  await authManagerRepo.enableTwoFactor(user.id, encryptedSecret, backupHashes);

  // Simulate OAuth callback creating a 2FA challenge stored under oauth:exchange:<code>
  const settings = await authManagerRepo.getSettings();
  assert.equal(twoFactorService.isTwoFactorRequiredForLogin(user, settings.twoFactorPolicy), true);

  const challenge = await twoFactorService.createLoginChallenge(
    await authManagerRepo.findUserById(user.id),
    {
      deviceId: 'oauth_google_test',
      platform: 'WEB',
      loginMethod: 'OAUTH_GOOGLE',
    },
  );
  const oneTimeCode = 'test-oauth-code-2fa';
  await redis.setex(`oauth:exchange:${oneTimeCode}`, 120, JSON.stringify(challenge));

  // Exchanging the OAuth one-time code must return the 2FA challenge (not tokens yet)
  const exchanged = await oauthService.exchangeOneTimeCode(oneTimeCode);
  assert.equal(exchanged.requiresTwoFactor, true);
  assert.ok(exchanged.twoFactorToken);
  assert.equal(exchanged.user.email, 'oauth-2fa@allgo.in');

  // Completing 2FA with backup code issues session tokens
  const tokens = await twoFactorService.verifyLoginChallenge({
    twoFactorToken: exchanged.twoFactorToken,
    code: backupCodes[0],
    isBackupCode: true,
  });
  assert.ok(tokens.accessToken);
  assert.ok(tokens.refreshToken);
  assert.equal(tokens.user.id, user.id);
});

test('requestPasswordReset and resetPassword support both phone and email identifiers', async () => {
  const { redis, authManagerRepo, emailAuthService } = createHarness();

  // Create phone-only user without password initially
  const phoneUser = await authManagerRepo.createUserWithIdentity({
    phone: '+919876543210',
    email: 'admin@allgo.in',
    fullName: 'Super Admin',
    emailVerified: true,
    phoneVerified: true,
    role: 'ADMIN',
    provider: 'phone',
    providerAccountId: '+919876543210',
    loginMethod: 'SEED',
  });

  // Edge cases: empty identifier, invalid phone, invalid code, short password
  await assert.rejects(
    () => emailAuthService.requestPasswordReset('   '),
    /Email or phone number is required/,
  );
  await assert.rejects(
    () => emailAuthService.requestPasswordReset('12345'),
    /valid mobile number/,
  );

  // Request reset via raw 10-digit phone number
  const phoneResetReq = await emailAuthService.requestPasswordReset('9876543210');
  assert.equal(phoneResetReq.status, 'RESET_SENT');
  const phoneCode = emailAuthService.getLastDevResetCode('+919876543210');
  assert.match(phoneCode, /^\d{6}$/);

  // Cooldown enforced
  await assert.rejects(
    () => emailAuthService.requestPasswordReset('+919876543210'),
    /Please wait/,
  );

  // Wrong code rejected
  await assert.rejects(
    () =>
      emailAuthService.resetPassword({
        identifier: '9876543210',
        code: '000000',
        newPassword: 'NewAdminPassword123!',
      }),
    /Invalid password reset code/,
  );

  // Short password rejected
  await assert.rejects(
    () =>
      emailAuthService.resetPassword({
        identifier: '+919876543210',
        code: phoneCode,
        newPassword: 'short',
      }),
    /at least 8 characters/,
  );

  // Valid phone password reset succeeds
  const phoneResetRes = await emailAuthService.resetPassword({
    identifier: '9876543210',
    code: phoneCode,
    newPassword: 'NewAdminPassword123!',
  });
  assert.equal(phoneResetRes.success, true);

  // Can now log in with phone + new password
  const phoneLogin = await emailAuthService.loginWithPassword({
    identifier: '+919876543210',
    password: 'NewAdminPassword123!',
  });
  assert.ok(phoneLogin.accessToken);
  assert.equal(phoneLogin.user.id, phoneUser.id);

  // Also test email password reset with { email } backwards compatibility
  await redis.del('pwd_reset_cooldown:admin@allgo.in');
  const emailResetReq = await emailAuthService.requestPasswordReset('ADMIN@allgo.in');
  assert.equal(emailResetReq.status, 'RESET_SENT');
  const emailCode = emailAuthService.getLastDevResetCode('admin@allgo.in');
  assert.match(emailCode, /^\d{6}$/);

  const emailResetRes = await emailAuthService.resetPassword({
    email: 'admin@allgo.in',
    code: emailCode,
    newPassword: 'UpdatedEmailPass456!',
  });
  assert.equal(emailResetRes.success, true);

  const emailLogin = await emailAuthService.loginWithPassword({
    identifier: 'admin@allgo.in',
    password: 'UpdatedEmailPass456!',
  });
  assert.ok(emailLogin.accessToken);
  assert.equal(emailLogin.user.id, phoneUser.id);
});
