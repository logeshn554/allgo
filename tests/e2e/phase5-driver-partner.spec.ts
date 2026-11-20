// E2E / Unit Verification Suite: Phase 5 Driver & Captain Partner Application
// Tests Multi-Vertical Shifts, 3s/15s GPS Telemetry, 15s Radial Dispatch Modal, 150m Geofence Gating, PoD Gates, CoD Float Limit (₹2,000), and UPI Payouts.

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  loadCurrentGpsLocation,
  calculateDistanceKm,
  checkGeofenceProximity,
  startDriverTelemetryStream,
  type DriverTelemetryPing,
} from '../../src/data/gpsLoader.ts';
import {
  loadDriverVerticalPreferences,
  saveDriverVerticalPreferences,
  loadActiveDispatchOffer,
  acceptDispatchOffer,
  rejectDispatchOffer,
  type DriverVertical,
} from '../../src/data/driverDispatchService.ts';
import {
  loadDriverActiveTrip,
  saveDriverActiveTrip,
  canArriveAtPickup,
  canArriveAtDrop,
  verifyPickupGate,
  verifyDropPoD,
  generateGoogleMapsDeepLink,
  type DriverActiveTrip,
} from '../../src/data/driverTripExecution.ts';
import {
  loadDriverFinancials,
  saveDriverFinancials,
  settleCodFloatViaUpi,
  requestInstantDriverPayout,
  MAX_COD_FLOAT_LIMIT_INR,
} from '../../src/data/driverCodEarningsService.ts';

describe('Phase 5: Driver & Captain Partner Application Verification', () => {
  beforeEach(() => {
    // Reset test active trip fixture
    saveDriverActiveTrip({
      orderId: 'ORD-TEST-DRV-01',
      vertical: 'GROCERY',
      status: 'DRIVER_ASSIGNED',
      pickupCoords: { lat: 12.9716, lng: 77.5946 },
      pickupAddress: 'AllGo Dark Store #4, Indiranagar',
      dropCoords: { lat: 12.9352, lng: 77.6245 },
      dropAddress: 'Flat 402, Green Glen Layout, Bellandur',
      customerName: 'Priya R',
      customerPhone: '+91 98450 11223',
      rideStartPin: '1234',
      merchantHandoverOtp: '4821',
      recipientDropOtp: '5678',
      fareInr: 125,
    });
  });

  describe('1. Multi-Vertical Preferences & High-Accuracy Telemetry', () => {
    it('should save and load multi-vertical dispatch opt-in preferences', () => {
      saveDriverVerticalPreferences(['RIDE', 'PARCEL']);
      const prefs = loadDriverVerticalPreferences();
      assert.equal(prefs.length, 2);
      assert.ok(prefs.includes('RIDE'));
      assert.ok(prefs.includes('PARCEL'));
      assert.equal(prefs.includes('GROCERY'), false);
    });

    it('should stream high-accuracy GPS telemetry with heading and speed deltas', (t, done) => {
      let pingCount = 0;
      let stopFn: (() => void) | null = null;
      stopFn = startDriverTelemetryStream({
        driverId: 'drv_test_ping_1',
        isTripActive: true,
        onPing: (ping: DriverTelemetryPing) => {
          pingCount++;
          assert.ok(ping.lat > 0);
          assert.ok(ping.lng > 0);
          assert.ok(ping.heading >= 0 && ping.heading <= 360);
          assert.ok(ping.speedKmh >= 0);
          assert.ok(ping.timestamp);
          if (stopFn) stopFn();
          done();
        },
      });
      if (stopFn && pingCount > 0) {
        stopFn();
      }
    });
  });

  describe('2. 15-Second Radial Dispatch Offer Modal', () => {
    it('should load active job offer with vertical, upfront earnings, and distances', () => {
      const offer = loadActiveDispatchOffer();
      assert.ok(offer);
      assert.equal(offer.vertical, 'GROCERY');
      assert.equal(offer.netEarningsInr, 125);
      assert.equal(offer.pickupDistanceKm, 1.2);
      assert.equal(offer.dropDistanceKm, 3.8);
      assert.equal(offer.secondsRemaining, 15);
    });

    it('should accept dispatch offer and clear modal state', async () => {
      const accepted = await acceptDispatchOffer('off_disp_991');
      assert.equal(accepted, true);
      assert.equal(loadActiveDispatchOffer(), null);
    });

    it('should reject dispatch offer with reason', async () => {
      const rejected = await rejectDispatchOffer('off_disp_991', 'Too far away');
      assert.equal(rejected, true);
      assert.equal(loadActiveDispatchOffer(), null);
    });
  });

  describe('3. Geofence Gating (150m threshold) & Turn-by-Turn Deep-Linking', () => {
    it('should accurately calculate distance and enforce 150m geofence proximity check', () => {
      // Exactly at pickup coords
      const closeLocation = { lat: 12.9716, lng: 77.5946 };
      const targetPickup = { lat: 12.9716, lng: 77.5946 };
      const closeCheck = checkGeofenceProximity(closeLocation, targetPickup, 150);
      assert.equal(closeCheck.isInside, true);
      assert.ok(closeCheck.distanceMeters <= 150);

      // Far away (~5 km away)
      const farLocation = { lat: 12.9200, lng: 77.6500 };
      const farCheck = checkGeofenceProximity(farLocation, targetPickup, 150);
      assert.equal(farCheck.isInside, false);
      assert.ok(farCheck.distanceMeters > 150);
    });

    it('should generate valid Google Maps turn-by-turn navigation deep-link', () => {
      const link = generateGoogleMapsDeepLink({ lat: 12.9716, lng: 77.5946 }, 'Indiranagar Hub');
      assert.match(link, /google\.com\/maps\/dir/);
      assert.match(link, /12\.9716,77\.5946/);
      assert.match(link, /Indiranagar%20Hub/);
    });
  });

  describe('4. Mandatory Verification Gate: Ride PIN, Merchant OTP & Drop PoD', () => {
    it('should verify Merchant Handover OTP and transition order to PICKED_UP', () => {
      const trip = loadDriverActiveTrip();
      assert.ok(trip);

      // Reject invalid OTP
      const fail = verifyPickupGate(trip, '0000');
      assert.equal(fail.success, false);
      assert.match(fail.message, /Invalid Merchant/);

      // Accept valid OTP
      const pass = verifyPickupGate(trip, '4821');
      assert.equal(pass.success, true);
      assert.equal(pass.updatedTrip?.status, 'PICKED_UP');
    });

    it('should require photo proof and recipient drop OTP before completing delivery', () => {
      const trip = loadDriverActiveTrip();
      assert.ok(trip);
      trip.status = 'ARRIVED_AT_DROP';

      // Reject missing photo
      const noPhoto = verifyDropPoD(trip, '5678', '');
      assert.equal(noPhoto.success, false);
      assert.match(noPhoto.message, /photo is required/);

      // Reject invalid Drop OTP
      const badOtp = verifyDropPoD(trip, '9999', 'storage/photo.jpg');
      assert.equal(badOtp.success, false);
      assert.match(badOtp.message, /Invalid Recipient Drop OTP/);

      // Accept valid photo and OTP
      const complete = verifyDropPoD(trip, '5678', 'storage/photo.jpg');
      assert.equal(complete.success, true);
      assert.equal(complete.updatedTrip?.status, 'DELIVERED');
    });
  });

  describe('5. CoD Cash-in-Hand Float Limit (₹2,000 Threshold) & UPI Settlement', () => {
    it('should block new cash orders when float exceeds ₹2,000 threshold', () => {
      const profile = loadDriverFinancials();
      profile.currentCodFloatInr = 2150; // Exceeds ₹2,000
      saveDriverFinancials(profile);

      const updated = loadDriverFinancials();
      assert.equal(updated.currentCodFloatInr, 2150);
      assert.equal(updated.isCashOrderBlocked, true);
    });

    it('should settle CoD float via UPI and unblock cash orders when under ₹2,000', async () => {
      const profile = loadDriverFinancials();
      profile.currentCodFloatInr = 2150;
      saveDriverFinancials(profile);

      const res = await settleCodFloatViaUpi(1000);
      assert.equal(res.success, true);
      assert.equal(res.remainingFloatInr, 1150);

      const updated = loadDriverFinancials();
      assert.equal(updated.currentCodFloatInr, 1150);
      assert.equal(updated.isCashOrderBlocked, false); // Unblocked!
    });
  });

  describe('6. Per-Trip Earnings Breakdown & Instant UPI Payout', () => {
    it('should calculate detailed per-trip earnings breakdown', () => {
      const profile = loadDriverFinancials();
      const trip = profile.recentTrips[0];
      assert.ok(trip);

      const computedTotal =
        trip.baseFareInr +
        trip.distancePayInr +
        trip.waitingPayInr +
        trip.surgeBonusInr +
        trip.customerTipInr;

      assert.equal(computedTotal, trip.totalNetEarningsInr);
      assert.equal(computedTotal, 125);
    });

    it('should disburse instant payout to driver UPI VPA with UTR reference', async () => {
      const profile = loadDriverFinancials();
      const initialBalance = profile.walletBalanceInr;

      const payout = await requestInstantDriverPayout(500, 'driver@okaxis');
      assert.equal(payout.success, true);
      assert.ok(payout.utr?.startsWith('UTR_UPI_'));

      const updated = loadDriverFinancials();
      assert.equal(updated.walletBalanceInr, initialBalance - 500);
    });
  });
});
