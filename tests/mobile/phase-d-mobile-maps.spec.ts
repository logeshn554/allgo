import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

describe('Phase D: Mobile Maps, Location & Offline Architecture Audits', () => {
  const rootDir = path.resolve(import.meta.dirname, '../../');

  it('customer_mobile should have google_maps_flutter, geolocator, and Maps API key metadata', () => {
    const pubspec = fs.readFileSync(
      path.join(rootDir, 'apps/customer_mobile/pubspec.yaml'),
      'utf-8',
    );
    assert.match(pubspec, /google_maps_flutter:\s*\^2\.6\.0/);
    assert.match(pubspec, /geolocator:\s*\^11\.0\.0/);

    const manifest = fs.readFileSync(
      path.join(rootDir, 'apps/customer_mobile/android/app/src/main/AndroidManifest.xml'),
      'utf-8',
    );
    assert.match(manifest, /com\.google\.android\.geo\.API_KEY/);
    assert.match(manifest, /in\.allgo\.customer/);

    const plist = fs.readFileSync(
      path.join(rootDir, 'apps/customer_mobile/ios/Runner/Info.plist'),
      'utf-8',
    );
    assert.match(plist, /GoogleMapsApiKey/);
  });

  it('partner_mobile should have google_maps_flutter, geolocator, flutter_background_service and foreground mode', () => {
    const pubspec = fs.readFileSync(
      path.join(rootDir, 'apps/partner_mobile/pubspec.yaml'),
      'utf-8',
    );
    assert.match(pubspec, /google_maps_flutter:\s*\^2\.6\.0/);
    assert.match(pubspec, /geolocator:\s*\^11\.0\.0/);
    assert.match(pubspec, /flutter_background_service:\s*\^5\.0\.5/);

    const manifest = fs.readFileSync(
      path.join(rootDir, 'apps/partner_mobile/android/app/src/main/AndroidManifest.xml'),
      'utf-8',
    );
    assert.match(manifest, /FOREGROUND_SERVICE_LOCATION/);
    assert.match(manifest, /com\.google\.android\.geo\.API_KEY/);
    assert.match(manifest, /in\.allgo\.partner/);

    const plist = fs.readFileSync(
      path.join(rootDir, 'apps/partner_mobile/ios/Runner/Info.plist'),
      'utf-8',
    );
    assert.match(plist, /UIBackgroundModes/);
    assert.match(plist, /<string>location<\/string>/);
    assert.match(plist, /GoogleMapsApiKey/);
  });

  it('partner ProofOfDeliveryModal should use real storage ticket and upload binary, without _simulatedPhotoKey', () => {
    const podModal = fs.readFileSync(
      path.join(rootDir, 'apps/partner_mobile/lib/src/components/proof_of_delivery_modal.dart'),
      'utf-8',
    );
    assert.strictEqual(
      podModal.includes('_simulatedPhotoKey'),
      false,
      'Must eliminate _simulatedPhotoKey',
    );
    assert.match(podModal, /createUploadTicket/, 'Must acquire real storage ticket');
    assert.match(podModal, /uploadDocumentBinary/, 'Must stream photo bytes');
    assert.match(podModal, /_uploadedStorageKey/, 'Must pass real storage key');
  });

  it('customer order detail screen should eliminate CustomerOrderDetail.dummy and load real order state', () => {
    const orderDetailScreen = fs.readFileSync(
      path.join(rootDir, 'apps/customer_mobile/lib/src/screens/order_detail_screen.dart'),
      'utf-8',
    );
    assert.strictEqual(orderDetailScreen.includes('CustomerOrderDetail.dummy'), false);
    assert.match(orderDetailScreen, /getCustomerOrderDetail/, 'Must fetch real order from API');

    const modelFile = fs.readFileSync(
      path.join(rootDir, 'packages/mobile_shared/lib/src/models/customer_order.dart'),
      'utf-8',
    );
    assert.strictEqual(modelFile.includes('factory CustomerOrderDetail.dummy'), false);
  });

  it('customer delivery tracking screen should eliminate mock coordinates and use live telemetry sync', () => {
    const trackingScreen = fs.readFileSync(
      path.join(rootDir, 'apps/customer_mobile/lib/src/screens/delivery_tracking_screen.dart'),
      'utf-8',
    );
    assert.strictEqual(trackingScreen.includes('_mockDriverLat'), false);
    assert.strictEqual(trackingScreen.includes('_mockDriverLng'), false);
    assert.match(
      trackingScreen,
      /syncMissedDeliveryEvents/,
      'Must use sync endpoint for missed telemetry',
    );
    assert.match(trackingScreen, /liveLocation/, 'Must consume real liveLocation stream');
  });

  it('packages/mobile_shared should export persistent OfflineActionQueue', () => {
    const offlineQueue = fs.readFileSync(
      path.join(rootDir, 'packages/mobile_shared/lib/src/storage/offline_action_queue.dart'),
      'utf-8',
    );
    assert.match(offlineQueue, /class OfflineActionQueue/);
    assert.match(offlineQueue, /enqueue/);
    assert.match(offlineQueue, /flushQueue/);
    assert.match(offlineQueue, /FlutterSecureStorage/);
  });
});
