import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const ROOT = path.resolve(import.meta.dirname, '..', '..');

function mustExist(relPath: string) {
  const full = path.join(ROOT, relPath);
  assert.ok(fs.existsSync(full), `Expected file to exist: ${relPath}`);
  return fs.readFileSync(full, 'utf8');
}

describe('Super-App Missing Features Parity Verification', () => {
  it('implements real GPS, OTP dialogs, camera PoD, and navigation in partner_mobile', () => {
    const home = mustExist('apps/partner_mobile/lib/src/pages/partner_home_page.dart');
    assert.match(home, /Geolocator\./);
    assert.doesNotMatch(home, /13\.0827|80\.2707/);

    const duty = mustExist('apps/partner_mobile/lib/src/components/partner_duty_tab_content.dart');
    assert.match(duty, /OtpVerificationDialog\.show/);
    assert.doesNotMatch(duty, /'1234'|'5678'|completedJobsCount:\s*8/);

    const pod = mustExist('apps/partner_mobile/lib/src/components/proof_of_delivery_modal.dart');
    assert.match(pod, /ImagePicker\(\)/);
    assert.doesNotMatch(pod, /POD_CAPTURE_/);

    mustExist('apps/partner_mobile/lib/src/components/otp_verification_dialog.dart');
    mustExist('apps/partner_mobile/lib/src/utils/partner_navigation_helper.dart');
  });

  it('implements Socket.IO realtime service, Express Rides, Food & Quick Mart, and Substitutions', () => {
    mustExist('packages/mobile_shared/lib/src/realtime/realtime_socket_service.dart');
    mustExist('apps/customer_mobile/lib/src/screens/food_home_screen.dart');
    mustExist('apps/customer_mobile/lib/src/screens/quick_mart_screen.dart');
    mustExist('apps/customer_mobile/lib/src/components/ride_completion_rating_sheet.dart');
    mustExist('apps/customer_mobile/lib/src/components/substitution_decision_sheet.dart');
    mustExist('apps/merchant_mobile/lib/src/components/propose_substitution_modal.dart');
    mustExist('apps/merchant_mobile/lib/src/screens/merchant_product_editor_screen.dart');
    mustExist('apps/merchant_mobile/lib/src/screens/merchant_csv_import_screen.dart');

    const ordersCtrl = mustExist('services/api/src/ordering/controllers/orders.controller.ts');
    assert.match(ordersCtrl, /@Get\(':id\/invoice'\)/);

    const rateScreen = mustExist('apps/customer_mobile/lib/src/screens/rate_review_screen.dart');
    assert.match(rateScreen, /submitRating/);
  });

  it('implements functional Next.js portals for customer-web, merchant-web, and admin depth', () => {
    for (const rel of [
      'apps/customer-web/lib/api.ts',
      'apps/customer-web/app/login/page.tsx',
      'apps/customer-web/app/page.tsx',
      'apps/customer-web/app/store/[outletId]/page.tsx',
      'apps/customer-web/app/checkout/page.tsx',
      'apps/customer-web/app/orders/page.tsx',
      'apps/customer-web/app/orders/[id]/page.tsx',
      'apps/customer-web/app/rides/page.tsx',
      'apps/merchant-web/lib/api.ts',
      'apps/merchant-web/app/login/page.tsx',
      'apps/merchant-web/app/page.tsx',
      'apps/merchant-web/app/catalog/page.tsx',
      'apps/merchant-web/app/hours/page.tsx',
      'apps/merchant-web/app/finance/page.tsx',
      'apps/admin/app/(admin)/admin/analytics/page.tsx',
      'apps/admin/app/(admin)/admin/promos/page.tsx',
      'apps/admin/components/dispatch/LiveFleetRadarPanel.tsx',
    ]) {
      mustExist(rel);
    }
  });

  it('removes hardcoded stubs and wires live endpoints across partner, merchant, and customer apps', () => {
    const sos = mustExist('apps/partner_mobile/lib/src/screens/partner_emergency_sos_screen.dart');
    assert.doesNotMatch(sos, /Suresh Kumar|9876543219|Future\.delayed/);
    assert.match(sos, /triggerRideSos|createSupportTicket/);

    const partnerProfile = mustExist(
      'apps/partner_mobile/lib/src/screens/partner_profile_screen.dart',
    );
    assert.doesNotMatch(partnerProfile, /4\.92 \(180\+ trips\)|₹420\.00/);
    assert.match(partnerProfile, /getPartnerProfile|getPartnerCodStatus/);
    mustExist('apps/partner_mobile/lib/src/screens/partner_trip_history_screen.dart');

    const vehicleEdit = mustExist(
      'apps/partner_mobile/lib/src/screens/partner_vehicle_edit_screen.dart',
    );
    assert.doesNotMatch(vehicleEdit, /0x25, 0x50, 0x44/);
    assert.match(vehicleEdit, /ImagePicker/);

    const bankEdit = mustExist('apps/partner_mobile/lib/src/screens/partner_bank_edit_screen.dart');
    assert.doesNotMatch(bankEdit, /50100401234567|Future\.delayed/);
    assert.match(bankEdit, /ImagePicker/);

    const merchantFin = mustExist(
      'apps/merchant_mobile/lib/src/components/merchant_financials_tab.dart',
    );
    assert.doesNotMatch(merchantFin, /14250\.0/);
    assert.match(merchantFin, /totalGrossSalesInr/);

    const merchantBranding = mustExist(
      'apps/merchant_mobile/lib/src/screens/store_branding_media_screen.dart',
    );
    assert.doesNotMatch(merchantBranding, /images\.unsplash\.com/);
    assert.match(merchantBranding, /ImagePicker/);

    const merchantShell = mustExist(
      'apps/merchant_mobile/lib/src/screens/merchant_dashboard_shell.dart',
    );
    assert.match(merchantShell, /MerchantIncomingOrderAlertModal/);
    assert.match(merchantShell, /merchantVerifyHandoverOtp/);
    assert.match(merchantShell, /createOutletCategory/);

    const custOrders = mustExist(
      'apps/customer_mobile/lib/src/components/customer_orders_tab.dart',
    );
    assert.match(custOrders, /_activeStatuses/);

    const custOffers = mustExist('apps/customer_mobile/lib/src/screens/offers_coupons_screen.dart');
    assert.doesNotMatch(custOffers, /WELCOME50|FEAST100/);
    assert.match(custOffers, /listEligiblePromotions/);

    const custExplore = mustExist(
      'apps/customer_mobile/lib/src/components/customer_explore_tab.dart',
    );
    assert.doesNotMatch(custExplore, /images\.unsplash\.com/);

    const custChat = mustExist('apps/customer_mobile/lib/src/screens/chat_with_driver_screen.dart');
    assert.doesNotMatch(custChat, /BACKEND-NEEDED/);
    assert.match(custChat, /order:chat_message/);
  });
});
