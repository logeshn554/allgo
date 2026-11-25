import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createDispatchOffer,
  evaluateBatchingFeasibility,
} from './legacy-mobile-data/dispatchMatchingEngine.ts';
import {
  loadDriverEarnings,
  requestInstantPayout,
} from './legacy-mobile-data/driverWalletService.ts';
import { buildNavigationUri, launchNavigation } from './legacy-mobile-data/navigationLauncher.ts';
import {
  clearOfflineQueue,
  enqueueOfflineAction,
  flushOfflineQueue,
  getOfflineQueue,
} from './legacy-mobile-data/offlineActionQueue.ts';
import { saveNewOrder } from './legacy-mobile-data/orderStorage.ts';
import { verifyProofOfDelivery } from './legacy-mobile-data/proofOfDeliveryService.ts';

describe('Subsystem 2: Driver & Fleet Partner Engine Unit Tests', () => {
  describe('Automated Dispatch & Intelligent Matching', () => {
    it('should create dispatch offer with acceptance timer between 15-30 seconds', () => {
      const offer = createDispatchOffer(
        'ORD-101',
        'partner-1',
        { address: 'Koramangala 4th Block', lat: 12.9352, lon: 77.6245 },
        { address: 'Indiranagar 100ft Rd', lat: 12.9784, lon: 77.6408 },
        9500,
        25,
      );

      assert.equal(offer.status, 'PENDING');
      assert.equal(offer.acceptanceDurationSeconds, 25);
      assert.ok(offer.expiresAtMs > Date.now());
      assert.ok(offer.expiresAtMs <= Date.now() + 26000);
    });

    it('should clamp acceptance timer within 15-30s constraint', () => {
      const shortOffer = createDispatchOffer(
        'O1',
        'P1',
        { address: 'A', lat: 0, lon: 0 },
        { address: 'B', lat: 0, lon: 0 },
        5000,
        5,
      );
      assert.equal(shortOffer.acceptanceDurationSeconds, 15);

      const longOffer = createDispatchOffer(
        'O2',
        'P1',
        { address: 'A', lat: 0, lon: 0 },
        { address: 'B', lat: 0, lon: 0 },
        5000,
        60,
      );
      assert.equal(longOffer.acceptanceDurationSeconds, 30);
    });

    it('should batch nearby pickups and dropoffs along the same route', () => {
      const orderA = {
        orderId: 'ORD-A',
        pickupLat: 12.935,
        pickupLon: 77.624,
        dropoffLat: 12.978,
        dropoffLon: 77.64,
      };
      const orderB = {
        orderId: 'ORD-B',
        pickupLat: 12.936,
        pickupLon: 77.625,
        dropoffLat: 12.98,
        dropoffLon: 77.641,
      };

      const res = evaluateBatchingFeasibility(orderA, orderB, 1500);
      assert.equal(res.canBatch, true);
      assert.ok(res.combinedBatch);
      assert.equal(res.combinedBatch?.orderIds.length, 2);
      assert.equal(res.combinedBatch?.waypoints.length, 4);
    });
  });

  describe('Proof of Delivery (PoD)', () => {
    it('should require photo proof for contactless delivery', () => {
      const order = saveNewOrder([], 20000);

      // Missing photo fails
      const failed = verifyProofOfDelivery({
        orderId: order.id,
        method: 'PHOTO',
        photoUrl: '',
        latitude: 12.935,
        longitude: 77.624,
      });
      assert.equal(failed.success, false);
      assert.match(failed.message, /photo proof of drop-off is compulsory/);

      // With photo succeeds
      const ok = verifyProofOfDelivery({
        orderId: order.id,
        method: 'PHOTO',
        photoUrl: 'storage/proof_doorstep_1.jpg',
        latitude: 12.935,
        longitude: 77.624,
      });
      assert.equal(ok.success, true);
      assert.equal(ok.method, 'PHOTO');
    });

    it('should require digital signature for signed delivery', () => {
      const order = saveNewOrder([], 25000);

      const ok = verifyProofOfDelivery({
        orderId: order.id,
        method: 'SIGNATURE',
        signatureDataUri: 'data:image/svg+xml;sign=valid',
        latitude: 12.935,
        longitude: 77.624,
      });
      assert.equal(ok.success, true);
      assert.equal(ok.method, 'SIGNATURE');
    });
  });

  describe('Offline Resilience & Reconnection Queues', () => {
    it('should queue actions during offline dead zones and sync on reconnect', async () => {
      clearOfflineQueue();

      enqueueOfflineAction('LOCATION_PING', { lat: 12.935, lon: 77.624, speedMps: 6.2 });
      enqueueOfflineAction('STATUS_TRANSITION', { orderId: 'ORD-77', status: 'ARRIVED' });

      const queued = getOfflineQueue();
      assert.equal(queued.length, 2);

      const syncRes = await flushOfflineQueue(async () => true);
      assert.equal(syncRes.processedCount, 2);
      assert.equal(syncRes.remainingQueueSize, 0);

      const afterSync = getOfflineQueue();
      assert.equal(afterSync.length, 0);
    });
  });

  describe('Turn-by-Turn Navigation Deep Linking', () => {
    it('should generate valid navigation deep link URIs for external maps', () => {
      const target = { latitude: 12.9716, longitude: 77.5946, label: 'MG Road' };

      const gUri = buildNavigationUri('google', target);
      assert.match(gUri, /^google\.navigation:q=12\.9716,77\.5946/);

      const wUri = buildNavigationUri('waze', target);
      assert.match(wUri, /waze\.com\/ul\?ll=12\.9716,77\.5946/);

      const aUri = buildNavigationUri('apple', target);
      assert.match(aUri, /^maps:\/\/\?daddr=12\.9716,77\.5946/);
    });

    it('should invoke navigation launcher callback successfully', () => {
      let launchedUri = '';
      const res = launchNavigation('google', { latitude: 12.9716, longitude: 77.5946 }, (uri) => {
        launchedUri = uri;
        return true;
      });

      assert.equal(res.success, true);
      assert.equal(launchedUri, res.uri);
    });
  });

  describe('Transparent Driver Wallet & Payouts', () => {
    it('should itemize daily/weekly earnings breakdown', () => {
      const earnings = loadDriverEarnings();
      assert.ok(earnings.baseFareSumCents > 0);
      assert.ok(earnings.distancePaySumCents > 0);
      assert.ok(earnings.waitingTimeSumCents > 0);
      assert.ok(earnings.surgeBonusSumCents > 0);
      assert.equal(
        earnings.weeklyTotalCents,
        earnings.baseFareSumCents +
          earnings.distancePaySumCents +
          earnings.waitingTimeSumCents +
          earnings.surgeBonusSumCents,
      );
    });

    it('should process instant IMPS payout request', () => {
      const earnings = loadDriverEarnings();
      const payoutRes = requestInstantPayout(earnings.availableBalanceCents, 'acc_hdfc_9988');

      assert.equal(payoutRes.success, true);
      assert.ok(payoutRes.payoutId.startsWith('PAYOUT-IMPS-'));
      assert.match(payoutRes.message, /acc_hdfc_9988/);
      assert.equal(payoutRes.remainingBalanceCents, 0);
    });
  });
});
