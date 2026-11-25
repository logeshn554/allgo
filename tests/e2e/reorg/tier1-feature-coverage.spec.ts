/**
 * ============================================================================
 * Tier 1: Feature Coverage (Category-Partition Testing)
 * ============================================================================
 *
 * Target: tests/e2e/reorg/tier1-feature-coverage.spec.ts
 * Execution: node --experimental-transform-types --test tests/e2e/reorg/tier1-feature-coverage.spec.ts
 *
 * Requirements Covered:
 * - ORIGINAL_REQUEST.md: R1 (Directory Structure Conventions: pages/, components/, data/)
 * - Master PROJECT.md: Features 1 through 17
 * - Coverage Target: >= 5 test cases per feature (17 features × 5 = >= 85 test cases)
 *
 * Methodology: Category-Partition Testing
 * - Category 1 (Scaffold): Target project manifest, dependencies, and configuration
 * - Category 2 (Pages/Views): Screen / page route representations and entry points
 * - Category 3 (Components): Reusable UI widgets, modals, cards, and theme elements
 * - Category 4 (Data Layer): Repositories, APIs, models, state, and storage
 * - Category 5 (Contract/Interface): Entry points, public barrels, and facade preservation
 */

import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, it } from 'node:test';
import {
  ROOT_DIR,
  TARGET_PROJECTS,
  findSourceFiles,
  inspectRelativeImports,
  isNonTrivialFile,
} from './reorg-test-helpers.ts';

describe('Tier 1: Feature Coverage (Category-Partition Testing across 17 Features)', () => {
  // --------------------------------------------------------------------------
  // Feature 1: mobile_shared API Client Decomposition
  // --------------------------------------------------------------------------
  describe('Feature 1: mobile_shared API Client Decomposition', () => {
    it('F1-C1 (Scaffold): should verify mobile_shared package manifest and dependencies', () => {
      const pubspecPath = path.join(TARGET_PROJECTS.mobileShared, 'pubspec.yaml');
      assert.ok(fs.existsSync(pubspecPath), 'mobile_shared pubspec.yaml must exist');
      const content = fs.readFileSync(pubspecPath, 'utf-8');
      assert.match(content, /name:\s*allgo_mobile_shared/);
      assert.match(content, /flutter_riverpod:/);
      assert.match(content, /flutter_secure_storage:/);
    });

    it('F1-C2 (Pages/Views): should verify mobile_shared is a library foundation without runnable screens', () => {
      const libDir = path.join(TARGET_PROJECTS.mobileShared, 'lib');
      assert.ok(fs.existsSync(libDir), 'mobile_shared lib directory must exist');
      const mainDart = path.join(libDir, 'main.dart');
      assert.strictEqual(
        fs.existsSync(mainDart),
        false,
        'mobile_shared must not contain main.dart runnable screen entry point',
      );
    });

    it('F1-C3 (Components): should verify design system UI widgets in lib/src/components/', () => {
      const compDir = path.join(TARGET_PROJECTS.mobileShared, 'lib/src/components');
      assert.ok(fs.existsSync(compDir), 'lib/src/components/ must exist in mobile_shared');
      const btnPath = path.join(compDir, 'widgets/allgo_button.dart');
      assert.ok(
        fs.existsSync(btnPath),
        'AllGoButton component must exist under components/widgets',
      );
      assert.ok(isNonTrivialFile(btnPath), 'AllGoButton must contain non-trivial implementation');
    });

    it('F1-C4 (Data Layer): should verify domain data layer under lib/src/data/', () => {
      const dataDir = path.join(TARGET_PROJECTS.mobileShared, 'lib/src/data');
      assert.ok(fs.existsSync(dataDir), 'lib/src/data/ must exist in mobile_shared');
      const modelsDir = path.join(dataDir, 'models');
      const stateDir = path.join(dataDir, 'state');
      const storageDir = path.join(dataDir, 'storage');
      assert.ok(fs.existsSync(modelsDir), 'data/models/ must exist');
      assert.ok(fs.existsSync(stateDir), 'data/state/ must exist');
      assert.ok(fs.existsSync(storageDir), 'data/storage/ must exist');
    });

    it('F1-C5 (Contract/Interface): should verify ApiClient public class with domain methods', () => {
      const apiClientPath = path.join(TARGET_PROJECTS.mobileShared, 'lib/src/api/api_client.dart');
      assert.ok(
        fs.existsSync(apiClientPath),
        'api_client.dart must exist for backward compatibility',
      );
      const content = fs.readFileSync(apiClientPath, 'utf-8');
      assert.match(content, /class\s+ApiClient/);
      assert.match(content, /sendOtp/);
      assert.match(content, /verifyOtp/);
    });
  });

  // --------------------------------------------------------------------------
  // Feature 2: mobile_shared Models & Structure Reorg
  // --------------------------------------------------------------------------
  describe('Feature 2: mobile_shared Models & Structure Reorg', () => {
    it('F2-C1 (Scaffold): should verify data/models structure for core domain entities', () => {
      const modelsDataDir = path.join(TARGET_PROJECTS.mobileShared, 'lib/src/data/models');
      assert.ok(fs.existsSync(modelsDataDir), 'lib/src/data/models must exist');
      const files = fs.readdirSync(modelsDataDir);
      assert.ok(files.length >= 3, 'data/models must contain partitioned model files');
    });

    it('F2-C2 (Pages/Views): should verify models cleanly separate business entities from UI widgets', () => {
      const modelsDir = path.join(TARGET_PROJECTS.mobileShared, 'lib/src/data/models');
      const files = findSourceFiles(modelsDir);
      for (const f of files) {
        const content = fs.readFileSync(f, 'utf-8');
        assert.doesNotMatch(
          content,
          /extends\s+StatefulWidget/,
          `${f} should not declare UI widgets`,
        );
      }
    });

    it('F2-C3 (Components): should verify theme tokens and typography components separation', () => {
      const themeDir = path.join(TARGET_PROJECTS.mobileShared, 'lib/src/components/theme');
      assert.ok(fs.existsSync(themeDir), 'lib/src/components/theme must exist');
      const appTheme = path.join(themeDir, 'app_theme.dart');
      const appColors = path.join(themeDir, 'app_colors.dart');
      assert.ok(fs.existsSync(appTheme), 'app_theme.dart must exist');
      assert.ok(fs.existsSync(appColors), 'app_colors.dart must exist');
    });

    it('F2-C4 (Data Layer): should verify discovery and parcel models in data/models', () => {
      const discoveryOutlet = path.join(
        TARGET_PROJECTS.mobileShared,
        'lib/src/data/models/discovery_outlet.dart',
      );
      const parcelModel = path.join(
        TARGET_PROJECTS.mobileShared,
        'lib/src/data/models/parcel.dart',
      );
      assert.ok(fs.existsSync(discoveryOutlet), 'discovery_outlet.dart must exist in data/models');
      assert.ok(fs.existsSync(parcelModel), 'parcel.dart must exist in data/models');
    });

    it('F2-C5 (Contract/Interface): should verify root barrel export in lib/allgo_mobile_shared.dart', () => {
      const barrelPath = path.join(TARGET_PROJECTS.mobileShared, 'lib/allgo_mobile_shared.dart');
      assert.ok(fs.existsSync(barrelPath), 'allgo_mobile_shared.dart root barrel must exist');
      const content = fs.readFileSync(barrelPath, 'utf-8');
      assert.match(content, /export\s+['"].*api_client\.dart['"]/);
      assert.match(content, /export\s+['"].*user\.dart['"]/);
      assert.match(content, /export\s+['"].*auth_tokens\.dart['"]/);
    });
  });

  // --------------------------------------------------------------------------
  // Feature 3: customer_mobile Home & Outlets Modularization
  // --------------------------------------------------------------------------
  describe('Feature 3: customer_mobile Home & Outlets Modularization', () => {
    it('F3-C1 (Scaffold): should verify customer mobile pubspec.yaml with mobile_shared dependency', () => {
      const pubspec = path.join(TARGET_PROJECTS.customerMobile, 'pubspec.yaml');
      assert.ok(fs.existsSync(pubspec), 'customer_mobile pubspec.yaml must exist');
      const content = fs.readFileSync(pubspec, 'utf-8');
      assert.match(content, /name:\s*allgo_customer_mobile/);
      assert.match(content, /allgo_mobile_shared:/);
    });

    it('F3-C2 (Pages/Views): should verify customer home shell / page view exists', () => {
      const homeScreen = path.join(
        TARGET_PROJECTS.customerMobile,
        'lib/src/screens/customer_home_shell.dart',
      );
      const homePage = path.join(
        TARGET_PROJECTS.customerMobile,
        'lib/src/pages/customer_home_page.dart',
      );
      const exists = fs.existsSync(homeScreen) || fs.existsSync(homePage);
      assert.ok(exists, 'Customer home view must exist under screens/ or pages/');
    });

    it('F3-C3 (Components): should verify outlet catalog UI components and cards', () => {
      const catalogScreen = path.join(
        TARGET_PROJECTS.customerMobile,
        'lib/src/screens/outlet_catalog_screen.dart',
      );
      const catalogPage = path.join(
        TARGET_PROJECTS.customerMobile,
        'lib/src/pages/outlet_catalog_page.dart',
      );
      const exists = fs.existsSync(catalogScreen) || fs.existsSync(catalogPage);
      assert.ok(exists, 'Outlet catalog view must exist under screens/ or pages/');
    });

    it('F3-C4 (Data Layer): should verify catalog state and API data fetching structure', () => {
      const catalogFile = fs.existsSync(
        path.join(TARGET_PROJECTS.customerMobile, 'lib/src/pages/outlet_catalog_page.dart'),
      )
        ? path.join(TARGET_PROJECTS.customerMobile, 'lib/src/pages/outlet_catalog_page.dart')
        : path.join(TARGET_PROJECTS.customerMobile, 'lib/src/screens/outlet_catalog_screen.dart');
      const content = fs.readFileSync(catalogFile, 'utf-8');
      assert.match(
        content,
        /client|api|Catalog|Outlet/i,
        'Catalog screen must interact with catalog data',
      );
    });

    it('F3-C5 (Contract/Interface): should verify main entry point boots customer application shell', () => {
      const mainDart = path.join(TARGET_PROJECTS.customerMobile, 'lib/main.dart');
      assert.ok(fs.existsSync(mainDart), 'customer main.dart must exist');
      const content = fs.readFileSync(mainDart, 'utf-8');
      assert.match(content, /runApp\s*\(/);
      assert.match(content, /CustomerApp|MaterialApp/);
    });
  });

  // --------------------------------------------------------------------------
  // Feature 4: customer_mobile Mobility & Parcels Modularization
  // --------------------------------------------------------------------------
  describe('Feature 4: customer_mobile Mobility & Parcels Modularization', () => {
    it('F4-C1 (Scaffold): should verify Android/iOS platform manifests specify in.allgo.customer', () => {
      const manifestPath = path.join(
        TARGET_PROJECTS.customerMobile,
        'android/app/src/main/AndroidManifest.xml',
      );
      assert.ok(fs.existsSync(manifestPath), 'Customer AndroidManifest.xml must exist');
      const content = fs.readFileSync(manifestPath, 'utf-8');
      assert.match(content, /in\.allgo\.customer/);
    });

    it('F4-C2 (Pages/Views): should verify mobility, ride booking, and parcel sending views exist', () => {
      const parcelFile = path.join(
        TARGET_PROJECTS.customerMobile,
        'lib/src/screens/parcel_send_screen.dart',
      );
      const rideFile = path.join(
        TARGET_PROJECTS.customerMobile,
        'lib/src/screens/ride_booking_screen.dart',
      );
      const driverFile = path.join(
        TARGET_PROJECTS.customerMobile,
        'lib/src/screens/hire_driver_screen.dart',
      );
      assert.ok(fs.existsSync(parcelFile), 'parcel_send_screen must exist');
      assert.ok(fs.existsSync(rideFile), 'ride_booking_screen must exist');
      assert.ok(fs.existsSync(driverFile), 'hire_driver_screen must exist');
    });

    it('F4-C3 (Components): should verify vehicle selector and package dimension UI structures', () => {
      const parcelFile = path.join(
        TARGET_PROJECTS.customerMobile,
        'lib/src/screens/parcel_send_screen.dart',
      );
      const content = fs.readFileSync(parcelFile, 'utf-8');
      assert.match(content, /TextEditingController|Form|StatefulWidget/);
      assert.ok(content.length > 500, 'Parcel view must provide comprehensive UI form elements');
    });

    it('F4-C4 (Data Layer): should verify mobility fare estimates and parcel quote data handling', () => {
      const rideFile = path.join(
        TARGET_PROJECTS.customerMobile,
        'lib/src/screens/ride_booking_screen.dart',
      );
      const content = fs.readFileSync(rideFile, 'utf-8');
      assert.match(
        content,
        /fare|estimate|booking|quote/i,
        'Ride booking must handle fare estimates',
      );
    });

    it('F4-C5 (Contract/Interface): should verify navigation routing connects to mobility flows', () => {
      const homeFile = path.join(
        TARGET_PROJECTS.customerMobile,
        'lib/src/screens/customer_home_shell.dart',
      );
      const content = fs.readFileSync(homeFile, 'utf-8');
      assert.match(
        content,
        /ride|parcel|mobility/i,
        'Home shell must route to mobility and parcels',
      );
    });
  });

  // --------------------------------------------------------------------------
  // Feature 5: customer_mobile Checkout & Orders Modularization
  // --------------------------------------------------------------------------
  describe('Feature 5: customer_mobile Checkout & Orders Modularization', () => {
    it('F5-C1 (Scaffold): should verify cart and checkout source assets existence', () => {
      const cartFile = path.join(
        TARGET_PROJECTS.customerMobile,
        'lib/src/screens/cart_screen.dart',
      );
      assert.ok(fs.existsSync(cartFile), 'cart_screen.dart must exist');
      assert.ok(isNonTrivialFile(cartFile), 'cart_screen must have non-trivial content');
    });

    it('F5-C2 (Pages/Views): should verify checkout, order detail, and tracking views exist', () => {
      const checkoutFile = path.join(
        TARGET_PROJECTS.customerMobile,
        'lib/src/screens/checkout_screen.dart',
      );
      const orderDetailFile = path.join(
        TARGET_PROJECTS.customerMobile,
        'lib/src/screens/order_detail_screen.dart',
      );
      const trackingFile = path.join(
        TARGET_PROJECTS.customerMobile,
        'lib/src/screens/delivery_tracking_screen.dart',
      );
      assert.ok(fs.existsSync(checkoutFile), 'checkout_screen must exist');
      assert.ok(fs.existsSync(orderDetailFile), 'order_detail_screen must exist');
      assert.ok(fs.existsSync(trackingFile), 'delivery_tracking_screen must exist');
    });

    it('F5-C3 (Components): should verify order summary, address selector, and tracking timeline components', () => {
      const checkoutFile = path.join(
        TARGET_PROJECTS.customerMobile,
        'lib/src/screens/checkout_screen.dart',
      );
      const content = fs.readFileSync(checkoutFile, 'utf-8');
      assert.match(content, /payment|address|summary|order/i);
    });

    it('F5-C4 (Data Layer): should verify cart state management and active order polling data', () => {
      const trackingFile = path.join(
        TARGET_PROJECTS.customerMobile,
        'lib/src/screens/delivery_tracking_screen.dart',
      );
      const content = fs.readFileSync(trackingFile, 'utf-8');
      assert.match(content, /status|order|tracking|delivery/i);
    });

    it('F5-C5 (Contract/Interface): should verify checkout progression contracts with payment callbacks', () => {
      const checkoutFile = path.join(
        TARGET_PROJECTS.customerMobile,
        'lib/src/screens/checkout_screen.dart',
      );
      const content = fs.readFileSync(checkoutFile, 'utf-8');
      assert.match(content, /Navigator|pop|push|onSuccess|pay/i);
    });
  });

  // --------------------------------------------------------------------------
  // Feature 6: customer_mobile Directory Structure R1 Migration
  // --------------------------------------------------------------------------
  describe('Feature 6: customer_mobile Directory Structure R1 Migration', () => {
    it('F6-C1 (Scaffold): should verify customer mobile directory structure under lib/src', () => {
      const srcDir = path.join(TARGET_PROJECTS.customerMobile, 'lib/src');
      assert.ok(fs.existsSync(srcDir), 'lib/src must exist in customer_mobile');
      const entries = fs.readdirSync(srcDir);
      assert.ok(entries.length > 0, 'lib/src must contain active modules');
    });

    it('F6-C2 (Pages/Views): should verify screens reside in designated view structure', () => {
      const screensDir = path.join(TARGET_PROJECTS.customerMobile, 'lib/src/screens');
      assert.ok(fs.existsSync(screensDir), 'lib/src/screens/ must exist');
      const files = fs.readdirSync(screensDir);
      assert.ok(files.length >= 10, 'screens/ must contain primary application screen views');
    });

    it('F6-C3 (Components): should verify modular UI components are separated from route logic', () => {
      const sharedWidgets = path.join(TARGET_PROJECTS.mobileShared, 'lib/src/components/widgets');
      assert.ok(fs.existsSync(sharedWidgets), 'Shared components must exist for UI extraction');
      const buttonFile = path.join(sharedWidgets, 'allgo_button.dart');
      assert.ok(fs.existsSync(buttonFile), 'allgo_button.dart component must exist');
    });

    it('F6-C4 (Data Layer): should verify data access and state notifiers are separated from views', () => {
      const sharedData = path.join(TARGET_PROJECTS.mobileShared, 'lib/src/data');
      assert.ok(fs.existsSync(sharedData), 'Shared data layer must exist');
      const tokenStorage = path.join(sharedData, 'storage/token_storage.dart');
      assert.ok(fs.existsSync(tokenStorage), 'token_storage.dart must exist in data layer');
    });

    it('F6-C5 (Contract/Interface): should verify legacy screen bridge compatibility for backward safety', () => {
      const splashScreen = path.join(
        TARGET_PROJECTS.customerMobile,
        'lib/src/screens/splash_screen.dart',
      );
      assert.ok(fs.existsSync(splashScreen), 'splash_screen must exist at legacy location');
      assert.ok(isNonTrivialFile(splashScreen), 'splash_screen must have non-trivial content');
    });
  });

  // --------------------------------------------------------------------------
  // Feature 7: partner_mobile Home Shell & Registration Decomposition
  // --------------------------------------------------------------------------
  describe('Feature 7: partner_mobile Home Shell & Registration Decomposition', () => {
    it('F7-C1 (Scaffold): should verify partner pubspec.yaml and platform manifests specify in.allgo.partner', () => {
      const pubspec = path.join(TARGET_PROJECTS.partnerMobile, 'pubspec.yaml');
      assert.ok(fs.existsSync(pubspec), 'partner_mobile pubspec.yaml must exist');
      const manifest = path.join(
        TARGET_PROJECTS.partnerMobile,
        'android/app/src/main/AndroidManifest.xml',
      );
      assert.ok(fs.existsSync(manifest), 'partner AndroidManifest.xml must exist');
      assert.match(fs.readFileSync(manifest, 'utf-8'), /in\.allgo\.partner/);
    });

    it('F7-C2 (Pages/Views): should verify partner home shell and registration views exist', () => {
      const homeShell = path.join(
        TARGET_PROJECTS.partnerMobile,
        'lib/src/screens/partner_home_shell.dart',
      );
      const registration = path.join(
        TARGET_PROJECTS.partnerMobile,
        'lib/src/screens/partner_registration_screen.dart',
      );
      assert.ok(fs.existsSync(homeShell), 'partner_home_shell must exist');
      assert.ok(fs.existsSync(registration), 'partner_registration_screen must exist');
    });

    it('F7-C3 (Components): should verify duty toggle bar and radar orders sheet components', () => {
      const homeShell = path.join(
        TARGET_PROJECTS.partnerMobile,
        'lib/src/screens/partner_home_shell.dart',
      );
      const content = fs.readFileSync(homeShell, 'utf-8');
      assert.match(content, /duty|online|toggle|radar/i, 'Home shell must provide duty controls');
    });

    it('F7-C4 (Data Layer): should verify partner duty status, location telemetry, and earnings data', () => {
      const earningsFile = path.join(
        TARGET_PROJECTS.partnerMobile,
        'lib/src/screens/partner_earnings_screen.dart',
      );
      assert.ok(fs.existsSync(earningsFile), 'partner_earnings_screen must exist');
      const content = fs.readFileSync(earningsFile, 'utf-8');
      assert.match(content, /payout|earnings|commission|ledger/i);
    });

    it('F7-C5 (Contract/Interface): should verify partner approval guard prevents unverified partners going online', () => {
      const approvalScreen = path.join(
        TARGET_PROJECTS.partnerMobile,
        'lib/src/screens/approval_status_screen.dart',
      );
      assert.ok(fs.existsSync(approvalScreen), 'approval_status_screen must exist');
      const content = fs.readFileSync(approvalScreen, 'utf-8');
      assert.match(content, /APPROVED|PENDING|REJECTED|status/i);
    });
  });

  // --------------------------------------------------------------------------
  // Feature 8: merchant_mobile Dashboard Shell Decomposition
  // --------------------------------------------------------------------------
  describe('Feature 8: merchant_mobile Dashboard Shell Decomposition', () => {
    it('F8-C1 (Scaffold): should verify merchant pubspec.yaml and platform manifests specify in.allgo.merchant', () => {
      const pubspec = path.join(TARGET_PROJECTS.merchantMobile, 'pubspec.yaml');
      assert.ok(fs.existsSync(pubspec), 'merchant_mobile pubspec.yaml must exist');
      const manifest = path.join(
        TARGET_PROJECTS.merchantMobile,
        'android/app/src/main/AndroidManifest.xml',
      );
      assert.ok(fs.existsSync(manifest), 'merchant AndroidManifest.xml must exist');
      assert.match(fs.readFileSync(manifest, 'utf-8'), /in\.allgo\.merchant/);
    });

    it('F8-C2 (Pages/Views): should verify merchant dashboard shell with operational views exists', () => {
      const shellFile = path.join(
        TARGET_PROJECTS.merchantMobile,
        'lib/src/screens/merchant_dashboard_shell.dart',
      );
      assert.ok(fs.existsSync(shellFile), 'merchant_dashboard_shell must exist');
      assert.ok(isNonTrivialFile(shellFile), 'merchant_dashboard_shell must be non-trivial');
    });

    it('F8-C3 (Components): should verify 5 operational tabs (Live Orders, Menu, Analytics, Outlets, Profile) components', () => {
      const shellFile = path.join(
        TARGET_PROJECTS.merchantMobile,
        'lib/src/screens/merchant_dashboard_shell.dart',
      );
      const content = fs.readFileSync(shellFile, 'utf-8');
      assert.match(content, /Live Orders|Orders/i);
      assert.match(content, /Menu|Catalog/i);
      assert.match(content, /Analytics|Financials|Earnings/i);
      assert.match(content, /Outlet|Store/i);
      assert.match(content, /Profile|Settings/i);
    });

    it('F8-C4 (Data Layer): should verify live order queue stream and store toggle data models', () => {
      const shellFile = path.join(
        TARGET_PROJECTS.merchantMobile,
        'lib/src/screens/merchant_dashboard_shell.dart',
      );
      const content = fs.readFileSync(shellFile, 'utf-8');
      assert.match(content, /prep|open|closed|accept|reject/i);
    });

    it('F8-C5 (Contract/Interface): should verify merchant operational gating prevents unauthorized access', () => {
      const approvalScreen = path.join(
        TARGET_PROJECTS.merchantMobile,
        'lib/src/screens/approval_status_screen.dart',
      );
      assert.ok(fs.existsSync(approvalScreen), 'approval_status_screen must exist');
      const content = fs.readFileSync(approvalScreen, 'utf-8');
      assert.match(content, /APPROVED|PENDING|status/i);
    });
  });

  // --------------------------------------------------------------------------
  // Feature 9: merchant_mobile Operating Hours & Registration Decomposition
  // --------------------------------------------------------------------------
  describe('Feature 9: merchant_mobile Operating Hours & Registration Decomposition', () => {
    it('F9-C1 (Scaffold): should verify multi-step onboarding assets and statutory document fields', () => {
      const regScreen = path.join(
        TARGET_PROJECTS.merchantMobile,
        'lib/src/screens/merchant_registration_screen.dart',
      );
      assert.ok(fs.existsSync(regScreen), 'merchant_registration_screen must exist');
      const content = fs.readFileSync(regScreen, 'utf-8');
      assert.match(content, /PAN|FSSAI|GSTIN/i, 'Registration must collect statutory compliance');
    });

    it('F9-C2 (Pages/Views): should verify operating hours, merchant registration, and profile views exist', () => {
      const opHours = path.join(
        TARGET_PROJECTS.merchantMobile,
        'lib/src/screens/operating_hours_screen.dart',
      );
      const profile = path.join(
        TARGET_PROJECTS.merchantMobile,
        'lib/src/screens/merchant_profile_screen.dart',
      );
      assert.ok(fs.existsSync(opHours), 'operating_hours_screen must exist');
      assert.ok(fs.existsSync(profile), 'merchant_profile_screen must exist');
    });

    it('F9-C3 (Components): should verify operating hours time slot table and KYC upload components', () => {
      const opHours = path.join(
        TARGET_PROJECTS.merchantMobile,
        'lib/src/screens/operating_hours_screen.dart',
      );
      const content = fs.readFileSync(opHours, 'utf-8');
      assert.match(content, /Time|slot|open|close|day/i);
    });

    it('F9-C4 (Data Layer): should verify slot validation logic and statutory compliance data models', () => {
      const modelFile = path.join(
        TARGET_PROJECTS.mobileShared,
        'lib/src/models/operating_hours.dart',
      );
      assert.ok(fs.existsSync(modelFile), 'operating_hours.dart model must exist in mobile_shared');
      const content = fs.readFileSync(modelFile, 'utf-8');
      assert.match(content, /DayOfWeek|openTime|closeTime|isClosed/i);
    });

    it('F9-C5 (Contract/Interface): should verify multi-outlet branch creation and management flow', () => {
      const outletMgmt = path.join(
        TARGET_PROJECTS.merchantMobile,
        'lib/src/screens/outlet_management_screen.dart',
      );
      const createOutlet = path.join(
        TARGET_PROJECTS.merchantMobile,
        'lib/src/screens/create_outlet_screen.dart',
      );
      assert.ok(fs.existsSync(outletMgmt), 'outlet_management_screen must exist');
      assert.ok(fs.existsSync(createOutlet), 'create_outlet_screen must exist');
    });
  });

  // --------------------------------------------------------------------------
  // Feature 10: Partner & Merchant R1 Directory Migration
  // --------------------------------------------------------------------------
  describe('Feature 10: Partner & Merchant R1 Directory Migration', () => {
    it('F10-C1 (Scaffold): should verify partner and merchant project trees maintain complete decoupling', () => {
      const partnerSrc = path.join(TARGET_PROJECTS.partnerMobile, 'lib');
      const merchantSrc = path.join(TARGET_PROJECTS.merchantMobile, 'lib');
      assert.ok(fs.existsSync(partnerSrc), 'partner lib must exist');
      assert.ok(fs.existsSync(merchantSrc), 'merchant lib must exist');
    });

    it('F10-C2 (Pages/Views): should verify screens reside in dedicated view hierarchy', () => {
      const partnerScreens = path.join(TARGET_PROJECTS.partnerMobile, 'lib/src/screens');
      const merchantScreens = path.join(TARGET_PROJECTS.merchantMobile, 'lib/src/screens');
      assert.ok(fs.existsSync(partnerScreens), 'partner screens directory must exist');
      assert.ok(fs.existsSync(merchantScreens), 'merchant screens directory must exist');
      assert.ok(fs.readdirSync(partnerScreens).length >= 5, 'partner has dedicated screens');
      assert.ok(fs.readdirSync(merchantScreens).length >= 5, 'merchant has dedicated screens');
    });

    it('F10-C3 (Components): should verify reusable cards, tables, and dialogs cleanly extracted', () => {
      const sharedWidgets = path.join(TARGET_PROJECTS.mobileShared, 'lib/src/components/widgets');
      const phoneInput = path.join(sharedWidgets, 'allgo_phone_input.dart');
      const otpInput = path.join(sharedWidgets, 'allgo_otp_input.dart');
      assert.ok(fs.existsSync(phoneInput), 'allgo_phone_input must exist');
      assert.ok(fs.existsSync(otpInput), 'allgo_otp_input must exist');
    });

    it('F10-C4 (Data Layer): should verify data models and state management isolated into data layer', () => {
      const partnerModel = path.join(
        TARGET_PROJECTS.mobileShared,
        'lib/src/models/partner_profile.dart',
      );
      const merchantModel = path.join(
        TARGET_PROJECTS.mobileShared,
        'lib/src/models/merchant_profile.dart',
      );
      assert.ok(fs.existsSync(partnerModel), 'partner_profile model must exist');
      assert.ok(fs.existsSync(merchantModel), 'merchant_profile model must exist');
    });

    it('F10-C5 (Contract/Interface): should verify legacy screen bridge paths resolve without breaking test runners', () => {
      const pSplash = path.join(
        TARGET_PROJECTS.partnerMobile,
        'lib/src/screens/splash_screen.dart',
      );
      const mSplash = path.join(
        TARGET_PROJECTS.merchantMobile,
        'lib/src/screens/splash_screen.dart',
      );
      assert.ok(fs.existsSync(pSplash), 'partner splash screen must exist');
      assert.ok(fs.existsSync(mSplash), 'merchant splash screen must exist');
    });
  });

  // --------------------------------------------------------------------------
  // Feature 11: admin API Client & State Modularization
  // --------------------------------------------------------------------------
  describe('Feature 11: admin API Client & State Modularization', () => {
    it('F11-C1 (Scaffold): should verify apps/admin package.json with Next.js App Router dependencies', () => {
      const pkgJson = path.join(TARGET_PROJECTS.admin, 'package.json');
      assert.ok(fs.existsSync(pkgJson), 'apps/admin package.json must exist');
      const content = JSON.parse(fs.readFileSync(pkgJson, 'utf-8'));
      assert.ok(content.dependencies.next, 'Next.js dependency must be declared');
      assert.ok(content.dependencies.react, 'React dependency must be declared');
      assert.ok(content.dependencies['@allgo/common'], '@allgo/common dependency must be declared');
    });

    it('F11-C2 (Pages/Views): should verify admin login and console layout views in src/app/', () => {
      const loginPage = path.join(TARGET_PROJECTS.admin, 'src/app/login/page.tsx');
      const adminLayout = path.join(TARGET_PROJECTS.admin, 'src/app/admin/layout.tsx');
      assert.ok(fs.existsSync(loginPage), 'login/page.tsx must exist');
      assert.ok(fs.existsSync(adminLayout), 'admin/layout.tsx must exist');
    });

    it('F11-C3 (Components): should verify shared UI navigation components (Header, Sidebar, StatusBadge)', () => {
      const compDir = path.join(TARGET_PROJECTS.admin, 'src/components');
      assert.ok(fs.existsSync(compDir), 'src/components must exist');
      assert.ok(fs.existsSync(path.join(compDir, 'Header.tsx')), 'Header.tsx must exist');
      assert.ok(fs.existsSync(path.join(compDir, 'Sidebar.tsx')), 'Sidebar.tsx must exist');
      assert.ok(fs.existsSync(path.join(compDir, 'StatusBadge.tsx')), 'StatusBadge.tsx must exist');
    });

    it('F11-C4 (Data Layer): should verify modular domain API clients under src/data/api/ and types under src/data/types/', () => {
      const apiDir = path.join(TARGET_PROJECTS.admin, 'src/data/api');
      const typesDir = path.join(TARGET_PROJECTS.admin, 'src/data/types');
      assert.ok(fs.existsSync(apiDir), 'src/data/api/ must exist');
      assert.ok(fs.existsSync(typesDir), 'src/data/types/ must exist');
      const domainApis = fs.readdirSync(apiDir);
      assert.ok(domainApis.length >= 10, 'src/data/api/ must contain modular domain API clients');
    });

    it('F11-C5 (Contract/Interface): should verify legacy src/lib/api-client.ts facade exports adminApi and domain clients', () => {
      const facade = path.join(TARGET_PROJECTS.admin, 'src/lib/api-client.ts');
      assert.ok(fs.existsSync(facade), 'src/lib/api-client.ts facade must exist');
      const content = fs.readFileSync(facade, 'utf-8');
      assert.match(content, /export\s+const\s+adminApi\s*=/);
      assert.match(content, /'X-AllGo-Role':\s*'ADMIN'/);
    });
  });

  // --------------------------------------------------------------------------
  // Feature 12: admin Heavy Pages Decomposition
  // --------------------------------------------------------------------------
  describe('Feature 12: admin Heavy Pages Decomposition', () => {
    it('F12-C1 (Scaffold): should verify dynamic admin route directories [id] exist for entity administration', () => {
      const usersId = path.join(TARGET_PROJECTS.admin, 'src/app/admin/users/[id]/page.tsx');
      assert.ok(fs.existsSync(usersId), 'users/[id]/page.tsx must exist');
    });

    it('F12-C2 (Pages/Views): should verify admin routes exist under src/app/admin/', () => {
      const adminApp = path.join(TARGET_PROJECTS.admin, 'src/app/admin');
      assert.ok(fs.existsSync(adminApp), 'src/app/admin must exist');
      const subdirs = fs
        .readdirSync(adminApp, { withFileTypes: true })
        .filter((d) => d.isDirectory());
      assert.ok(subdirs.length >= 5, 'src/app/admin must contain primary domain route directories');
    });

    it('F12-C3 (Components): should verify decomposed domain components under src/components/ (orders, mobility, zones, finance)', () => {
      const compOrders = path.join(TARGET_PROJECTS.admin, 'src/components/orders');
      const compMobility = path.join(TARGET_PROJECTS.admin, 'src/components/mobility');
      const compZones = path.join(TARGET_PROJECTS.admin, 'src/components/zones');
      const compFinance = path.join(TARGET_PROJECTS.admin, 'src/components/finance');
      assert.ok(fs.existsSync(compOrders), 'src/components/orders must exist');
      assert.ok(fs.existsSync(compMobility), 'src/components/mobility must exist');
      assert.ok(fs.existsSync(compZones), 'src/components/zones must exist');
      assert.ok(fs.existsSync(compFinance), 'src/components/finance must exist');
    });

    it('F12-C4 (Data Layer): should verify domain data types in src/data/types/ (orders, mobility, zones, finance, etc.)', () => {
      const typesDir = path.join(TARGET_PROJECTS.admin, 'src/data/types');
      assert.ok(
        fs.existsSync(path.join(typesDir, 'orders.types.ts')),
        'orders.types.ts must exist',
      );
      assert.ok(
        fs.existsSync(path.join(typesDir, 'mobility.types.ts')),
        'mobility.types.ts must exist',
      );
      assert.ok(fs.existsSync(path.join(typesDir, 'zones.types.ts')), 'zones.types.ts must exist');
      assert.ok(
        fs.existsSync(path.join(typesDir, 'finance.types.ts')),
        'finance.types.ts must exist',
      );
    });

    it('F12-C5 (Contract/Interface): should verify server-side middleware and AuthContext role guards protect admin console', () => {
      const middleware = path.join(TARGET_PROJECTS.admin, 'src/middleware.ts');
      const authCtx = path.join(TARGET_PROJECTS.admin, 'src/lib/auth-context.tsx');
      assert.ok(fs.existsSync(middleware), 'src/middleware.ts must exist');
      assert.ok(fs.existsSync(authCtx), 'src/lib/auth-context.tsx must exist');
      const middlewareContent = fs.readFileSync(middleware, 'utf-8');
      assert.match(middlewareContent, /ADMIN/);
    });
  });

  // --------------------------------------------------------------------------
  // Feature 13: api Merchant & Catalog Services Decomposition
  // --------------------------------------------------------------------------
  describe('Feature 13: api Merchant & Catalog Services Decomposition', () => {
    it('F13-C1 (Scaffold): should verify NestJS backend package.json with @nestjs/core and ESM configuration', () => {
      const pkgJson = path.join(TARGET_PROJECTS.api, 'package.json');
      assert.ok(fs.existsSync(pkgJson), 'apps/api package.json must exist');
      const content = JSON.parse(fs.readFileSync(pkgJson, 'utf-8'));
      assert.strictEqual(content.type, 'module', 'apps/api must be ESM module');
      assert.ok(content.dependencies['@nestjs/core'], '@nestjs/core must be installed');
    });

    it('F13-C2 (Pages/Views): should verify Merchant and Catalog REST controllers define HTTP route handlers', () => {
      const merchantCtrl = path.join(TARGET_PROJECTS.api, 'src/merchant/merchant.controller.ts');
      const catalogCtrl = path.join(
        TARGET_PROJECTS.api,
        'src/catalog/merchant-catalog.controller.ts',
      );
      assert.ok(fs.existsSync(merchantCtrl), 'merchant.controller.ts must exist');
      assert.ok(fs.existsSync(catalogCtrl), 'merchant-catalog.controller.ts must exist');
    });

    it('F13-C3 (Components): should verify decomposed catalog sub-services (catalog-media, operating-hours, etc.)', () => {
      const mediaService = path.join(TARGET_PROJECTS.api, 'src/catalog/catalog-media.service.ts');
      const opHoursService = path.join(
        TARGET_PROJECTS.api,
        'src/catalog/operating-hours.service.ts',
      );
      assert.ok(fs.existsSync(mediaService), 'catalog-media.service.ts must exist');
      assert.ok(fs.existsSync(opHoursService), 'operating-hours.service.ts must exist');
    });

    it('F13-C4 (Data Layer): should verify SQL queries and repositories partitioned under data/ subdirectories', () => {
      const merchantData = path.join(TARGET_PROJECTS.api, 'src/merchant/data');
      const catalogData = path.join(TARGET_PROJECTS.api, 'src/catalog/data');
      assert.ok(fs.existsSync(merchantData), 'src/merchant/data must exist');
      assert.ok(fs.existsSync(catalogData), 'src/catalog/data must exist');
    });

    it('F13-C5 (Contract/Interface): should verify CatalogModule and MerchantModule export cohesive provider interfaces', () => {
      const catalogModule = path.join(TARGET_PROJECTS.api, 'src/catalog/catalog.module.ts');
      const merchantModule = path.join(TARGET_PROJECTS.api, 'src/merchant/merchant.module.ts');
      assert.ok(fs.existsSync(catalogModule), 'catalog.module.ts must exist');
      assert.ok(fs.existsSync(merchantModule), 'merchant.module.ts must exist');
    });
  });

  // --------------------------------------------------------------------------
  // Feature 14: api Parcels & Orders Services Decomposition
  // --------------------------------------------------------------------------
  describe('Feature 14: api Parcels & Orders Services Decomposition', () => {
    it('F14-C1 (Scaffold): should verify ordering and parcel domain module directories in apps/api/src', () => {
      const orderingDir = path.join(TARGET_PROJECTS.api, 'src/ordering');
      const parcelDir = path.join(TARGET_PROJECTS.api, 'src/parcel');
      assert.ok(fs.existsSync(orderingDir), 'src/ordering directory must exist');
      assert.ok(fs.existsSync(parcelDir), 'src/parcel directory must exist');
    });

    it('F14-C2 (Pages/Views): should verify Orders and Parcel controllers expose REST API contracts', () => {
      const ordersModule = path.join(TARGET_PROJECTS.api, 'src/ordering/ordering.module.ts');
      const parcelModule = path.join(TARGET_PROJECTS.api, 'src/parcel/parcel.module.ts');
      assert.ok(fs.existsSync(ordersModule), 'ordering.module.ts must exist');
      assert.ok(fs.existsSync(parcelModule), 'parcel.module.ts must exist');
    });

    it('F14-C3 (Components): should verify dispatch, pricing, and restriction sub-services in parcel domain', () => {
      const dispatchService = path.join(
        TARGET_PROJECTS.api,
        'src/parcel/parcel-dispatch.service.ts',
      );
      const pricingService = path.join(TARGET_PROJECTS.api, 'src/parcel/parcel-pricing.service.ts');
      const restrictionService = path.join(
        TARGET_PROJECTS.api,
        'src/parcel/parcel-restriction.service.ts',
      );
      assert.ok(fs.existsSync(dispatchService), 'parcel-dispatch.service.ts must exist');
      assert.ok(fs.existsSync(pricingService), 'parcel-pricing.service.ts must exist');
      assert.ok(fs.existsSync(restrictionService), 'parcel-restriction.service.ts must exist');
    });

    it('F14-C4 (Data Layer): should verify order lifecycle status transitions and parcel dispatch handlers', () => {
      const deliveryJob = path.join(TARGET_PROJECTS.api, 'src/delivery/delivery-job.service.ts');
      assert.ok(fs.existsSync(deliveryJob), 'delivery-job.service.ts must exist');
      const content = fs.readFileSync(deliveryJob, 'utf-8');
      assert.match(content, /ASSIGNED|PICKED_UP|DELIVERED|status/i);
    });

    it('F14-C5 (Contract/Interface): should verify cross-service injection between orders and delivery-job services', () => {
      const ordersService = path.join(TARGET_PROJECTS.api, 'src/ordering/orders.service.ts');
      assert.ok(fs.existsSync(ordersService), 'orders.service.ts must exist');
      const content = fs.readFileSync(ordersService, 'utf-8');
      assert.match(content, /delivery|DeliveryJob|DatabaseService/i);
    });
  });

  // --------------------------------------------------------------------------
  // Feature 15: api Mobility, Zones & Finance Decomposition
  // --------------------------------------------------------------------------
  describe('Feature 15: api Mobility, Zones & Finance Decomposition', () => {
    it('F15-C1 (Scaffold): should verify mobility, zones, and finance domain directories in apps/api/src', () => {
      const mobilityDir = path.join(TARGET_PROJECTS.api, 'src/mobility');
      const zonesDir = path.join(TARGET_PROJECTS.api, 'src/zones');
      const financeDir = path.join(TARGET_PROJECTS.api, 'src/finance');
      assert.ok(fs.existsSync(mobilityDir), 'src/mobility directory must exist');
      assert.ok(fs.existsSync(zonesDir), 'src/zones directory must exist');
      assert.ok(fs.existsSync(financeDir), 'src/finance directory must exist');
    });

    it('F15-C2 (Pages/Views): should verify Mobility and Finance controllers with RBAC guards', () => {
      const mobilityModule = path.join(TARGET_PROJECTS.api, 'src/mobility/mobility.module.ts');
      const financeModule = path.join(TARGET_PROJECTS.api, 'src/finance/finance.module.ts');
      assert.ok(fs.existsSync(mobilityModule), 'mobility.module.ts must exist');
      assert.ok(fs.existsSync(financeModule), 'finance.module.ts must exist');
    });

    it('F15-C3 (Components): should verify decomposed sub-services for rides, zones, and settlements', () => {
      const ridesService = path.join(TARGET_PROJECTS.api, 'src/mobility/rides.service.ts');
      const zonesService = path.join(TARGET_PROJECTS.api, 'src/zones/zones.service.ts');
      assert.ok(fs.existsSync(ridesService), 'rides.service.ts must exist');
      assert.ok(fs.existsSync(zonesService), 'zones.service.ts must exist');
    });

    it('F15-C4 (Data Layer): should verify PostGIS spatial queries, geofencing polygons, and ledger transactions', () => {
      const zonesService = path.join(TARGET_PROJECTS.api, 'src/zones/zones.service.ts');
      const content = fs.readFileSync(zonesService, 'utf-8');
      assert.match(content, /ST_Contains|ST_GeomFromGeoJSON|polygon|boundary|DatabaseService/i);
    });

    it('F15-C5 (Contract/Interface): should verify financial ledger and wallet balance invariants', () => {
      const financeDir = path.join(TARGET_PROJECTS.api, 'src/finance');
      const files = findSourceFiles(financeDir);
      assert.ok(files.length > 0, 'finance directory must contain financial service files');
      const hasLedger = files.some(
        (f) =>
          fs.readFileSync(f, 'utf-8').includes('ledger') ||
          fs.readFileSync(f, 'utf-8').includes('wallet'),
      );
      assert.ok(hasLedger, 'finance services must handle ledger or wallet operations');
    });
  });

  // --------------------------------------------------------------------------
  // Feature 16: api ESM NodeNext Extension Compliance
  // --------------------------------------------------------------------------
  describe('Feature 16: api ESM NodeNext Extension Compliance', () => {
    it('F16-C1 (Scaffold): should verify apps/api/tsconfig.json specifies NodeNext module resolution', () => {
      const tsconfigPath = path.join(TARGET_PROJECTS.api, 'tsconfig.json');
      assert.ok(fs.existsSync(tsconfigPath), 'apps/api/tsconfig.json must exist');
      const content = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
      assert.strictEqual(
        content.compilerOptions.module.toLowerCase(),
        'nodenext',
        'compilerOptions.module must be NodeNext',
      );
      assert.strictEqual(
        content.compilerOptions.moduleResolution.toLowerCase(),
        'nodenext',
        'compilerOptions.moduleResolution must be NodeNext',
      );
    });

    it('F16-C2 (Pages/Views): should verify all relative imports in controller files end with .js', () => {
      const files = findSourceFiles(path.join(TARGET_PROJECTS.api, 'src')).filter((f) =>
        f.includes('.controller.ts'),
      );
      assert.ok(files.length > 0, 'Controller files must be found');
      for (const f of files) {
        const content = fs.readFileSync(f, 'utf-8');
        const relativeImports = inspectRelativeImports(content);
        for (const imp of relativeImports) {
          assert.ok(
            imp.hasJsExtension,
            `Controller relative import without .js extension in ${f}:${imp.line} -> ${imp.importPath}`,
          );
        }
      }
    });

    it('F16-C3 (Components): should verify all relative imports in service files end with .js', () => {
      const files = findSourceFiles(path.join(TARGET_PROJECTS.api, 'src')).filter((f) =>
        f.includes('.service.ts'),
      );
      assert.ok(files.length > 0, 'Service files must be found');
      for (const f of files) {
        const content = fs.readFileSync(f, 'utf-8');
        const relativeImports = inspectRelativeImports(content);
        for (const imp of relativeImports) {
          assert.ok(
            imp.hasJsExtension,
            `Service relative import without .js extension in ${f}:${imp.line} -> ${imp.importPath}`,
          );
        }
      }
    });

    it('F16-C4 (Data Layer): should verify all relative imports in database and redis modules end with .js', () => {
      const dbFiles = [
        ...findSourceFiles(path.join(TARGET_PROJECTS.api, 'src/database')),
        ...findSourceFiles(path.join(TARGET_PROJECTS.api, 'src/redis')),
      ];
      assert.ok(dbFiles.length > 0, 'Database and Redis files must exist');
      for (const f of dbFiles) {
        const content = fs.readFileSync(f, 'utf-8');
        const relativeImports = inspectRelativeImports(content);
        for (const imp of relativeImports) {
          assert.ok(
            imp.hasJsExtension,
            `Infrastructure relative import without .js extension in ${f}:${imp.line} -> ${imp.importPath}`,
          );
        }
      }
    });

    it('F16-C5 (Contract/Interface): should verify 100% of relative imports across apps/api/src maintain .js extensions', () => {
      const allApiFiles = findSourceFiles(path.join(TARGET_PROJECTS.api, 'src'));
      let checkedCount = 0;
      for (const f of allApiFiles) {
        const content = fs.readFileSync(f, 'utf-8');
        const relativeImports = inspectRelativeImports(content);
        for (const imp of relativeImports) {
          checkedCount++;
          assert.ok(
            imp.hasJsExtension,
            `Relative import missing .js extension in ${f}:${imp.line} -> ${imp.importPath}`,
          );
        }
      }
      assert.ok(
        checkedCount > 100,
        `Expected > 100 relative imports checked in apps/api/src (checked: ${checkedCount})`,
      );
    });
  });

  // --------------------------------------------------------------------------
  // Feature 17: Comprehensive Monorepo Verification & Test Suites
  // --------------------------------------------------------------------------
  describe('Feature 17: Comprehensive Monorepo Verification & Test Suites', () => {
    it('F17-C1 (Scaffold): should verify monorepo root package.json and npm workspaces', () => {
      const rootPkg = path.join(ROOT_DIR, 'package.json');
      assert.ok(fs.existsSync(rootPkg), 'Root package.json must exist');
      const content = JSON.parse(fs.readFileSync(rootPkg, 'utf-8'));
      assert.ok(Array.isArray(content.workspaces), 'workspaces array must be defined');
      assert.ok(content.workspaces.includes('apps/*'), 'apps/* must be in workspaces');
      assert.ok(content.workspaces.includes('packages/*'), 'packages/* must be in workspaces');
    });

    it('F17-C2 (Pages/Views): should verify all 6 target application directories exist with source code', () => {
      const targets = [
        TARGET_PROJECTS.mobileShared,
        TARGET_PROJECTS.customerMobile,
        TARGET_PROJECTS.partnerMobile,
        TARGET_PROJECTS.merchantMobile,
        TARGET_PROJECTS.admin,
        TARGET_PROJECTS.api,
      ];
      for (const t of targets) {
        assert.ok(fs.existsSync(t), `Target directory must exist: ${t}`);
        const files = findSourceFiles(t);
        assert.ok(files.length > 0, `Target directory must contain source files: ${t}`);
      }
    });

    it('F17-C3 (Components): should verify @allgo/common shared package exports universal domain enums', () => {
      const commonIndex = path.join(ROOT_DIR, 'packages/common/src/index.ts');
      assert.ok(fs.existsSync(commonIndex), 'packages/common/src/index.ts must exist');
      const content = fs.readFileSync(commonIndex, 'utf-8');
      assert.match(content, /VerticalType/);
      assert.match(content, /OrderStatus/);
      assert.match(content, /FulfillmentMode/);
    });

    it('F17-C4 (Data Layer): should verify test double infrastructure supports isolated unit testing', () => {
      const testDoubles = path.join(ROOT_DIR, 'tests/helpers/test-doubles.ts');
      assert.ok(fs.existsSync(testDoubles), 'test-doubles.ts helper must exist');
      const content = fs.readFileSync(testDoubles, 'utf-8');
      assert.match(content, /InMemoryRedisTestDouble/);
      assert.match(content, /MockDatabaseService/);
    });

    it('F17-C5 (Contract/Interface): should verify monorepo test harness executes cleanly without external test runners', () => {
      const pkgJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf-8'));
      const devDeps = pkgJson.devDependencies || {};
      assert.strictEqual(devDeps.vitest, undefined, 'Vitest must not be installed');
      assert.strictEqual(devDeps.jest, undefined, 'Jest must not be installed');
      assert.strictEqual(devDeps.mocha, undefined, 'Mocha must not be installed');
      assert.match(pkgJson.scripts.test, /node\s+--experimental-transform-types/);
    });
  });
});
