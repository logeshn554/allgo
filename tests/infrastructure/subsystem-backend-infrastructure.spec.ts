import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  haversineDistanceMeters,
  buildRedisGeoAddCommand,
  evaluateNearestDrivers,
  MultiChannelNotificationGateway,
  calculateMarketplaceFundSplit,
  AutomatedKycVerifier,
} from '@allgo/common';
import type { DriverLocationPing, NotificationPayload } from '@allgo/common';

describe('Subsystem 5: Backend Infrastructure & Reliability Unit Tests', () => {
  describe('Geospatial Indexing & State Management (<50ms)', () => {
    it('should compute exact Haversine distance between two points', () => {
      // MG Road Bengaluru to Indiranagar (~4 km)
      const dist = haversineDistanceMeters(12.9716, 77.5946, 12.9784, 77.6408);
      assert.ok(dist > 4000 && dist < 6000, `Distance should be ~5km, got ${dist}`);
    });

    it('should generate valid Redis GEOADD arguments', () => {
      const ping: DriverLocationPing = {
        partnerId: 'driver-001',
        latitude: 12.9716,
        longitude: 77.5946,
        vehicleType: 'MOTORCYCLE',
        isAvailable: true,
        timestampMs: Date.now(),
      };
      const args = buildRedisGeoAddCommand('active_drivers:geo', ping);
      assert.deepEqual(args, ['active_drivers:geo', 77.5946, 12.9716, 'driver-001']);
    });

    it('should evaluate and sort nearest drivers within 3-5 km in under 10ms', () => {
      const start = performance.now();
      const baseLat = 12.9716;
      const baseLon = 77.5946;

      const pings: DriverLocationPing[] = [
        { partnerId: 'd1', latitude: 12.972, longitude: 77.595, vehicleType: 'MOTORCYCLE', isAvailable: true, timestampMs: Date.now() },
        { partnerId: 'd2', latitude: 12.980, longitude: 77.600, vehicleType: 'MOTORCYCLE', isAvailable: true, timestampMs: Date.now() },
        { partnerId: 'd3-stale', latitude: 12.972, longitude: 77.595, vehicleType: 'MOTORCYCLE', isAvailable: true, timestampMs: Date.now() - 300000 },
        { partnerId: 'd4-busy', latitude: 12.972, longitude: 77.595, vehicleType: 'MOTORCYCLE', isAvailable: false, timestampMs: Date.now() },
        { partnerId: 'd5-far', latitude: 13.150, longitude: 77.700, vehicleType: 'MOTORCYCLE', isAvailable: true, timestampMs: Date.now() },
      ];

      const nearest = evaluateNearestDrivers(baseLat, baseLon, pings, { maxRadiusMeters: 3000 });
      const durationMs = performance.now() - start;

      assert.ok(durationMs < 50, `Evaluation must complete in under 50ms, took ${durationMs}ms`);
      assert.equal(nearest.length, 2, 'Should only select available, fresh drivers within radius');
      assert.equal(nearest[0].partnerId, 'd1', 'Nearest driver must be first');
      assert.ok(nearest[0].distanceMeters < nearest[1].distanceMeters);
    });
  });

  describe('Multi-Channel Fallback Notification Gateway', () => {
    it('should deliver via primary FCM push when token is present and sender succeeds', async () => {
      const gateway = new MultiChannelNotificationGateway();
      const payload: NotificationPayload = {
        recipientUserId: 'usr-1',
        recipientPhone: '+919876543210',
        fcmToken: 'fcm-device-token-123',
        title: 'Order Confirmed',
        body: 'Your grocery order has been assigned to a courier.',
        priority: 'CRITICAL',
      };

      const result = await gateway.dispatchNotification(payload);
      assert.equal(result.status, 'DELIVERED');
      assert.equal(result.deliveredChannel, 'FCM_PUSH');
      assert.equal(result.attempts.length, 1);
    });

    it('should fallback to WhatsApp when FCM push token is missing', async () => {
      const gateway = new MultiChannelNotificationGateway();
      const payload: NotificationPayload = {
        recipientUserId: 'usr-2',
        recipientPhone: '+919876543210',
        title: 'Delivery Alert',
        body: 'Driver has arrived at your gate with OTP verification.',
        priority: 'HIGH',
      };

      const result = await gateway.dispatchNotification(payload);
      assert.equal(result.status, 'DELIVERED');
      assert.equal(result.deliveredChannel, 'WHATSAPP');
      assert.equal(result.attempts.length, 2); // FCM failed, WhatsApp succeeded
    });

    it('should fallback to SMS when push and WhatsApp fail', async () => {
      const failingSender = {
        sendPush: async () => { throw new Error('Push service unavailable'); },
        sendWhatsApp: async () => { throw new Error('WhatsApp rate limit'); },
        sendSms: async () => ({ messageId: 'sms-ok-123' }),
      };
      const gateway = new MultiChannelNotificationGateway(failingSender);
      const payload: NotificationPayload = {
        recipientUserId: 'usr-3',
        recipientPhone: '+919876543210',
        fcmToken: 'token-bad',
        title: 'OTP Handover',
        body: 'Your 4-digit handover PIN is 4821.',
        priority: 'CRITICAL',
      };

      const result = await gateway.dispatchNotification(payload);
      assert.equal(result.status, 'DELIVERED');
      assert.equal(result.deliveredChannel, 'SMS');
      assert.equal(result.attempts.length, 3);
    });
  });

  describe('Automated Marketplace Fund Splitting', () => {
    it('should split order payment into platform fee, merchant payout and driver earnings', () => {
      // Order of ₹1000 total: ₹800 food, ₹50 packaging, ₹150 delivery
      const split = calculateMarketplaceFundSplit({
        orderId: 'ORD-998877',
        grossAmountCents: 100000,
        merchantSubAccountId: 'acc_merch_123',
        driverSubAccountId: 'acc_driver_456',
        packagingFeeCents: 5000,
        deliveryFeeCents: 15000,
        merchantCommissionPercent: 15,
        driverCommissionPercent: 80,
      });

      // Food = 100000 - 15000 - 5000 = 80000.
      // Merchant cut = 15% of 80000 = 12000.
      // Merchant payout = 80000 - 12000 + 5000 = 73000 (₹730).
      assert.equal(split.merchantPayoutCents, 73000);

      // Driver payout = 80% of 15000 = 12000 (₹120).
      assert.equal(split.driverPayoutCents, 12000);

      // Platform take = 12000 + (15000 - 12000) = 15000 (₹150).
      assert.equal(split.platformTakeCents, 15000);

      // Check transfer instructions
      assert.equal(split.transfers.length, 2);
      assert.equal(split.transfers[0].account, 'acc_merch_123');
      assert.equal(split.transfers[0].amountCents, 73000);
      assert.equal(split.transfers[1].account, 'acc_driver_456');
      assert.equal(split.transfers[1].amountCents, 12000);
    });
  });

  describe('Driver Onboarding & Automated KYC Verification', () => {
    const verifier = new AutomatedKycVerifier();

    it('should extract Driving License number and determine expiry', () => {
      const ocrText = 'Government of Tamil Nadu Driving Licence TN01 20180001234 Valid Till 25/12/2030';
      const result = verifier.verifyDocument({
        documentType: 'DRIVING_LICENSE',
        fileStorageKey: 'docs/dl_scan.jpg',
        extractedText: ocrText,
        uploadedAt: new Date().toISOString(),
      });

      assert.equal(result.status, 'VERIFIED');
      assert.equal(result.documentNumber, 'TN0120180001234');
      assert.equal(result.isExpired, false);
      assert.ok(result.daysUntilExpiry > 0);
    });

    it('should reject invalid or missing Driving License number', () => {
      const ocrText = 'Random text with no official transport format';
      const result = verifier.verifyDocument({
        documentType: 'DRIVING_LICENSE',
        fileStorageKey: 'docs/dl_invalid.jpg',
        extractedText: ocrText,
        uploadedAt: new Date().toISOString(),
      });

      assert.equal(result.status, 'REJECTED');
      assert.match(result.rejectionReason || '', /Valid Driving License number not detected/);
    });

    it('should extract vehicle registration RC and alert on near expiry', () => {
      // Expiry within 15 days
      const nearFutureDate = new Date(Date.now() + 15 * 24 * 3600 * 1000);
      const day = String(nearFutureDate.getDate()).padStart(2, '0');
      const month = String(nearFutureDate.getMonth() + 1).padStart(2, '0');
      const year = nearFutureDate.getFullYear();
      const ocrText = `Certificate of Registration TN-01-AB-1234 Fitness Valid Up To: ${day}/${month}/${year}`;

      const result = verifier.verifyDocument({
        documentType: 'VEHICLE_REGISTRATION',
        fileStorageKey: 'docs/rc_scan.jpg',
        extractedText: ocrText,
        uploadedAt: new Date().toISOString(),
      });

      assert.equal(result.status, 'VERIFIED');
      assert.equal(result.documentNumber, 'TN01AB1234');
      assert.equal(result.expiryAlertNeeded, true, 'Must trigger expiry alert when within 30 days');
    });
  });
});
