import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = path.resolve(import.meta.dirname, '../../');

describe('Phase 1 Mobile: Flutter Applications & Shared Foundation Architecture', () => {
  describe('Shared Mobile Package (packages/mobile_shared)', () => {
    const SHARED_DIR = path.join(ROOT_DIR, 'packages/mobile_shared');

    it('should have a valid pubspec.yaml with Riverpod, Http, and Secure Storage', () => {
      const pubspecPath = path.join(SHARED_DIR, 'pubspec.yaml');
      assert.ok(fs.existsSync(pubspecPath));
      const content = fs.readFileSync(pubspecPath, 'utf-8');
      assert.match(content, /flutter_riverpod:/i);
      assert.match(content, /http:/i);
      assert.match(content, /flutter_secure_storage:/i);
    });

    it('should export complete design system, theme tokens, and typography', () => {
      const colorsPath = path.join(SHARED_DIR, 'lib/src/theme/app_colors.dart');
      const typoPath = path.join(SHARED_DIR, 'lib/src/theme/app_typography.dart');
      const themePath = path.join(SHARED_DIR, 'lib/src/theme/app_theme.dart');

      assert.ok(fs.existsSync(colorsPath));
      assert.ok(fs.existsSync(typoPath));
      assert.ok(fs.existsSync(themePath));

      const colorsContent = fs.readFileSync(colorsPath, 'utf-8');
      assert.match(colorsContent, /0xFF00C853/, 'AllGo Emerald Green primary');
      assert.match(colorsContent, /0xFFFF6D00/, 'AllGo Safety Orange secondary');

      const themeContent = fs.readFileSync(themePath, 'utf-8');
      assert.match(themeContent, /ThemeData/, 'Must construct standard Material3 ThemeData');
    });

    it('should define domain models User, AuthTokens, and AccountStatus', () => {
      const userPath = path.join(SHARED_DIR, 'lib/src/models/user.dart');
      const tokensPath = path.join(SHARED_DIR, 'lib/src/models/auth_tokens.dart');
      const statusPath = path.join(SHARED_DIR, 'lib/src/models/account_status.dart');

      assert.ok(fs.existsSync(userPath));
      assert.ok(fs.existsSync(tokensPath));
      assert.ok(fs.existsSync(statusPath));

      const userContent = fs.readFileSync(userPath, 'utf-8');
      assert.match(userContent, /class User/);
      assert.match(userContent, /fromJson/);
      assert.match(userContent, /toJson/);
    });

    it('should provide typed ApiClient with token storage and Riverpod AuthNotifier', () => {
      const clientPath = path.join(SHARED_DIR, 'lib/src/api/api_client.dart');
      const statePath = path.join(SHARED_DIR, 'lib/src/state/auth_notifier.dart');
      const storagePath = path.join(SHARED_DIR, 'lib/src/storage/token_storage.dart');

      assert.ok(fs.existsSync(clientPath));
      assert.ok(fs.existsSync(statePath));
      assert.ok(fs.existsSync(storagePath));

      const clientContent = fs.readFileSync(clientPath, 'utf-8');
      assert.match(clientContent, /sendOtp/);
      assert.match(clientContent, /verifyOtp/);
      assert.match(clientContent, /logout/);
      assert.match(clientContent, /X-AllGo-Role/);

      const stateContent = fs.readFileSync(statePath, 'utf-8');
      assert.match(stateContent, /class AuthNotifier extends StateNotifier/);
      assert.match(stateContent, /authNotifierProvider/);
    });

    it('should provide reusable UI widgets for phone input, OTP input, button, and app bar', () => {
      const buttonPath = path.join(SHARED_DIR, 'lib/src/widgets/allgo_button.dart');
      const phonePath = path.join(SHARED_DIR, 'lib/src/widgets/allgo_phone_input.dart');
      const otpPath = path.join(SHARED_DIR, 'lib/src/widgets/allgo_otp_input.dart');

      assert.ok(fs.existsSync(buttonPath));
      assert.ok(fs.existsSync(phonePath));
      assert.ok(fs.existsSync(otpPath));

      const phoneContent = fs.readFileSync(phonePath, 'utf-8');
      assert.match(phoneContent, /\+91/, 'Must provide default Indian +91 dial code');
      assert.match(phoneContent, /10-digit/, 'Must validate 10-digit mobile number');
    });
  });

  describe('Customer Mobile Application (apps/customer_mobile)', () => {
    const APP_DIR = path.join(ROOT_DIR, 'apps/customer_mobile');

    it('should have valid Android and iOS manifests and build.gradle with in.allgo.customer', () => {
      const manifestPath = path.join(APP_DIR, 'android/app/src/main/AndroidManifest.xml');
      const plistPath = path.join(APP_DIR, 'ios/Runner/Info.plist');
      const gradlePath = path.join(APP_DIR, 'android/app/build.gradle');

      assert.ok(fs.existsSync(manifestPath));
      assert.ok(fs.existsSync(plistPath));
      assert.ok(fs.existsSync(gradlePath));

      const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
      assert.match(manifestContent, /in\.allgo\.customer/);
      assert.match(manifestContent, /android\.permission\.ACCESS_FINE_LOCATION/);

      const gradleContent = fs.readFileSync(gradlePath, 'utf-8');
      assert.match(gradleContent, /applicationId "in\.allgo\.customer"/);
      assert.match(gradleContent, /namespace "in\.allgo\.customer"/);
    });

    it('should implement all required customer screens and clean navigation flow', () => {
      const screens = [
        'splash_screen.dart',
        'welcome_screen.dart',
        'phone_login_screen.dart',
        'otp_verify_screen.dart',
        'customer_home_shell.dart',
        'account_screen.dart',
      ];

      for (const s of screens) {
        const screenPath = path.join(APP_DIR, 'lib/src/screens', s);
        assert.ok(fs.existsSync(screenPath), `Screen ${s} must exist`);
      }

      const homeContent = fs.readFileSync(path.join(APP_DIR, 'lib/src/screens/customer_home_shell.dart'), 'utf-8');
      assert.match(homeContent, /Food Delivery/i);
      assert.match(homeContent, /Quick Grocery/i);
      assert.match(homeContent, /City Parcel/i);
      assert.match(homeContent, /Mobility Rides/i);
      assert.match(homeContent, /Hire Driver/i);
    });
  });

  describe('Partner Mobile Application (apps/partner_mobile)', () => {
    const APP_DIR = path.join(ROOT_DIR, 'apps/partner_mobile');

    it('should have valid Android and iOS manifests and build.gradle with in.allgo.partner', () => {
      const manifestPath = path.join(APP_DIR, 'android/app/src/main/AndroidManifest.xml');
      const plistPath = path.join(APP_DIR, 'ios/Runner/Info.plist');
      const gradlePath = path.join(APP_DIR, 'android/app/build.gradle');

      assert.ok(fs.existsSync(manifestPath));
      assert.ok(fs.existsSync(plistPath));
      assert.ok(fs.existsSync(gradlePath));

      const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
      assert.match(manifestContent, /in\.allgo\.partner/);
      assert.match(manifestContent, /android\.permission\.ACCESS_BACKGROUND_LOCATION/);
      assert.match(manifestContent, /android\.permission\.FOREGROUND_SERVICE/);

      const gradleContent = fs.readFileSync(gradlePath, 'utf-8');
      assert.match(gradleContent, /applicationId "in\.allgo\.partner"/);
      assert.match(gradleContent, /namespace "in\.allgo\.partner"/);
    });

    it('should enforce approval guard: new partner cannot go online before approval', () => {
      const approvalScreenPath = path.join(APP_DIR, 'lib/src/screens/approval_status_screen.dart');
      assert.ok(fs.existsSync(approvalScreenPath));
      const content = fs.readFileSync(approvalScreenPath, 'utf-8');
      assert.match(content, /Verification in Progress/i);
      assert.match(content, /Dispatch & Online Mode Locked/i);
      assert.match(content, /Complete Document Submission/i);
    });

    it('should provide multi-mode switcher and duty controls in partner home shell', () => {
      const homePath = path.join(APP_DIR, 'lib/src/screens/partner_home_shell.dart');
      assert.ok(fs.existsSync(homePath));
      const content = fs.readFileSync(homePath, 'utf-8');
      assert.match(content, /DELIVERIES_ONLY/);
      assert.match(content, /RIDES_ONLY/);
      assert.match(content, /ALL_JOBS/);
      assert.match(content, /Live Dispatch Radar/i);
    });
  });

  describe('Merchant Mobile Application (apps/merchant_mobile)', () => {
    const APP_DIR = path.join(ROOT_DIR, 'apps/merchant_mobile');

    it('should have valid Android and iOS manifests and build.gradle with in.allgo.merchant', () => {
      const manifestPath = path.join(APP_DIR, 'android/app/src/main/AndroidManifest.xml');
      const plistPath = path.join(APP_DIR, 'ios/Runner/Info.plist');
      const gradlePath = path.join(APP_DIR, 'android/app/build.gradle');

      assert.ok(fs.existsSync(manifestPath));
      assert.ok(fs.existsSync(plistPath));
      assert.ok(fs.existsSync(gradlePath));

      const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
      assert.match(manifestContent, /in\.allgo\.merchant/);

      const gradleContent = fs.readFileSync(gradlePath, 'utf-8');
      assert.match(gradleContent, /applicationId "in\.allgo\.merchant"/);
      assert.match(gradleContent, /namespace "in\.allgo\.merchant"/);
    });

    it('should enforce approval guard: merchant cannot accept orders before approval', () => {
      const approvalScreenPath = path.join(APP_DIR, 'lib/src/screens/approval_status_screen.dart');
      assert.ok(fs.existsSync(approvalScreenPath));
      const content = fs.readFileSync(approvalScreenPath, 'utf-8');
      assert.match(content, /Outlet Pending Verification/i);
      assert.match(content, /Orders Disabled/i);
      assert.match(content, /FSSAI Food License/i);
      assert.match(content, /GSTIN/i);
    });

    it('should implement live orders queue in merchant dashboard shell', () => {
      const dashPath = path.join(APP_DIR, 'lib/src/screens/merchant_dashboard_shell.dart');
      assert.ok(fs.existsSync(dashPath));
      const content = fs.readFileSync(dashPath, 'utf-8');
      assert.match(content, /STORE IS OPEN/i);
      assert.match(content, /Preparing/i);
      assert.match(content, /Ready for Courier/i);
    });
  });

  describe('Three Independent Mobile Applications Architecture & Isolation', () => {
    const apps = ['customer_mobile', 'merchant_mobile', 'partner_mobile'];

    it('should maintain three strictly independent entry points with distinct branding and root widgets', () => {
      const customerMain = fs.readFileSync(path.join(ROOT_DIR, 'apps/customer_mobile/lib/main.dart'), 'utf-8');
      const merchantMain = fs.readFileSync(path.join(ROOT_DIR, 'apps/merchant_mobile/lib/main.dart'), 'utf-8');
      const partnerMain = fs.readFileSync(path.join(ROOT_DIR, 'apps/partner_mobile/lib/main.dart'), 'utf-8');

      assert.match(customerMain, /class AllGoCustomerApp/);
      assert.match(customerMain, /AllGo Customer/);

      assert.match(merchantMain, /class AllGoMerchantApp/);
      assert.match(merchantMain, /AllGo Merchant/);

      assert.match(partnerMain, /class AllGoPartnerApp/);
      assert.match(partnerMain, /AllGo Partner/);
    });

    it('should enforce distinct Package IDs and namespaces across all three applications', () => {
      const packages = {
        customer_mobile: 'in.allgo.customer',
        merchant_mobile: 'in.allgo.merchant',
        partner_mobile: 'in.allgo.partner',
      };

      for (const [app, pkgId] of Object.entries(packages)) {
        const manifest = fs.readFileSync(path.join(ROOT_DIR, `apps/${app}/android/app/src/main/AndroidManifest.xml`), 'utf-8');
        const gradle = fs.readFileSync(path.join(ROOT_DIR, `apps/${app}/android/app/build.gradle`), 'utf-8');
        const plist = fs.readFileSync(path.join(ROOT_DIR, `apps/${app}/ios/Runner/Info.plist`), 'utf-8');

        assert.match(manifest, new RegExp(`package="${pkgId}"`));
        assert.match(gradle, new RegExp(`applicationId "${pkgId}"`));
        assert.match(gradle, new RegExp(`namespace "${pkgId}"`));
        assert.match(plist, new RegExp(`<string>${pkgId}</string>`));
      }
    });

    it('should have zero cross-app dependencies or imports between customer, merchant, and partner', () => {
      for (const app of apps) {
        const libDir = path.join(ROOT_DIR, `apps/${app}/lib`);
        const files = fs.readdirSync(libDir, { recursive: true }) as string[];

        for (const file of files) {
          if (!file.endsWith('.dart')) continue;
          const fullPath = path.join(libDir, file);
          const content = fs.readFileSync(fullPath, 'utf-8');

          const otherApps = apps.filter((a) => a !== app);
          for (const other of otherApps) {
            assert.strictEqual(
              content.includes(`package:${other}`),
              false,
              `Violation: ${app}/${file} must not import from ${other}`
            );
            assert.strictEqual(
              content.includes(`apps/${other}`),
              false,
              `Violation: ${app}/${file} must not reference apps/${other}`
            );
          }
        }
      }
    });

    it('should not contain any combined login or multi-role selector screens', () => {
      for (const app of apps) {
        const libDir = path.join(ROOT_DIR, `apps/${app}/lib`);
        const files = fs.readdirSync(libDir, { recursive: true }) as string[];

        for (const file of files) {
          if (!file.endsWith('.dart')) continue;
          const fullPath = path.join(libDir, file);
          const content = fs.readFileSync(fullPath, 'utf-8');

          assert.strictEqual(
            /select.*role|choose.*role|role.*select/i.test(content),
            false,
            `Violation: ${app}/${file} contains prohibited multi-role selection logic`
          );
        }
      }
    });

    it('should enforce independent activeRole context headers in mobile client', () => {
      const customerSplash = fs.readFileSync(path.join(ROOT_DIR, 'apps/customer_mobile/lib/src/screens/splash_screen.dart'), 'utf-8');
      const merchantSplash = fs.readFileSync(path.join(ROOT_DIR, 'apps/merchant_mobile/lib/src/screens/splash_screen.dart'), 'utf-8');
      const partnerSplash = fs.readFileSync(path.join(ROOT_DIR, 'apps/partner_mobile/lib/src/screens/splash_screen.dart'), 'utf-8');

      assert.match(merchantSplash, /client\.activeRole = 'MERCHANT_ADMIN'/);
      assert.match(partnerSplash, /client\.activeRole = 'PARTNER'/);
    });
  });
});

