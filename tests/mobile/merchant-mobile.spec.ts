import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const ROOT_DIR = path.resolve(import.meta.dirname, '../../');
const MERCHANT_APP_DIR = path.join(ROOT_DIR, 'apps/merchant_mobile');
const SHARED_PKG_DIR = path.join(ROOT_DIR, 'packages/mobile_shared');

describe('Phase 2 Mobile: Native Merchant Application Architecture & Swiggy/Zomato Flow', () => {
  describe('Application Identity & Standalone Configuration', () => {
    it('should have in.allgo.merchant in AndroidManifest and build.gradle', () => {
      const manifestPath = path.join(MERCHANT_APP_DIR, 'android/app/src/main/AndroidManifest.xml');
      const gradlePath = path.join(MERCHANT_APP_DIR, 'android/app/build.gradle');

      assert.ok(fs.existsSync(manifestPath));
      assert.ok(fs.existsSync(gradlePath));

      const manifest = fs.readFileSync(manifestPath, 'utf-8');
      const gradle = fs.readFileSync(gradlePath, 'utf-8');

      assert.match(manifest, /package="in\.allgo\.merchant"/);
      assert.match(gradle, /applicationId "in\.allgo\.merchant"/);
      assert.match(gradle, /namespace "in\.allgo\.merchant"/);
    });

    it('should configure X-AllGo-Role header dynamically in ApiClient', () => {
      const clientPath = path.join(SHARED_PKG_DIR, 'lib/src/api/api_client.dart');
      assert.ok(fs.existsSync(clientPath));
      const content = fs.readFileSync(clientPath, 'utf-8');

      assert.match(content, /'X-AllGo-Role': activeRole/);
    });

    it('should set activeRole to MERCHANT_ADMIN upon merchant authentication', () => {
      const splashPath = path.join(MERCHANT_APP_DIR, 'lib/src/screens/splash_screen.dart');
      const otpPath = path.join(MERCHANT_APP_DIR, 'lib/src/screens/otp_verify_screen.dart');

      assert.ok(fs.existsSync(splashPath));
      assert.ok(fs.existsSync(otpPath));

      const splashContent = fs.readFileSync(splashPath, 'utf-8');
      const otpContent = fs.readFileSync(otpPath, 'utf-8');

      assert.match(splashContent, /client\.activeRole = 'MERCHANT_ADMIN'/);
      assert.match(otpContent, /client\.activeRole = 'MERCHANT_ADMIN'/);
    });
  });

  describe('7-Step Onboarding Wizard (apps/merchant_mobile/lib/src/screens/merchant_registration_screen.dart)', () => {
    const regScreenPath = path.join(
      MERCHANT_APP_DIR,
      'lib/src/screens/merchant_registration_screen.dart',
    );

    it('should implement all 7 progressive onboarding steps', () => {
      assert.ok(fs.existsSync(regScreenPath));
      const content = fs.readFileSync(regScreenPath, 'utf-8');

      assert.match(content, /Step 1: Owner Details/i);
      assert.match(content, /Step 2: Business Information/i);
      assert.match(content, /Step 3: Outlet Location/i);
      assert.match(content, /Step 4: Compliance & Regulatory/i);
      assert.match(content, /Step 5: Bank Settlements/i);
      assert.match(content, /Step 6: Store Operations/i);
      assert.match(content, /Step 7: Review & Final Submission/i);
    });

    it('should collect statutory compliance: PAN, FSSAI, GSTIN, and Bank IFSC', () => {
      const content = fs.readFileSync(regScreenPath, 'utf-8');

      assert.match(content, /Business \/ Proprietor PAN/i);
      assert.match(content, /FSSAI License/i);
      assert.match(content, /GSTIN/i);
      assert.match(content, /Bank IFSC Code/i);
      assert.match(content, /Bank Account Number/i);
      assert.match(content, /Beneficiary Name/i);
    });

    it('should wire form submission to client.registerMerchant', () => {
      const content = fs.readFileSync(regScreenPath, 'utf-8');

      assert.match(content, /client\.registerMerchant/);
      assert.match(content, /ApprovalStatusScreen/);
    });
  });

  describe('Approval Status & Operational Gating (apps/merchant_mobile/lib/src/screens/approval_status_screen.dart)', () => {
    const approvalPath = path.join(MERCHANT_APP_DIR, 'lib/src/screens/approval_status_screen.dart');

    it('should handle all compliance approval states', () => {
      assert.ok(fs.existsSync(approvalPath));
      const content = fs.readFileSync(approvalPath, 'utf-8');

      assert.match(content, /APPROVED/);
      assert.match(content, /LIVE/);
      assert.match(content, /DOCUMENTS_REQUIRED/);
      assert.match(content, /REJECTED/);
      assert.match(content, /SUSPENDED/);
      assert.match(content, /SUBMITTED/);
      assert.match(content, /UNDER_REVIEW/);
    });

    it('should gate store access until status is APPROVED', () => {
      const content = fs.readFileSync(approvalPath, 'utf-8');

      assert.match(content, /MerchantDashboardShell/);
      assert.match(content, /Orders Disabled: Outlets cannot accept live customer orders/i);
    });
  });

  describe('Production Dashboard Shell (apps/merchant_mobile/lib/src/screens/merchant_dashboard_shell.dart)', () => {
    const dashPath = path.join(MERCHANT_APP_DIR, 'lib/src/screens/merchant_dashboard_shell.dart');

    it('should implement 5 operational tabs matching Swiggy/Zomato partner apps', () => {
      assert.ok(fs.existsSync(dashPath));
      const content = fs.readFileSync(dashPath, 'utf-8');

      assert.match(content, /BottomNavigationBarItem\(icon: Icon\(Icons\.dashboard_outlined\)/);
      assert.match(content, /BottomNavigationBarItem\(icon: Icon\(Icons\.receipt_long_outlined\)/);
      assert.match(content, /BottomNavigationBarItem\(icon: Icon\(Icons\.restaurant_menu\)/);
      assert.match(
        content,
        /BottomNavigationBarItem\(icon: Icon\(Icons\.account_balance_wallet_outlined\)/,
      );
      assert.match(content, /BottomNavigationBarItem\(icon: Icon\(Icons\.storefront_outlined\)/);
    });

    it('should provide store open/closed toggle switch and prep time control', () => {
      const content = fs.readFileSync(dashPath, 'utf-8');

      assert.match(content, /STORE IS OPEN/i);
      assert.match(content, /STORE IS CLOSED/i);
      assert.match(content, /_handleToggleOutlet/);
      assert.match(content, /client\.updateOutletStatus/);
    });

    it('should manage live order queues with Swiggy/Zomato status progression', () => {
      const content = fs.readFileSync(dashPath, 'utf-8');

      assert.match(content, /New Orders/i);
      assert.match(content, /Preparing/i);
      assert.match(content, /Ready/i);
      assert.match(content, /History/i);
      assert.match(content, /_handleAcceptOrder/);
      assert.match(content, /_handleRejectOrder/);
      assert.match(content, /_handleUpdateOrderStatus/);
      assert.match(content, /client\.updateOrderStatus/);
    });

    it('should support menu catalog management and instant stock toggle', () => {
      const content = fs.readFileSync(dashPath, 'utf-8');

      assert.match(content, /client\.updateMerchantInventory/);
      assert.match(content, /_showAddProductModal/);
      assert.match(content, /client\.createMerchantProduct/);
    });

    it('should display financial earnings with gross sales, platform commissions, and net payout', () => {
      const content = fs.readFileSync(dashPath, 'utf-8');

      assert.match(content, /client\.getMerchantEarnings/);
      assert.match(content, /Total Net Earnings/i);
      assert.match(content, /Platform Commission \(15%\)/i);
      assert.match(content, /Gross Delivered Food/i);
    });

    it('should bind real profile data without hardcoded values in merchant profile screen', () => {
      const profilePath = path.join(
        MERCHANT_APP_DIR,
        'lib/src/screens/merchant_profile_screen.dart',
      );
      assert.ok(fs.existsSync(profilePath));
      const content = fs.readFileSync(profilePath, 'utf-8');

      assert.match(content, /client\.getMerchantProfile/);
      assert.match(content, /merchant\?\['business_name'\]/);
      assert.match(content, /merchant\?\['fssai_license_number'\]/);
      assert.match(content, /merchant\?\['pan_number'\]/);
      assert.match(content, /outlet\?\['address_line1'\]/);
      assert.match(content, /merchant\?\['commission_rate_percentage'\]/);
    });
  });

  describe('Shared Mobile Package Domain Models & API Client Contracts', () => {
    it('should export all typed merchant models from mobile_shared', () => {
      const exportPath = path.join(SHARED_PKG_DIR, 'lib/allgo_mobile_shared.dart');
      assert.ok(fs.existsSync(exportPath));
      const content = fs.readFileSync(exportPath, 'utf-8');

      assert.match(content, /merchant_profile\.dart/);
      assert.match(content, /merchant_order\.dart/);
      assert.match(content, /product_item\.dart/);
      assert.match(content, /merchant_dashboard_data\.dart/);
    });

    it('should define MerchantProfile with statutory compliance and outlet status', () => {
      const modelPath = path.join(SHARED_PKG_DIR, 'lib/src/models/merchant_profile.dart');
      assert.ok(fs.existsSync(modelPath));
      const content = fs.readFileSync(modelPath, 'utf-8');

      assert.match(content, /class MerchantProfile/);
      assert.match(content, /final String panNumber/);
      assert.match(content, /final String\? fssaiLicenseNumber/);
      assert.match(content, /final String\? gstin/);
      assert.match(content, /final bool isOpen/);
      assert.match(content, /final int defaultPrepTimeMinutes/);
    });

    it('should define MerchantOrder with customer contact and order items', () => {
      const modelPath = path.join(SHARED_PKG_DIR, 'lib/src/models/merchant_order.dart');
      assert.ok(fs.existsSync(modelPath));
      const content = fs.readFileSync(modelPath, 'utf-8');

      assert.match(content, /class MerchantOrder/);
      assert.match(content, /class MerchantOrderItem/);
      assert.match(content, /final String subOrderNumber/);
      assert.match(content, /final String status/);
      assert.match(content, /final double itemsTotalInr/);
      assert.match(content, /final List<MerchantOrderItem> items/);
    });

    it('should define ProductItem with stock levels and veg/non-veg flag', () => {
      const modelPath = path.join(SHARED_PKG_DIR, 'lib/src/models/product_item.dart');
      assert.ok(fs.existsSync(modelPath));
      const content = fs.readFileSync(modelPath, 'utf-8');

      assert.match(content, /class ProductItem/);
      assert.match(content, /final String name/);
      assert.match(content, /final double basePriceInr/);
      assert.match(content, /final bool isVeg/);
      assert.match(content, /final bool isInStock/);
      assert.match(content, /final int stockQuantity/);
    });

    it('should provide full typed merchant suite in ApiClient', () => {
      const clientPath = path.join(SHARED_PKG_DIR, 'lib/src/api/api_client.dart');
      const content = fs.readFileSync(clientPath, 'utf-8');

      assert.match(content, /registerMerchant\(/);
      assert.match(content, /getMerchantProfile\(/);
      assert.match(content, /updateOutletStatus\(/);
      assert.match(content, /createMerchantOutlet\(/);
      assert.match(content, /getMerchantOutlets\(/);
      assert.match(content, /submitMerchantDocument\(/);
      assert.match(content, /getMerchantOrders\(/);
      assert.match(content, /updateOrderStatus\(/);
      assert.match(content, /getMerchantProducts\(/);
      assert.match(content, /createMerchantProduct\(/);
      assert.match(content, /updateMerchantInventory\(/);
      assert.match(content, /getMerchantEarnings\(/);
    });
  });

  describe('Multi-Outlet Branch Management (apps/merchant_mobile/lib/src/screens/)', () => {
    it('should implement OutletManagementScreen listing outlets and branch status', () => {
      const screenPath = path.join(
        MERCHANT_APP_DIR,
        'lib/src/screens/outlet_management_screen.dart',
      );
      assert.ok(fs.existsSync(screenPath));
      const content = fs.readFileSync(screenPath, 'utf-8');

      assert.match(content, /class OutletManagementScreen/);
      assert.match(content, /getMerchantOutlets/);
      assert.match(content, /PENDING_APPROVAL/);
      assert.match(content, /CreateOutletScreen/);
    });

    it('should implement CreateOutletScreen creating secondary branch outlets in PENDING_APPROVAL', () => {
      const screenPath = path.join(MERCHANT_APP_DIR, 'lib/src/screens/create_outlet_screen.dart');
      assert.ok(fs.existsSync(screenPath));
      const content = fs.readFileSync(screenPath, 'utf-8');

      assert.match(content, /class CreateOutletScreen/);
      assert.match(content, /createMerchantOutlet/);
      assert.match(content, /PENDING_APPROVAL/);
      assert.match(content, /_outletNameController/);
    });
  });
});
