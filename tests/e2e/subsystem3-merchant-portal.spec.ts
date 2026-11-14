import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  loadMerchantCatalog,
  toggleItemAvailability,
  loadStoreConfig,
  updateDynamicPrepBuffer,
} from '../../src/data/merchantCatalogManager.ts';
import {
  EscPosThermalPrinter,
} from '../../src/data/thermalPrinterService.ts';
import {
  generateDailySettlementReport,
} from '../../src/data/merchantSettlementService.ts';

describe('Subsystem 3: Merchant & Store Operations Portal Unit Tests', () => {
  describe('Live Catalog & Inventory Management ("86ing" Items)', () => {
    it('should toggle item in-stock status (86ing)', () => {
      const items = loadMerchantCatalog();
      assert.ok(items.length > 0);
      const targetId = items[0].id;

      const before = items[0].isAvailable;
      const toggle1 = toggleItemAvailability(targetId);
      assert.equal(toggle1.success, true);
      assert.equal(toggle1.isAvailable, !before);

      // Toggle back
      const toggle2 = toggleItemAvailability(targetId);
      assert.equal(toggle2.isAvailable, before);
    });

    it('should set dynamic preparation buffer for peak rushes', () => {
      const updated = updateDynamicPrepBuffer(15);
      assert.equal(updated.dynamicPrepBufferMinutes, 15);

      const loaded = loadStoreConfig();
      assert.equal(loaded.dynamicPrepBufferMinutes, 15);
    });
  });

  describe('Hardware Printing Integration (ESC/POS Thermal)', () => {
    it('should generate valid ESC/POS byte commands for Kitchen Order Ticket (KOT)', () => {
      const ticketText = EscPosThermalPrinter.formatKitchenOrderTicket({
        orderId: 'ORD-7744',
        orderType: 'DELIVERY',
        timestamp: '14:30:00',
        customerName: 'Karthik V',
        handoverOtp: '9912',
        items: [
          { name: 'Chettinad Biryani', quantity: 2, notes: 'Extra raita' },
          { name: 'Butter Naan', quantity: 3 },
        ],
        prepTimeMinutes: 25,
      });

      // Verify ESC/POS byte sequence markers
      assert.match(ticketText, /\x1B@/); // ESC @ (Init)
      assert.match(ticketText, /\x1DVA\x00/); // GS V (Cut Paper)
      assert.match(ticketText, /KITCHEN ORDER TICKET/);
      assert.match(ticketText, /ORD-7744/);
      assert.match(ticketText, /COURIER HANDOVER OTP: 9912/);
      assert.match(ticketText, /Chettinad Biryani/);
    });

    it('should support thermal printer transport callback', async () => {
      let capturedCommands = '';
      const res = await EscPosThermalPrinter.printTicket(
        {
          orderId: 'ORD-12',
          orderType: 'PICKUP',
          timestamp: '15:00:00',
          items: [{ name: 'Test Food', quantity: 1 }],
          prepTimeMinutes: 10,
        },
        async (raw) => {
          capturedCommands = raw;
          return true;
        }
      );

      assert.equal(res.success, true);
      assert.ok(capturedCommands.length > 0);
    });
  });

  describe('Settlement & Reconciliation Reports', () => {
    it('should compute daily net sales with deductions (15% commission, taxes, refunds)', () => {
      const orders = [
        { orderId: 'O1', grossFoodCents: 100000, packagingCents: 5000 }, // ₹1000 food, ₹50 packaging
        { orderId: 'O2', grossFoodCents: 50000, packagingCents: 2000, refundCents: 10000 }, // ₹500 food, ₹20 pkg, ₹100 refund
      ];

      const report = generateDailySettlementReport('merch_99', orders);

      assert.equal(report.orderCount, 2);
      assert.equal(report.totalGrossSalesCents, 150000);
      assert.equal(report.totalPackagingCents, 7000);

      // Platform commission 15% on 150000 food = 22500 cents (₹225)
      assert.equal(report.totalPlatformCommissionCents, 22500);

      // Refund deduction = 10000 cents (₹100)
      assert.equal(report.totalRefundDeductionsCents, 10000);

      // Net disbursement = (150000 + 7000) - 22500 - 10000 = 124500 (₹1245)
      assert.equal(report.netDisbursementCents, 124500);
    });
  });
});
