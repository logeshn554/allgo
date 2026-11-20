import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { ConfigService } from '../../apps/api/dist/config/config.service.js';
import { GeoDispatchEngine } from '../../apps/api/dist/services/geoDispatch.js';
import { PricingEngine } from '../../apps/api/dist/services/pricingEngine.js';
import { PaymentWebhookService } from '../../apps/api/dist/services/paymentWebhook.js';
import { MockDatabaseService, InMemoryRedisTestDouble } from '../helpers/test-doubles.ts';

describe('Phase 2: Redis Geospatial Dispatch & Zero-Trust Pricing/Webhooks', () => {
  let mockDb: MockDatabaseService;
  let mockRedis: InMemoryRedisTestDouble;
  let configService: ConfigService;
  let dispatchEngine: GeoDispatchEngine;
  let pricingEngine: PricingEngine;
  let paymentService: PaymentWebhookService;

  const outletLat = 13.0827; // Chennai Central
  const outletLon = 80.2707;

  beforeEach(() => {
    mockDb = new MockDatabaseService();
    mockRedis = new InMemoryRedisTestDouble();
    configService = new ConfigService();

    dispatchEngine = new GeoDispatchEngine(mockRedis as any);
    pricingEngine = new PricingEngine(mockDb as any, configService);
    paymentService = new PaymentWebhookService(mockDb as any, mockRedis as any, configService);

    // Seed mock catalog items
    mockDb.items.set('item_milk_1l', { id: 'item_milk_1l', price_inr: 60, is_available: true });
    mockDb.items.set('item_bread', { id: 'item_bread', price_inr: 45, is_available: true });
    mockDb.items.set('item_eggs_6pk', { id: 'item_eggs_6pk', price_inr: 50, is_available: true });
  });

  describe('3. Redis Geospatial Dispatch Engine', () => {
    it('should ingest driver telemetry with GEOADD and set 30s TTL heartbeat', async () => {
      const driverId = 'drv_geo_101';
      await dispatchEngine.ingestDriverTelemetry(
        {
          driverId,
          vertical: 'INSTANT_GROCERY',
          latitude: outletLat + 0.005, // ~550m away
          longitude: outletLon + 0.005,
        },
        { vehicleType: 'MOTORCYCLE', currentCodFloatInr: 200, maxCodLimitInr: 1500 }
      );

      const heartbeat = await mockRedis.get(`driver:heartbeat:${driverId}`);
      assert.strictEqual(heartbeat, 'online');

      const profileStr = await mockRedis.get(`driver:profile:${driverId}`);
      assert.ok(profileStr);
      const profile = JSON.parse(profileStr);
      assert.strictEqual(profile.vehicleType, 'MOTORCYCLE');
      assert.strictEqual(profile.currentCodFloatInr, 200);
    });

    it('should perform wave-based radial search and enforce 15s driver offer lock', async () => {
      const driverNear = 'drv_wave_near'; // ~800m away (in 1.5km ring)
      const driverFar = 'drv_wave_far';   // ~2.5km away (in 3km ring)

      await dispatchEngine.ingestDriverTelemetry(
        { driverId: driverNear, vertical: 'INSTANT_GROCERY', latitude: outletLat + 0.007, longitude: outletLon + 0.007 },
        { vehicleType: 'MOTORCYCLE', currentCodFloatInr: 100 }
      );
      await dispatchEngine.ingestDriverTelemetry(
        { driverId: driverFar, vertical: 'INSTANT_GROCERY', latitude: outletLat + 0.02, longitude: outletLon + 0.02 },
        { vehicleType: 'MOTORCYCLE', currentCodFloatInr: 100 }
      );

      const orderId = 'ord_wave_01';
      const offer = await dispatchEngine.dispatchWave(orderId, 'INSTANT_GROCERY', outletLat, outletLon);
      assert.ok(offer);
      assert.strictEqual(offer.driverId, driverNear);
      assert.strictEqual(offer.radiusRingMeters, 1500);

      // Verify 15s offer lock prevents other orders from claiming driver
      const lockVal = await mockRedis.get(`driver:lock:${driverNear}`);
      assert.strictEqual(lockVal, orderId);

      const secondOrderOffer = await dispatchEngine.dispatchWave('ord_wave_02', 'INSTANT_GROCERY', outletLat, outletLon);
      assert.ok(secondOrderOffer);
      assert.strictEqual(secondOrderOffer.driverId, driverFar); // driverNear is locked, skipped to driverFar!
    });

    it('should filter by vehicle capability, CoD float limits and reject previous rejecters', async () => {
      const sedanDriver = 'drv_sedan_01';
      const highCodDriver = 'drv_high_cod';

      await dispatchEngine.ingestDriverTelemetry(
        { driverId: sedanDriver, vertical: 'RIDE_HAILING', latitude: outletLat + 0.004, longitude: outletLon + 0.004 },
        { vehicleType: 'SEDAN', currentCodFloatInr: 0, maxCodLimitInr: 1500 }
      );
      await dispatchEngine.ingestDriverTelemetry(
        { driverId: highCodDriver, vertical: 'RIDE_HAILING', latitude: outletLat + 0.003, longitude: outletLon + 0.003 },
        { vehicleType: 'MOTORCYCLE', currentCodFloatInr: 1400, maxCodLimitInr: 1500 }
      );

      const orderId = 'ord_filter_01';

      // 1. CoD float filter test: ₹300 order exceeds max float (1400 + 300 > 1500)
      const codOffer = await dispatchEngine.dispatchWave(orderId, 'RIDE_HAILING', outletLat, outletLon, {
        isCod: true,
        codAmountInr: 300,
        requiredVehicleType: 'MOTORCYCLE',
      });
      assert.strictEqual(codOffer, null); // highCodDriver exceeded float, skipped!

      // 2. Vehicle capability filter test
      const sedanOffer = await dispatchEngine.dispatchWave(orderId, 'RIDE_HAILING', outletLat, outletLon, {
        requiredVehicleType: 'SEDAN',
      });
      assert.ok(sedanOffer);
      assert.strictEqual(sedanOffer.driverId, sedanDriver);

      // 3. Driver rejects offer -> test preventing re-pinging
      await dispatchEngine.recordDriverRejection(orderId, sedanDriver, 'Too far away');
      const retryOffer = await dispatchEngine.dispatchWave(orderId, 'RIDE_HAILING', outletLat, outletLon, {
        requiredVehicleType: 'SEDAN',
      });
      assert.strictEqual(retryOffer, null); // Driver previously rejected order, skipped!
    });
  });

  describe('4. Zero-Trust Pricing Engine & Payment Webhooks', () => {
    it('should compute ride fare with signed 5-minute TTL fare_quote_id and detect tampering', () => {
      const quote = pricingEngine.calculateRideFareQuote({
        distanceKm: 8.5,
        durationMinutes: 22,
        vehicleType: 'MOTORCYCLE',
        surgeMultiplier: 1.2,
      });

      assert.strictEqual(quote.vertical, 'RIDE_HAILING');
      assert.ok(quote.totalFareInr > 100);
      assert.ok(quote.signature);

      // Valid quote signature passes
      const isValid = pricingEngine.verifyRideFareQuote(quote, 'MOTORCYCLE');
      assert.strictEqual(isValid, true);

      // Client tampering with fare is detected
      const tampered = { ...quote, totalFareInr: 25 };
      const isTamperedValid = pricingEngine.verifyRideFareQuote(tampered, 'MOTORCYCLE');
      assert.strictEqual(isTamperedValid, false);
    });

    it('should compute grocery cart with authoritative DB prices, small-cart fee and GST split', async () => {
      // 1 milk (₹60) + 1 bread (₹45) = ₹105 (< ₹150 -> applies ₹20 small-cart fee)
      const breakdown = await pricingEngine.calculateGroceryCartTotals({
        outletId: 'out_001',
        items: [
          { itemId: 'item_milk_1l', quantity: 1 },
          { itemId: 'item_bread', quantity: 1 },
        ],
        distanceKm: 3.5,
      });

      assert.strictEqual(breakdown.itemTotalInr, 105);
      assert.strictEqual(breakdown.packagingFeeInr, 10);
      assert.strictEqual(breakdown.platformFeeInr, 3);
      assert.ok(breakdown.deliveryFeeInr > 25);
      assert.ok(breakdown.finalTotalInr > 150);
    });

    it('should calculate parcel volumetric weight using (L*W*H)/5000 formula', () => {
      // Package: 40cm x 30cm x 25cm, actual weight 3kg
      // Volumetric = (40*30*25)/5000 = 6.0 kg > 3.0 kg actual -> chargeable = 6.0 kg
      const parcelPricing = pricingEngine.calculateParcelFare({
        lengthCm: 40,
        widthCm: 30,
        heightCm: 25,
        actualWeightKg: 3.0,
        distanceKm: 5.0,
      });

      assert.strictEqual(parcelPricing.volumetricWeightKg, 6.0);
      assert.strictEqual(parcelPricing.chargeableWeightKg, 6.0);
      assert.strictEqual(parcelPricing.baseFareInr, 40);
      assert.ok(parcelPricing.taxGstInr > 0);
      assert.ok(parcelPricing.totalFareInr > 100);
    });

    it('should atomically reserve inventory and handle Razorpay HMAC-SHA256 webhook idempotently', async () => {
      const orderId = 'ord_pay_001';
      const cartId = 'cart_999';
      const idemKey = 'idem_token_abc123';

      // 1. Create payment order with atomic inventory lock
      const paymentOrder = await paymentService.createPaymentOrder({
        orderId,
        cartId,
        customerId: 'usr_cust_001',
        amountInr: 350,
        paymentMethod: 'UPI',
        idempotencyKey: idemKey,
      });
      assert.strictEqual(paymentOrder.isDuplicate, false);
      assert.strictEqual(paymentOrder.amountInr, 350);

      // Verify cart inventory lock acquired
      const lockVal = await mockRedis.get(`inventory:lock:cart:${cartId}`);
      assert.strictEqual(lockVal, orderId);

      // 2. Duplicate payment order request returns cached response (idempotent)
      const duplicateOrder = await paymentService.createPaymentOrder({
        orderId,
        cartId,
        customerId: 'usr_cust_001',
        amountInr: 350,
        paymentMethod: 'UPI',
        idempotencyKey: idemKey,
      });
      assert.strictEqual(duplicateOrder.isDuplicate, true);

      // 3. Process Razorpay Webhook with HMAC-SHA256 signature
      const webhookSecret = 'default_rzp_webhook_secret_key_123';
      const webhookPayload = JSON.stringify({
        event: 'payment.captured',
        id: 'evt_pay_success_123',
        payload: {
          payment: {
            entity: {
              id: 'pay_rzp_987',
              order_id: paymentOrder.gatewayOrderId,
              amount: 35000,
              status: 'captured',
              notes: { cartId },
            },
          },
        },
      });

      const validSignature = crypto.createHmac('sha256', webhookSecret).update(webhookPayload).digest('hex');

      // Invalid signature is rejected
      assert.strictEqual(paymentService.verifyWebhookSignature(webhookPayload, 'invalid_sig', webhookSecret), false);

      // Valid signature processes and releases inventory lock
      const webhookResult = await paymentService.handleWebhook(
        webhookPayload,
        validSignature,
        JSON.parse(webhookPayload),
        webhookSecret
      );
      assert.strictEqual(webhookResult.status, 'SUCCESS');

      // Verify cart inventory lock is released upon payment success
      const lockAfterPayment = await mockRedis.get(`inventory:lock:cart:${cartId}`);
      assert.strictEqual(lockAfterPayment, null);
    });
  });
});
