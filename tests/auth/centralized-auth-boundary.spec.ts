import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const source = async (relativePath: string): Promise<string> =>
  readFile(path.join(process.cwd(), relativePath), 'utf8');

test('Firebase Functions is a compatibility proxy, not an auth authority', async () => {
  const functions = await source('functions/src/index.ts');
  assert.match(functions, /ALLGO_CORE_API_URL/);
  assert.match(functions, /fetch\(\`\$\{CORE_API_URL\}\$\{path\}\`/);
  assert.doesNotMatch(functions, /jwt\.sign\s*\(/);
  assert.doesNotMatch(functions, /collection\(['"]users['"]\)/);
  assert.doesNotMatch(functions, /collection\(['"]otp_challenges['"]\)/);
});

test('OTP implementation does not accept fixed bypass codes or log OTP values', async () => {
  const otp = await source('apps/api/src/auth/otp.service.ts');
  const localAdapter = await source('apps/api/src/auth/adapters/local-otp-delivery.adapter.ts');
  const abuse = await source('apps/api/src/auth/sms-abuse-protection.service.ts');

  assert.doesNotMatch(otp, /code\s*===\s*['"]123456['"]/);
  assert.doesNotMatch(otp, /Generated Code|Default Code/);
  assert.doesNotMatch(localAdapter, /OTP:\s*\[\$\{otp\}\]|Standard Dev Code/);
  assert.doesNotMatch(abuse, /919876543210|919840011111/);
});

test('Firebase mock token verification is development-only and fails closed elsewhere', async () => {
  const firebase = await source('apps/api/src/auth/firebase-auth.service.ts');
  assert.match(firebase, /Mock Firebase tokens are disabled outside development/);
  assert.match(firebase, /refusing token verification/);
  assert.match(firebase, /Mock App Check tokens are disabled outside development/);
});

test('new account paths require an existing phone-verified account before email/OAuth linking', async () => {
  const email = await source('apps/api/src/auth/email-auth.service.ts');
  const oauth = await source('apps/api/src/auth/oauth.service.ts');
  const admin = await source('apps/api/src/auth/admin-auth.controller.ts');

  assert.match(email, /New accounts must complete verified phone OTP registration/);
  assert.match(email, /!user\.phoneVerified/);
  assert.match(oauth, /Create your AllGo account with verified phone OTP first/);
  assert.match(oauth, /!emailOwner\.phoneVerified/);
  assert.match(admin, /!user\.phoneVerified/);
  assert.match(admin, /Privileged roles must be granted through the approved onboarding/);
});
