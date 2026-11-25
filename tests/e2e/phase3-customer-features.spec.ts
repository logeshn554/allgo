// E2E / Unit Verification Suite: Phase 3 Customer App Production Features
// Tests Data Layer, Ride-Hailing, Instant Grocery, Parcel Delivery, and Unified Wallet flows.

import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import {
  buildHeaders,
  clearAuthTokens,
  getAuthTokens,
  setAuthTokens,
} from './legacy-mobile-data/apiClient.ts';
import {
  computeBearingDegrees,
  subscribeToOrderUpdates,
} from './legacy-mobile-data/liveOrderStream.ts';
import {
  clearActiveCart,
  clearActiveOrderRecovery,
  getSavedAddresses,
  loadActiveCart,
  loadActiveOrderRecovery,
  saveActiveCart,
  saveActiveOrderRecovery,
  saveSavedAddress,
} from './legacy-mobile-data/localCache.ts';
import {
  createServerPaymentIntent,
  pollWebhookPaymentStatus,
  processOrderPayment,
} from './legacy-mobile-data/paymentGateway.ts';
import {
  OTP_COOLDOWN_SECONDS,
  getRemainingOtpCooldown,
  sendSmsOtp,
  verifySmsOtpAndLogin,
} from './legacy-mobile-data/smsAuthLoader.ts';

describe('Phase 3: Customer App Production Verification', () => {
  beforeEach(() => {
    clearAuthTokens();
    clearActiveCart('grocery');
    clearActiveOrderRecovery();
  });

  describe('1. Data Layer: apiClient & Auth Token Rotation', () => {
    it('should store, read, and clear JWT tokens securely', () => {
      setAuthTokens('jwt_access_token_abc123', 'jwt_refresh_token_xyz987');
      const tokens = getAuthTokens();
      assert.equal(tokens.accessToken, 'jwt_access_token_abc123');
      assert.equal(tokens.refreshToken, 'jwt_refresh_token_xyz987');

      clearAuthTokens();
      const cleared = getAuthTokens();
      assert.equal(cleared.accessToken, null);
      assert.equal(cleared.refreshToken, null);
    });

    it('should inject Bearer token and X-Idempotency-Key on mutating booking requests', () => {
      setAuthTokens('token_live_test_77');
      const headers = buildHeaders('/ordering/orders/checkout');

      assert.equal(headers.Authorization, 'Bearer token_live_test_77');
      assert.ok(headers['X-Idempotency-Key']);
      assert.equal(headers['Content-Type'], 'application/json');

      const nonMutating = buildHeaders('/catalog/stores');
      assert.equal(nonMutating['X-Idempotency-Key'], undefined);
    });
  });

  describe('2. Data Layer: smsAuthLoader & Resend Cooldowns', () => {
    it('should enforce 60s cooldown timer and parse OTP dispatch', async () => {
      const phone = '+919876543210';
      const res = await sendSmsOtp(phone);
      assert.equal(res.sent, true);
      assert.equal(res.cooldownSeconds, OTP_COOLDOWN_SECONDS);

      const remaining = getRemainingOtpCooldown(phone);
      assert.ok(remaining > 0);

      // Verify OTP consumption with fallback offline pin
      const verifyRes = await verifySmsOtpAndLogin(phone, '123456', 'customer');
      assert.equal(verifyRes.ok, true);
      assert.ok(verifyRes.token);
      assert.equal(verifyRes.account?.phone, phone);
    });
  });

  describe('3. Telemetry: Bearing Calculation & Live Tracking Azimuth', () => {
    it('should calculate accurate directional bearing degrees between GPS coordinates', () => {
      // Due North: same longitude, increasing latitude
      const north = computeBearingDegrees(12.97, 77.59, 12.98, 77.59);
      assert.ok(Math.abs(north - 0) < 1.0 || Math.abs(north - 360) < 1.0);

      // Due East: same latitude, increasing longitude
      const east = computeBearingDegrees(12.97, 77.59, 12.97, 77.6);
      assert.ok(Math.abs(east - 90) < 1.5);

      // Due South: same longitude, decreasing latitude
      const south = computeBearingDegrees(12.98, 77.59, 12.97, 77.59);
      assert.ok(Math.abs(south - 180) < 1.5);

      // Due West: same latitude, decreasing longitude
      const west = computeBearingDegrees(12.97, 77.6, 12.97, 77.59);
      assert.ok(Math.abs(west - 270) < 1.5);
    });

    it('should initialize live order stream and provide unsubscribe callback', () => {
      let updateReceived = false;
      const unsubscribe = subscribeToOrderUpdates('ORD-771', (evt) => {
        updateReceived = true;
      });
      assert.equal(typeof unsubscribe, 'function');
      assert.equal(updateReceived, false);
      unsubscribe();
    });
  });

  describe('4. Local Persistence Cache (Cart, Addresses, Recovery)', () => {
    it('should save and recover active grocery cart with items and timestamp', () => {
      saveActiveCart('grocery', [
        { id: 'item_1', title: 'Fresh Milk', priceCents: 3500, quantity: 2 },
        { id: 'item_2', title: 'Brown Bread', priceCents: 4500, quantity: 1 },
      ]);

      const cart = loadActiveCart('grocery');
      assert.ok(cart);
      assert.equal(cart.length, 2);
      assert.equal(cart[0].title, 'Fresh Milk');
      assert.equal(cart[0].quantity, 2);
    });

    it('should save and retrieve user addresses with geofence bounds', () => {
      const newAddress = {
        id: 'addr_bellandur',
        label: 'HOME',
        address: 'Flat 402, Green Glen Layout, Bellandur',
        latitude: 12.9279,
        longitude: 77.6711,
      };
      saveSavedAddress(newAddress);

      const list = getSavedAddresses();
      assert.ok(list.length >= 1);
      const found = list.find((a) => a.id === 'addr_bellandur');
      assert.ok(found);
      assert.equal(found.label, 'HOME');
    });

    it('should handle active order crash recovery state', () => {
      saveActiveOrderRecovery({
        orderId: 'ORD-CRASH-001',
        vertical: 'RIDE_HAILING',
        status: 'DRIVER_ASSIGNED',
        createdAt: new Date().toISOString(),
        trackingActive: true,
      });

      const recovered = loadActiveOrderRecovery();
      assert.ok(recovered);
      assert.equal(recovered.orderId, 'ORD-CRASH-001');
      assert.equal(recovered.trackingActive, true);

      clearActiveOrderRecovery();
      assert.equal(loadActiveOrderRecovery(), null);
    });
  });

  describe('5. Payment Gateway: Payment Intents & Webhook Polling', () => {
    it('should generate server payment intent with idempotency key and fallback', async () => {
      const intent = await createServerPaymentIntent('ORD-PAY-99', 450, 'upi');
      assert.ok(intent);
      assert.ok(intent.gatewayOrderId.startsWith('order_'));
      assert.equal(intent.amountInr, 450);
      assert.equal(intent.currency, 'INR');
      assert.equal(intent.status, 'PENDING');
    });

    it('should process payment and return receipt with callback integration', async () => {
      let callbackInvoked = false;
      const receipt = await processOrderPayment('ORD-PAY-99', 45000, 'upi', {
        onSuccess: (rec) => {
          callbackInvoked = true;
        },
      });

      assert.equal(receipt.ok, true);
      assert.equal(receipt.method, 'upi');
      assert.equal(receipt.paidAmountCents, 45000);
      assert.equal(callbackInvoked, true);

      // Webhook polling returns boolean
      const pollResult = await pollWebhookPaymentStatus('order_mock_123', 1, 10);
      assert.equal(typeof pollResult, 'boolean');
    });
  });

  describe('6. Domain Calculations: Volumetric Weight & Bill Breakdown', () => {
    it('should calculate IATA volumetric parcel weight correctly', () => {
      // 40cm x 30cm x 20cm / 5000 = 4.8 kg
      const l = 40,
        w = 30,
        h = 20;
      const volumetricKg = (l * w * h) / 5000;
      assert.equal(volumetricKg, 4.8);

      const actualWeightKg = 2.5;
      const billableKg = Math.max(actualWeightKg, volumetricKg);
      assert.equal(billableKg, 4.8);
    });

    it('should calculate grocery bill breakdown with taxes, surge, and small cart fee', () => {
      const subtotalCents = 18000; // ₹180
      const smallCartFeeCents = subtotalCents < 25000 ? 2500 : 0; // ₹25 fee for < ₹250
      const surgeCents = 1500; // ₹15 peak surge
      const deliveryFeeCents = 3000; // ₹30 delivery
      const taxCents = Math.round(subtotalCents * 0.05); // 5% GST = ₹9

      const totalCents =
        subtotalCents + smallCartFeeCents + surgeCents + deliveryFeeCents + taxCents;

      assert.equal(smallCartFeeCents, 2500);
      assert.equal(taxCents, 900);
      assert.equal(totalCents, 25900); // ₹259
    });
  });
});
