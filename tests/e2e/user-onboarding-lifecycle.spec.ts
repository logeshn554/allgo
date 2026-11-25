import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, it } from 'node:test';
import { sendSmsOtp, verifySmsOtpAndLogin } from './legacy-mobile-data/smsAuthLoader.ts';
import {
  clearActiveSession,
  getActiveSession,
  saveAllAccounts,
  updateCustomerProfile,
  updateDriverKyc,
  updateMerchantStore,
} from './legacy-mobile-data/userRegistrationService.ts';

describe('Real-App Phone Authentication & 3-Role Onboarding Lifecycle', () => {
  const rootDir = path.resolve(import.meta.dirname, '../..');

  beforeEach(() => {
    saveAllAccounts(new Map());
    clearActiveSession();
  });

  describe('1. Phone Number Input & OTP Dispatch', () => {
    it('dispatches verification code with offline fallback gracefully', async () => {
      const phone = '+91 98888 11111';
      const result = await sendSmsOtp(phone);

      assert.strictEqual(result.sent, true);
      assert.ok(['LIVE_SMS', 'OFFLINE_FALLBACK'].includes(result.mode));
      assert.ok(result.code.length === 6);
      assert.strictEqual(result.cooldownSeconds, 60);
    });
  });

  describe('2. Atomic OTP Verification & Challenge Consumption', () => {
    it('rejects invalid verification codes', async () => {
      const phone = '+91 97777 22222';
      await sendSmsOtp(phone);

      const invalidResult = await verifySmsOtpAndLogin(phone, '000000', 'customer');
      assert.strictEqual(invalidResult.ok, false);
      assert.strictEqual(invalidResult.isNewUser, false);
      assert.ok(invalidResult.message.includes('Invalid'));
    });

    it('accepts standard offline verification code 123456 and creates new account', async () => {
      const phone = '+91 96666 33333';
      await sendSmsOtp(phone);

      const verifyResult = await verifySmsOtpAndLogin(phone, '123456', 'customer');
      assert.strictEqual(verifyResult.ok, true);
      assert.strictEqual(verifyResult.isNewUser, true);
      assert.ok(verifyResult.token.startsWith('tok_allgo_'));
      assert.ok(verifyResult.account);
      assert.strictEqual(verifyResult.account?.isProfileComplete, false);
    });
  });

  describe('3. Customer Onboarding: Name & Address Profile Flow', () => {
    it('gates customer until profile is completed, then directly routes on next login', async () => {
      const customerPhone = '+91 95555 44444';
      await sendSmsOtp(customerPhone);
      const initialLogin = await verifySmsOtpAndLogin(customerPhone, '123456', 'customer');
      assert.strictEqual(initialLogin.isNewUser, true);

      // Submit customer profile
      const updateRes = updateCustomerProfile(
        customerPhone,
        'Anand R',
        'Flat 402, Green Glen, Bengaluru',
      );
      assert.strictEqual(updateRes.success, true);
      assert.strictEqual(updateRes.account?.isProfileComplete, true);

      // Verify active session matches
      const session = getActiveSession();
      assert.strictEqual(session?.phone, customerPhone);
      assert.strictEqual(session?.isProfileComplete, true);

      // Returning user login
      const returningLogin = await verifySmsOtpAndLogin(customerPhone, '123456', 'customer');
      assert.strictEqual(returningLogin.ok, true);
      assert.strictEqual(returningLogin.isNewUser, false);
    });
  });

  describe('4. Partner 4-Step KYC Wizard Flow', () => {
    it('completes 4-step KYC and transitions partner account to PENDING verification', async () => {
      const driverPhone = '+91 94444 55555';
      await sendSmsOtp(driverPhone);
      const initialLogin = await verifySmsOtpAndLogin(driverPhone, '123456', 'driver');
      assert.strictEqual(initialLogin.isNewUser, true);

      // Submit 4-step KYC details
      const kycRes = updateDriverKyc(
        driverPhone,
        'Karthik V',
        'DL-KA-01-2022-9876',
        'KA-01-MJ-5432',
        'Electric Scooter',
      );
      assert.strictEqual(kycRes.success, true);
      assert.strictEqual(kycRes.account?.kycStatus, 'PENDING');
      assert.strictEqual(kycRes.account?.isProfileComplete, true);

      // Subsequent login enters directly to duty console
      const returningLogin = await verifySmsOtpAndLogin(driverPhone, '123456', 'driver');
      assert.strictEqual(returningLogin.isNewUser, false);
    });
  });

  describe('5. Merchant 7-Step FSSAI / GSTIN Store Setup Flow', () => {
    it('completes store onboarding and records FSSAI and GSTIN records', async () => {
      const merchantPhone = '+91 93333 66666';
      await sendSmsOtp(merchantPhone);
      const initialLogin = await verifySmsOtpAndLogin(merchantPhone, '123456', 'merchant');
      assert.strictEqual(initialLogin.isNewUser, true);

      // Submit 7-step Store Setup
      const storeRes = updateMerchantStore(
        merchantPhone,
        'Deepak Stores Inc',
        'AllGo Fresh Mart Indiranagar',
        '#12 100ft Road, Indiranagar, Bengaluru',
        '10020043000999',
        '29ABCDE1234F1Z5',
      );
      assert.strictEqual(storeRes.success, true);
      assert.strictEqual(storeRes.account?.merchantStoreName, 'AllGo Fresh Mart Indiranagar');
      assert.strictEqual(storeRes.account?.merchantFssai, '10020043000999');
      assert.strictEqual(storeRes.account?.merchantGstin, '29ABCDE1234F1Z5');
      assert.strictEqual(storeRes.account?.isProfileComplete, true);

      // Subsequent login enters directly to KDS console
      const returningLogin = await verifySmsOtpAndLogin(merchantPhone, '123456', 'merchant');
      assert.strictEqual(returningLogin.isNewUser, false);
    });
  });

  describe('6. Screen Implementation & Wiring Audit', () => {
    it('verifies independent Flutter mobile & Next.js web entrypoints exist for each domain', () => {
      const mobileApps = [
        'apps/customer_mobile/lib/main.dart',
        'apps/partner_mobile/lib/main.dart',
        'apps/merchant_mobile/lib/main.dart',
        'apps/hub_mobile/lib/main.dart',
      ];
      for (const rel of mobileApps) {
        assert.ok(fs.existsSync(path.join(rootDir, rel)), `${rel} must exist`);
      }

      const webApps = [
        'apps/customer-web/app/page.tsx',
        'apps/partner-web/app/page.tsx',
        'apps/merchant-web/app/page.tsx',
        'apps/hub-web/app/page.tsx',
      ];
      for (const rel of webApps) {
        assert.ok(fs.existsSync(path.join(rootDir, rel)), `${rel} must exist`);
      }
    });
  });
});
