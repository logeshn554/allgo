import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createMaskedCallSession,
  getChatMessages,
  sendChatMessage,
} from './legacy-mobile-data/communicationMasking.ts';
import {
  calculateDynamicEta,
  generateRoutePolyline,
} from './legacy-mobile-data/dynamicEtaService.ts';
import {
  getActiveAddress,
  reverseGeocode,
  saveAddress,
} from './legacy-mobile-data/geocodingService.ts';
import {
  cancelOrderWithinGracePeriod,
  getOrderGracePeriodStatus,
  recordOrderCreatedAt,
} from './legacy-mobile-data/orderModificationService.ts';
import { loadOrderById, saveNewOrder } from './legacy-mobile-data/orderStorage.ts';
import { verifyDeliveryPin } from './legacy-mobile-data/otpVerifier.ts';
import {
  calculatePaymentSplit,
  creditWallet,
  debitWallet,
  loadWalletState,
} from './legacy-mobile-data/walletStorage.ts';

describe('Subsystem 1: Customer-Facing Gaps Unit Tests', () => {
  describe('Geocoding & Structured Address Management', () => {
    it('should save and retrieve multi-tier structured address', () => {
      const saved = saveAddress({
        streetAddress: '100ft Road, Indiranagar',
        apartmentFloor: 'Tower C, Flat 901',
        landmark: 'Near Metro Station',
        gateInstructions: 'Ring bell twice',
        latitude: 12.9784,
        longitude: 77.6408,
        tag: 'Home',
      });

      assert.ok(saved.id.startsWith('addr_'));
      assert.equal(saved.tag, 'Home');
      assert.equal(saved.apartmentFloor, 'Tower C, Flat 901');
      assert.match(saved.formattedAddress, /Tower C, Flat 901/);
      assert.match(saved.formattedAddress, /100ft Road/);

      const active = getActiveAddress();
      assert.equal(active.id, saved.id);
    });

    it('should perform reverse geocoding fallback for given coordinates', async () => {
      const res = await reverseGeocode(12.978, 77.641);
      assert.ok(res.street.length > 0);
      assert.equal(res.city, 'Bengaluru');
      assert.equal(res.postalCode, '560001');
    });
  });

  describe('Real-Time Telematics & Dynamic ETA', () => {
    it('should calculate dynamic ETA countdown and route progress', () => {
      const driver = { latitude: 12.975, longitude: 77.6 };
      const dest = { latitude: 12.9716, longitude: 77.5946 };
      const eta = calculateDynamicEta(driver, dest, 2000, 1.2);

      assert.ok(eta.remainingMeters > 0);
      assert.ok(eta.remainingSeconds > 0);
      assert.ok(eta.routeProgressPercent >= 0 && eta.routeProgressPercent <= 100);
      assert.equal(eta.trafficLevel, 'MODERATE');
      assert.ok(eta.estimatedArrivalTimestamp.length > 0);
    });

    it('should generate multi-step route polyline between origin and destination', () => {
      const origin = { latitude: 12.9716, longitude: 77.5946 };
      const dest = { latitude: 12.98, longitude: 77.64 };
      const polyline = generateRoutePolyline(origin, dest, 6);

      assert.equal(polyline.length, 7);
      assert.equal(polyline[0].latitude, origin.latitude);
      assert.equal(polyline[polyline.length - 1].longitude, dest.longitude);
    });
  });

  describe('Delivery Verification (Two-Factor Handover)', () => {
    it('should generate 4-digit verification PIN and verify on delivery handover', () => {
      const order = saveNewOrder([], 50000);
      assert.equal(order.otpPin.length, 4, 'Must be a 4-digit verification PIN');
      assert.match(order.otpPin, /^[0-9]{4}$/);

      // Incorrect PIN fails
      const bad = verifyDeliveryPin(order.id, '0000');
      assert.equal(bad.ok, false);

      // Correct 4-digit PIN verifies handover
      const good = verifyDeliveryPin(order.id, order.otpPin);
      assert.equal(good.ok, true);
      assert.equal(good.message, 'Delivery verified!');

      const updated = loadOrderById(order.id);
      assert.equal(updated?.status, 'delivered');
    });
  });

  describe('Digital Wallet & Payment Splitting', () => {
    it('should credit and debit closed-loop wallet balance', () => {
      const initial = loadWalletState();
      const initialBal = initial.balanceCents;

      creditWallet(10000, 'Refund test', 'ORD-1');
      const afterCredit = loadWalletState();
      assert.equal(afterCredit.balanceCents, initialBal + 10000);

      const debitRes = debitWallet(5000, 'Order payment', 'ORD-2');
      assert.equal(debitRes.success, true);
      assert.equal(debitRes.state.balanceCents, initialBal + 5000);
    });

    it('should calculate multi-tender split between wallet and UPI/card', () => {
      // Total ₹500 (50000 cents)
      const split = calculatePaymentSplit(50000, true, 'upi');
      assert.equal(split.useWallet, true);
      assert.ok(split.walletDeductionCents > 0);
      assert.equal(split.walletDeductionCents + split.remainderCents, 50000);
      assert.equal(split.secondaryMethod, 'upi');
    });
  });

  describe('In-App Communication Masking', () => {
    it('should create masked VoIP calling session with virtual numbers', () => {
      const session = createMaskedCallSession('ORD-77', 'cust-1', 'driver-1');
      assert.ok(session.customerVirtualNumber.startsWith('+91'));
      assert.ok(session.driverVirtualNumber.startsWith('+91'));
      assert.equal(session.status, 'ACTIVE');
      assert.equal(session.provider, 'TWILIO_VOICE');
    });

    it('should handle ephemeral in-app chat between customer and driver', () => {
      const initial = getChatMessages('ORD-88');
      assert.ok(initial.length >= 2);

      const sent = sendChatMessage('ORD-88', 'customer', 'Gate code is 9988');
      assert.equal(sent.sender, 'customer');
      assert.equal(sent.text, 'Gate code is 9988');

      const messages = getChatMessages('ORD-88');
      assert.ok(messages.some((m) => m.text === 'Gate code is 9988'));
    });
  });

  describe('Order Modifications & Cancellation Windows (60-120s)', () => {
    it('should allow penalty-free cancellation and credit 100% refund within grace period', () => {
      const order = saveNewOrder([], 35000);
      const status = getOrderGracePeriodStatus(order.id, 90);
      assert.equal(status.isWithinGracePeriod, true);
      assert.equal(status.canCancelWithoutPenalty, true);

      const initialWallet = loadWalletState().balanceCents;
      const cancelRes = cancelOrderWithinGracePeriod(order.id);
      assert.equal(cancelRes.success, true);
      assert.equal(cancelRes.refundedAmountCents, 35000);

      const afterWallet = loadWalletState().balanceCents;
      assert.equal(afterWallet, initialWallet + 35000);
    });

    it('should disallow penalty-free cancellation after grace period expires', () => {
      const order = saveNewOrder([], 45000);
      // Simulate expired timestamp
      recordOrderCreatedAt(order.id, Date.now() - 150000);

      const status = getOrderGracePeriodStatus(order.id, 90);
      assert.equal(status.isWithinGracePeriod, false);
      assert.equal(status.canCancelWithoutPenalty, false);

      const cancelRes = cancelOrderWithinGracePeriod(order.id);
      assert.equal(cancelRes.success, false);
      assert.match(cancelRes.message, /Grace period has expired/);
    });
  });
});
