import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSupplyDemandSurge,
  evaluateDisputeGpsProximity,
  processDisputeRefund,
} from '../../src/data/adminDispatchService.ts';
import {
  loadWalletState,
} from '../../src/data/walletStorage.ts';

describe('Subsystem 4: Admin & Central Dispatch Control Unit Tests', () => {
  describe('Dynamic Surge & Geofencing Management', () => {
    it('should return 1.0x when supply meets or exceeds demand', () => {
      const surge = calculateSupplyDemandSurge(20, 15);
      assert.equal(surge, 1.0);
    });

    it('should calculate scaled surge multiplier when demand exceeds supply', () => {
      const surge = calculateSupplyDemandSurge(10, 20); // ratio 2.0 -> 1.0 + 1.0*0.5 = 1.5x
      assert.equal(surge, 1.5);
    });

    it('should clamp surge multiplier at maximum 3.0x ceiling', () => {
      const extremeSurge = calculateSupplyDemandSurge(2, 30); // ratio 15
      assert.equal(extremeSurge, 3.0);

      const zeroSupplySurge = calculateSupplyDemandSurge(0, 5);
      assert.equal(zeroSupplySurge, 3.0);
    });
  });

  describe('Dispute & Refund Workflow', () => {
    it('should verify driver GPS dropoff was within 100m delivery perimeter', () => {
      // Driver at (12.9718, 77.5948) vs customer at (12.9716, 77.5946) ~ 30 meters
      const res = evaluateDisputeGpsProximity(12.9716, 77.5946, 12.9718, 77.5948);
      assert.ok(res.distanceMeters < 50);
      assert.equal(res.isWithinDeliveryPerimeter, true);
    });

    it('should detect driver GPS dropoff discrepancy outside perimeter', () => {
      // Driver 950 meters away
      const res = evaluateDisputeGpsProximity(12.9716, 77.5946, 12.9780, 77.6020);
      assert.ok(res.distanceMeters > 500);
      assert.equal(res.isWithinDeliveryPerimeter, false);
    });

    it('should process dispute refund and credit customer wallet balance', () => {
      const initWallet = loadWalletState().balanceCents;
      const dispute = processDisputeRefund('ORD-8812', 'cust-77', 15000, 'Delivered to wrong block');

      assert.equal(dispute.resolutionStatus, 'REFUNDED');
      assert.equal(dispute.refundIssuedCents, 15000);
      assert.ok(dispute.disputeId.startsWith('DSP-'));

      const postWallet = loadWalletState().balanceCents;
      assert.equal(postWallet, initWallet + 15000);
    });
  });
});
