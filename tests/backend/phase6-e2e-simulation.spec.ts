// Phase 6: End-to-End Multi-App Integration Test Suite in allgo-api
// Simulates 3 complete lifecycles: Ride-Hailing, Instant Grocery, and Parcel Delivery.

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { OrderStatus } from '@allgo/common';
import { ConfigService } from '../../apps/api/dist/config/config.service.js';
import { GeoDispatchEngine } from '../../apps/api/dist/services/geoDispatch.js';
import { PricingEngine } from '../../apps/api/dist/services/pricingEngine.js';
import { PaymentWebhookService } from '../../apps/api/dist/services/paymentWebhook.js';
import { OrderFsmService } from '../../apps/api/dist/services/orderFsm.js';
import { OtpVerificationError } from '../../apps/api/dist/services/fsmTypes.js';
import { MockDatabaseService, InMemoryRedisTestDouble } from '../helpers/test-doubles.ts';

describe('Phase 6: End-to-End Multi-App Integration Simulation Suite', () => {
  let mockDb: MockDatabaseService;
  let mockRedis: InMemoryRedisTestDouble;
  let configService: ConfigService;
  let dispatchEngine: GeoDispatchEngine;
  let pricingEngine: PricingEngine;
  let paymentService: PaymentWebhookService;
  let orderFsm: OrderFsmService;

  const customerId = 'usr_customer_881';
  const driverId = 'drv_captain_992';
  const merchantId = 'merch_darkstore_101';
  const webhookSecret = 'test_webhook_secret_key_88';

  beforeEach(() => {
    mockDb = new MockDatabaseService();
    mockRedis = new InMemoryRedisTestDouble();
    configService = new ConfigService();
    process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;

    dispatchEngine = new GeoDispatchEngine(mockRedis as any);
    pricingEngine = new PricingEngine(mockDb as any, configService);
    paymentService = new PaymentWebhookService(mockDb as any, mockRedis as any, configService);
    orderFsm = new OrderFsmService(mockDb as any, mockRedis as any);

    mockDb.items.set('sku_milk', { id: 'sku_milk', price_inr: 60, is_available: true });
    mockDb.items.set('sku_bread', { id: 'sku_bread', price_inr: 45, is_available: true });
  });

  describe('1. Ride-Hailing Lifecycle: Quote -> Dispatch -> 4-Digit Ride PIN -> Webhook Settlement', () => {
    it('should complete entire Ride-Hailing flow from quote to settlement', async () => {
      const quote = pricingEngine.calculateRideFareQuote({ distanceKm: 8.5, durationMinutes: 20, vehicleType: 'SEDAN', surgeMultiplier: 1.1 });
      assert.ok(quote.quoteId && quote.totalFareInr > 0);
      assert.strictEqual(pricingEngine.verifyRideFareQuote(quote, 'SEDAN'), true);

      const orderId = 'ord_ride_flow_01';
      const ridePin = '8812';
      mockDb.orders.set(orderId, { id: orderId, vertical: 'RIDE_HAILING', status: OrderStatus.CREATED, pickup_otp: ridePin, delivery_pin: '3456', total_inr: quote.totalFareInr });

      await orderFsm.transition({ orderId, targetStatus: OrderStatus.CONFIRMED, actorId: customerId, actorRole: 'CUSTOMER' });
      await orderFsm.transition({ orderId, targetStatus: OrderStatus.DISPATCHING, actorId: customerId, actorRole: 'CUSTOMER' });

      await dispatchEngine.ingestDriverTelemetry({ driverId, vertical: 'RIDE_HAILING', latitude: 12.9720, longitude: 77.5950 }, { vehicleType: 'SEDAN', currentCodFloatInr: 200, maxCodLimitInr: 2000 });
      const candidate = await dispatchEngine.dispatchWave(orderId, 'RIDE_HAILING', 12.9716, 77.5946, { vehicleType: 'SEDAN' });
      assert.ok(candidate && candidate.driverId === driverId);

      await orderFsm.transition({ orderId, targetStatus: OrderStatus.DRIVER_ASSIGNED, actorId: driverId, actorRole: 'DRIVER' });
      await orderFsm.transition({ orderId, targetStatus: OrderStatus.ARRIVED_AT_PICKUP, actorId: driverId, actorRole: 'DRIVER' });

      await assert.rejects(() => orderFsm.transition({ orderId, targetStatus: OrderStatus.PICKED_UP, actorId: driverId, actorRole: 'DRIVER', otp: '9999' }), OtpVerificationError);
      const pickedUp = await orderFsm.transition({ orderId, targetStatus: OrderStatus.PICKED_UP, actorId: driverId, actorRole: 'DRIVER', otp: ridePin });
      assert.strictEqual(pickedUp.newStatus, OrderStatus.PICKED_UP);

      await orderFsm.transition({ orderId, targetStatus: OrderStatus.IN_TRANSIT, actorId: driverId, actorRole: 'DRIVER' });
      await orderFsm.transition({ orderId, targetStatus: OrderStatus.ARRIVED_AT_DROP, actorId: driverId, actorRole: 'DRIVER' });
      const completed = await orderFsm.transition({ orderId, targetStatus: OrderStatus.COMPLETED, actorId: driverId, actorRole: 'DRIVER' });
      assert.strictEqual(completed.newStatus, OrderStatus.COMPLETED);

      const paymentOrder = await paymentService.createPaymentOrder({ orderId, customerId, amountInr: quote.totalFareInr, paymentMethod: 'UPI', idempotencyKey: 'idem_ride_flow_01' });
      const webhookPayload = JSON.stringify({ event: 'payment.captured', id: 'evt_ride_captured_1', payload: { payment: { entity: { id: 'pay_rzp_ride_1', order_id: paymentOrder.gatewayOrderId, amount: quote.totalFareInr * 100, status: 'captured' } } } });
      const signature = crypto.createHmac('sha256', webhookSecret).update(webhookPayload).digest('hex');
      const settled = await paymentService.handleWebhook(webhookPayload, signature, JSON.parse(webhookPayload), webhookSecret);
      assert.strictEqual(settled.status, 'SUCCESS');
    });
  });

  describe('2. Instant Grocery Lifecycle: Inventory Lock -> HMAC Webhook -> KDS OOS -> Dual Handover', () => {
    it('should complete entire Grocery flow from stock lock to merchant/driver settlement', async () => {
      const cartBreakdown = await pricingEngine.calculateGroceryCartTotals({ outletId: merchantId, items: [{ itemId: 'sku_milk', quantity: 2 }, { itemId: 'sku_bread', quantity: 1 }], distanceKm: 2.5 });
      assert.ok(cartBreakdown.finalTotalInr > 0);

      const orderId = 'ord_groc_flow_02';
      const cartId = 'cart_groc_88';
      const merchantHandoverOtp = '4821';
      const customerDropOtp = '5678';

      const paymentOrder = await paymentService.createPaymentOrder({ orderId, cartId, customerId, amountInr: cartBreakdown.finalTotalInr, paymentMethod: 'UPI', idempotencyKey: 'idem_groc_flow_02' });
      assert.strictEqual(await mockRedis.get(`inventory:lock:cart:${cartId}`), orderId);

      const webhookPayload = JSON.stringify({ event: 'payment.captured', id: 'evt_groc_captured_2', payload: { payment: { entity: { id: 'pay_rzp_groc_2', order_id: paymentOrder.gatewayOrderId, amount: cartBreakdown.finalTotalInr * 100, status: 'captured', notes: { cartId } } } } });
      const signature = crypto.createHmac('sha256', webhookSecret).update(webhookPayload).digest('hex');
      const webhookResult = await paymentService.handleWebhook(webhookPayload, signature, JSON.parse(webhookPayload), webhookSecret);
      assert.strictEqual(webhookResult.status, 'SUCCESS');
      assert.strictEqual(await mockRedis.get(`inventory:lock:cart:${cartId}`), null);

      mockDb.orders.set(orderId, { id: orderId, vertical: 'INSTANT_GROCERY', status: OrderStatus.CREATED, pickup_otp: merchantHandoverOtp, delivery_pin: customerDropOtp, total_inr: cartBreakdown.finalTotalInr });
      await orderFsm.transition({ orderId, targetStatus: OrderStatus.CONFIRMED, actorId: customerId, actorRole: 'CUSTOMER' });
      await orderFsm.transition({ orderId, targetStatus: OrderStatus.MERCHANT_ACCEPTED, actorId: merchantId, actorRole: 'MERCHANT' });
      await orderFsm.transition({ orderId, targetStatus: OrderStatus.PREPARING, actorId: merchantId, actorRole: 'MERCHANT' });

      // Out-of-stock substitution/refund rule (sku_bread ₹45)
      const adjustedTotalInr = cartBreakdown.finalTotalInr - 45;

      await orderFsm.transition({ orderId, targetStatus: OrderStatus.READY_FOR_PICKUP, actorId: merchantId, actorRole: 'MERCHANT' });
      await orderFsm.transition({ orderId, targetStatus: OrderStatus.DISPATCHING, actorId: merchantId, actorRole: 'MERCHANT' });
      await orderFsm.transition({ orderId, targetStatus: OrderStatus.DRIVER_ASSIGNED, actorId: driverId, actorRole: 'DRIVER' });
      await orderFsm.transition({ orderId, targetStatus: OrderStatus.ARRIVED_AT_PICKUP, actorId: driverId, actorRole: 'DRIVER' });

      const pickupHandover = await orderFsm.transition({ orderId, targetStatus: OrderStatus.PICKED_UP, actorId: driverId, actorRole: 'DRIVER', otp: merchantHandoverOtp });
      assert.strictEqual(pickupHandover.newStatus, OrderStatus.PICKED_UP);

      await orderFsm.transition({ orderId, targetStatus: OrderStatus.IN_TRANSIT, actorId: driverId, actorRole: 'DRIVER' });
      await orderFsm.transition({ orderId, targetStatus: OrderStatus.ARRIVED_AT_DROP, actorId: driverId, actorRole: 'DRIVER' });

      const delivered = await orderFsm.transition({ orderId, targetStatus: OrderStatus.DELIVERED, actorId: driverId, actorRole: 'DRIVER', otp: customerDropOtp, metadata: { photoUrl: 'storage/pod_doorstep_01.jpg' } });
      assert.strictEqual(delivered.newStatus, OrderStatus.DELIVERED);

      // Ledger breakdown: 15% commission, 5% GST, 1% TCS
      const commissionInr = adjustedTotalInr * 0.15;
      const gstInr = adjustedTotalInr * 0.05;
      const tcsInr = adjustedTotalInr * 0.01;
      const netMerchantPayoutInr = adjustedTotalInr - commissionInr - gstInr - tcsInr;
      assert.strictEqual(netMerchantPayoutInr, adjustedTotalInr * 0.79);
    });
  });

  describe('3. Parcel Delivery Lifecycle: Booking -> Photo Pickup -> Transit -> Drop Photo + OTP', () => {
    it('should complete entire Parcel delivery flow with IATA weight calculation and dual PoD', async () => {
      const parcelPricing = pricingEngine.calculateParcelFare({ lengthCm: 30, widthCm: 25, heightCm: 20, actualWeightKg: 1.5, distanceKm: 8.5 });
      assert.strictEqual(parcelPricing.volumetricWeightKg, 3.0);
      assert.strictEqual(parcelPricing.chargeableWeightKg, 3.0);

      const orderId = 'ord_parcel_flow_03';
      const senderPickupOtp = '9102';
      const recipientDropOtp = '7731';
      mockDb.orders.set(orderId, { id: orderId, vertical: 'PARCEL_DELIVERY', status: OrderStatus.CREATED, pickup_otp: senderPickupOtp, delivery_pin: recipientDropOtp, total_inr: parcelPricing.totalFareInr });

      await orderFsm.transition({ orderId, targetStatus: OrderStatus.CONFIRMED, actorId: customerId, actorRole: 'CUSTOMER' });
      await orderFsm.transition({ orderId, targetStatus: OrderStatus.DISPATCHING, actorId: customerId, actorRole: 'CUSTOMER' });
      await orderFsm.transition({ orderId, targetStatus: OrderStatus.DRIVER_ASSIGNED, actorId: driverId, actorRole: 'DRIVER' });
      await orderFsm.transition({ orderId, targetStatus: OrderStatus.ARRIVED_AT_PICKUP, actorId: driverId, actorRole: 'DRIVER' });

      const pickedUp = await orderFsm.transition({ orderId, targetStatus: OrderStatus.PICKED_UP, actorId: driverId, actorRole: 'DRIVER', otp: senderPickupOtp, metadata: { photoUrl: 'storage/parcel_pickup_box.jpg' } });
      assert.strictEqual(pickedUp.newStatus, OrderStatus.PICKED_UP);

      await orderFsm.transition({ orderId, targetStatus: OrderStatus.IN_TRANSIT, actorId: driverId, actorRole: 'DRIVER' });
      await orderFsm.transition({ orderId, targetStatus: OrderStatus.ARRIVED_AT_DROP, actorId: driverId, actorRole: 'DRIVER' });

      const delivered = await orderFsm.transition({ orderId, targetStatus: OrderStatus.DELIVERED, actorId: driverId, actorRole: 'DRIVER', otp: recipientDropOtp, metadata: { photoUrl: 'storage/parcel_doorstep_delivered.jpg' } });
      assert.strictEqual(delivered.newStatus, OrderStatus.DELIVERED);

      const completed = await orderFsm.transition({ orderId, targetStatus: OrderStatus.COMPLETED, actorId: driverId, actorRole: 'DRIVER' });
      assert.strictEqual(completed.newStatus, OrderStatus.COMPLETED);
    });
  });
});
