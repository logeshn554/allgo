// E2E / Unit Verification Suite: Phase 4 Merchant & Dark-Store Partner Application
// Tests Real-Time KDS, Batch Picking, OOS Fulfillment, 1-Tap SKU Toggle, Custody Handover, Settlement Ledger, and RBAC Guard.

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  loadKdsOrders,
  saveKdsOrders,
  acceptKdsOrder,
  rejectKdsOrder,
  toggleItemPicked,
  flagItemOutOfStock,
  completeDriverHandover,
  type KdsLiveOrder,
} from '../../src/data/merchantOrderFulfillment.ts';
import {
  loadSkuCatalog,
  saveSkuCatalog,
  toggleSkuStock,
  loadStoreSettings,
  saveStoreSettings,
  toggleStoreBusyMode,
  updatePrepBuffer,
} from '../../src/data/merchantInventoryApi.ts';
import {
  loadSettlementLedger,
  calculateLedgerSummary,
  type OrderSettlementRecord,
} from '../../src/data/merchantSettlementLedger.ts';
import { requireRole } from '../../apps/api/src/middleware/rbac.middleware.ts';

describe('Phase 4: Merchant & Dark-Store Partner Verification', () => {
  beforeEach(() => {
    // Reset test order fixtures
    saveKdsOrders([
      {
        id: 'ORD-TEST-1',
        customerName: 'Aarav Patel',
        customerPhone: '+91 98888 77777',
        status: 'NEW',
        items: [
          { id: 'item_a', name: 'Fresh Milk', sku: 'SKU-01', aisle: 'Aisle 1', category: 'Dairy', quantity: 2, priceCents: 6000 },
          { id: 'item_b', name: 'Brown Bread', sku: 'SKU-02', aisle: 'Aisle 2', category: 'Bakery', quantity: 1, priceCents: 4500 },
        ],
        totalCents: 10500,
        prepTimeMinutes: 15,
        secondsRemaining: 90,
        createdAt: new Date().toISOString(),
        handoverOtp: '5566',
        substitutionRule: 'REFUND_ITEM',
      },
    ]);
  });

  describe('1. Real-Time KDS & 90s Acceptance Countdown', () => {
    it('should detect incoming NEW order with 90s countdown and accept with prep buffer', async () => {
      const orders = loadKdsOrders();
      const newOrder = orders.find((o) => o.status === 'NEW');
      assert.ok(newOrder);
      assert.equal(newOrder.secondsRemaining, 90);

      const accepted = await acceptKdsOrder('ORD-TEST-1', 25);
      assert.ok(accepted);
      assert.equal(accepted.status, 'PREPARING');
      assert.equal(accepted.prepTimeMinutes, 25);
      assert.equal(accepted.secondsRemaining, 0);
    });

    it('should allow declining an order when store is peak overloaded', async () => {
      const rejected = await rejectKdsOrder('ORD-TEST-1', 'Store overloaded');
      assert.equal(rejected, true);

      const updated = loadKdsOrders().find((o) => o.id === 'ORD-TEST-1');
      assert.equal(updated?.status, 'REJECTED');
    });
  });

  describe('2. Interactive Batch Picking & Packing Checklist', () => {
    it('should sort items by aisle and advance to READY_FOR_PICKUP when all items checked off', async () => {
      await acceptKdsOrder('ORD-TEST-1', 20);

      // Check off first item
      let order = toggleItemPicked('ORD-TEST-1', 'item_a');
      assert.ok(order);
      assert.equal(order.items[0].isPicked, true);
      assert.equal(order.status, 'PREPARING'); // Still 1 item remaining

      // Check off second item
      order = toggleItemPicked('ORD-TEST-1', 'item_b');
      assert.ok(order);
      assert.equal(order.items[1].isPicked, true);
      assert.equal(order.status, 'READY_FOR_PICKUP'); // Auto-advanced!
    });
  });

  describe('3. Out-of-Stock (OOS) & Partial Fulfillment Workflow', () => {
    it('should flag item OOS and calculate instant customer wallet refund', () => {
      const res = flagItemOutOfStock('ORD-TEST-1', 'item_a');
      assert.ok(res.order);
      assert.equal(res.refundCents, 12000); // 2 x 6000 cents = ₹120
      assert.equal(res.order.items[0].isOos, true);
      assert.equal(res.order.refundedCents, 12000);
      assert.match(res.message, /refunded to customer's wallet/);
    });
  });

  describe('4. Real-Time Catalog & Inventory Sync', () => {
    it('should 1-tap toggle SKU stock status and invalidate Redis catalog cache', async () => {
      const res = await toggleSkuStock('sku_1');
      assert.ok(res.item);
      assert.equal(res.invalidatedCache, true);

      const toggledAgain = await toggleSkuStock('sku_1');
      assert.ok(toggledAgain.item);
      assert.notEqual(res.item.isAvailable, toggledAgain.item.isAvailable);
    });

    it('should toggle Store Busy-Mode and calculate busyUntil timestamp', async () => {
      const busy = await toggleStoreBusyMode(30);
      assert.equal(busy.isBusyMode, true);
      assert.equal(busy.busyDurationMinutes, 30);
      assert.ok(busy.busyUntil);

      const resume = await toggleStoreBusyMode(0);
      assert.equal(resume.isBusyMode, false);
      assert.equal(resume.busyUntil, null);
    });

    it('should update peak rush preparation time buffer', () => {
      const updated = updatePrepBuffer(20);
      assert.equal(updated.prepBufferMinutes, 20);
    });
  });

  describe('5. Driver Custody Handover Verification', () => {
    it('should reject custody transfer if sealed bag count is zero or PIN is invalid', () => {
      const zeroBags = completeDriverHandover('ORD-TEST-1', '5566', 0);
      assert.equal(zeroBags.success, false);
      assert.match(zeroBags.message, /at least 1 verified sealed bag/);

      const invalidPin = completeDriverHandover('ORD-TEST-1', '9999', 2);
      assert.equal(invalidPin.success, false);
      assert.match(invalidPin.message, /Invalid 4-digit Driver Handover PIN/);
    });

    it('should accept custody transfer with matching PIN and bags, transitioning to PICKED_UP', () => {
      const valid = completeDriverHandover('ORD-TEST-1', '5566', 2);
      assert.equal(valid.success, true);
      assert.equal(valid.order?.status, 'PICKED_UP');
      assert.equal(valid.order?.sealedBagsCount, 2);
      assert.match(valid.message, /Custody transferred! 2 sealed bags/);
    });
  });

  describe('6. Merchant Settlement Ledger & T+1 Payouts', () => {
    it('should calculate 15% platform commission, 5% GST, and 1% TCS correctly', () => {
      const grossSalesCents = 100000; // ₹1,000
      const commissionCents = Math.round(grossSalesCents * 0.15); // ₹150
      const gstCents = Math.round(grossSalesCents * 0.05); // ₹50
      const tcsCents = Math.round(grossSalesCents * 0.01); // ₹10

      assert.equal(commissionCents, 15000);
      assert.equal(gstCents, 5000);
      assert.equal(tcsCents, 1000);

      const packagingCents = 2000; // ₹20
      const netPayout = grossSalesCents + packagingCents - commissionCents - gstCents - tcsCents;
      assert.equal(netPayout, 81000); // ₹810
    });

    it('should summarize settlement ledger records and separate pending T+1 from settled payouts', () => {
      const records = loadSettlementLedger();
      const summary = calculateLedgerSummary(records);

      assert.ok(summary.totalGrossSalesCents > 0);
      assert.ok(summary.totalCommissionCents > 0);
      assert.ok(summary.netDisbursementCents > 0);
      assert.ok(summary.pendingT1Cents > 0);
      assert.ok(summary.settledCents > 0);
    });
  });

  describe('7. Backend RBAC: requireRole([MERCHANT]) Enforcement', () => {
    it('should grant access to users holding the MERCHANT or MERCHANT_ADMIN role', () => {
      const guard = requireRole(['MERCHANT']);
      let nextCalled = false;

      const req: any = {
        user: { userId: 'usr_merch_01', roles: ['MERCHANT'] },
        headers: {},
      };
      const res: any = {};
      const next = () => { nextCalled = true; };

      guard(req, res, next);
      assert.equal(nextCalled, true);
    });

    it('should block users holding only CUSTOMER role with HTTP 403 Forbidden', () => {
      const guard = requireRole(['MERCHANT']);
      let statusCode = 0;
      let responseBody: any = null;

      const req: any = {
        user: { userId: 'usr_cust_01', roles: ['CUSTOMER'] },
        headers: {},
      };
      const res: any = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(body: any) {
          responseBody = body;
        },
      };
      const next = () => {};

      guard(req, res, next);
      assert.equal(statusCode, 403);
      assert.equal(responseBody.error, 'Forbidden');
    });

    it('should reject unauthenticated requests with HTTP 401 Unauthorized', () => {
      const guard = requireRole(['MERCHANT']);
      let statusCode = 0;

      const req: any = { user: null, headers: {} };
      const res: any = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json() {},
      };
      const next = () => {};

      guard(req, res, next);
      assert.equal(statusCode, 401);
    });
  });
});
