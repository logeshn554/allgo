import { describe, it } from 'node:test';
import assert from 'node:assert';
import { InventoryReservationService } from '../../apps/api/dist/ordering/services/inventory-reservation.service.js';
import { OrderMerchantLifecycleService } from '../../apps/api/dist/ordering/services/order-merchant-lifecycle.service.js';
import { OrderCancellationService } from '../../apps/api/dist/ordering/services/order-cancellation.service.js';

describe('Priority 2: Multi-Merchant Independent Sub-Order Lifecycle', () => {
  class MockDb {
    inventory = [
      { id: 'inv_biryani', outlet_id: 'outlet_food', item_id: 'item_biryani', stock_quantity: 10, reserved_quantity: 0, is_in_stock: true },
      { id: 'inv_milk', outlet_id: 'outlet_grocery', item_id: 'item_milk', stock_quantity: 20, reserved_quantity: 0, is_in_stock: true },
    ];
    reservations: any[] = [];
    subOrders: any[] = [];
    orderGroups: any[] = [];
    cancellations: any[] = [];
    refunds: any[] = [];

    async query(sql: string, params: any[] = []): Promise<{ rows: any[] }> {
      const s = sql.trim();

      // INVENTORY
      if (s.includes('FROM inventory') && s.includes('FOR UPDATE')) {
        const outletId = params[0];
        const itemId = params[1];
        const row = this.inventory.find((i) => i.outlet_id === outletId && i.item_id === itemId);
        return { rows: row ? [row] : [] };
      }
      if (s.includes('stock_quantity = stock_quantity - $1')) {
        const row = this.inventory.find((i) => i.id === params[1]);
        if (row) {
          row.stock_quantity -= Number(params[0]);
          row.reserved_quantity += Number(params[0]);
        }
        return { rows: [row] };
      }
      if (s.startsWith('INSERT INTO inventory_reservations')) {
        const res = {
          id: `res_${this.reservations.length + 1}`,
          checkout_session_id: params[0],
          outlet_id: params[1],
          item_id: params[2],
          quantity: params[3],
          status: 'RESERVED',
        };
        this.reservations.push(res);
        return { rows: [res] };
      }
      if (s.includes('FROM inventory_reservations') && s.includes('status = \'RESERVED\'') && s.includes('SELECT')) {
        const sessionId = params[0];
        const outletId = params[1];
        let matched = this.reservations.filter((r) => r.checkout_session_id === sessionId && r.status === 'RESERVED');
        if (outletId) {
          matched = matched.filter((r) => r.outlet_id === outletId);
        }
        return { rows: matched };
      }
      if (s.includes('stock_quantity = stock_quantity + $1')) {
        const qty = Number(params[0]);
        const outletId = params[1];
        const itemId = params[2];
        const row = this.inventory.find((i) => i.outlet_id === outletId && i.item_id === itemId);
        if (row) {
          row.stock_quantity += qty;
          row.reserved_quantity = Math.max(0, row.reserved_quantity - qty);
          row.is_in_stock = true;
        }
        return { rows: [row] };
      }
      if (s.includes('reserved_quantity = GREATEST(0, reserved_quantity - $1)')) {
        const qty = Number(params[0]);
        const outletId = params[1];
        const itemId = params[2];
        const row = this.inventory.find((i) => i.outlet_id === outletId && i.item_id === itemId);
        if (row) {
          row.reserved_quantity = Math.max(0, row.reserved_quantity - qty);
        }
        return { rows: [row] };
      }
      if (s.includes('inventory_reservations') && s.includes('SET status = \'COMMITTED\'')) {
        const sessionId = params[0];
        const outletId = params[1];
        for (const r of this.reservations) {
          if (r.checkout_session_id === sessionId && (!outletId || r.outlet_id === outletId) && r.status === 'RESERVED') {
            r.status = 'COMMITTED';
          }
        }
        return { rows: [] };
      }
      if (s.includes('inventory_reservations') && s.includes('SET status = \'RELEASED\'')) {
        const sessionId = params[0];
        const outletId = params[1];
        for (const r of this.reservations) {
          if (r.checkout_session_id === sessionId && (!outletId || r.outlet_id === outletId) && r.status === 'RESERVED') {
            r.status = 'RELEASED';
          }
        }
        return { rows: [] };
      }

      return { rows: [] };
    }
  }

  it('1. Inventory reservations can be committed or released independently per outlet', async () => {
    const db = new MockDb();
    const inventoryService = new InventoryReservationService(db as any);

    // Reserve 2 Biryanis for outlet_food, and 3 Milks for outlet_grocery in session_multi
    await inventoryService.reserveInventory(db as any, 'session_multi', 'outlet_food', [
      { itemId: 'item_biryani', quantity: 2 },
    ]);
    await inventoryService.reserveInventory(db as any, 'session_multi', 'outlet_grocery', [
      { itemId: 'item_milk', quantity: 3 },
    ]);

    const foodInv = db.inventory.find((i) => i.id === 'inv_biryani')!;
    const groceryInv = db.inventory.find((i) => i.id === 'inv_milk')!;

    assert.strictEqual(foodInv.stock_quantity, 8);
    assert.strictEqual(foodInv.reserved_quantity, 2);
    assert.strictEqual(groceryInv.stock_quantity, 17);
    assert.strictEqual(groceryInv.reserved_quantity, 3);

    // Outlet Food accepts -> commit ONLY outlet_food
    await inventoryService.commitReservation('session_multi', 'outlet_food');

    assert.strictEqual(foodInv.reserved_quantity, 0, 'Food reservation committed');
    assert.strictEqual(foodInv.stock_quantity, 8, 'Food stock remains 8');
    assert.strictEqual(groceryInv.reserved_quantity, 3, 'Grocery reservation still intact');

    // Outlet Grocery rejects -> release ONLY outlet_grocery
    await inventoryService.releaseReservation('session_multi', 'outlet_grocery');

    assert.strictEqual(groceryInv.reserved_quantity, 0, 'Grocery reservation released');
    assert.strictEqual(groceryInv.stock_quantity, 20, 'Grocery stock restored back to 20');
  });

  it('2. Merchant order actions isolate sub-orders and do not mutate sibling sub-orders', async () => {
    const db = new MockDb();
    const inventoryService = new InventoryReservationService(db as any);

    let subOrders = [
      {
        id: 'sub_food_1',
        order_group_id: 'grp_multi',
        outlet_id: 'outlet_food',
        checkout_session_id: 'sess_1',
        customer_id: 'cust_1',
        status: 'PLACED',
        total_payable_inr: 450.0,
      },
      {
        id: 'sub_groc_2',
        order_group_id: 'grp_multi',
        outlet_id: 'outlet_grocery',
        checkout_session_id: 'sess_1',
        customer_id: 'cust_1',
        status: 'PLACED',
        total_payable_inr: 180.0,
      },
    ];

    const mockOrderRepo: any = {
      findSubOrderForMerchant: async (subOrderId: string, merchantUserId: string) => {
        return subOrders.find((s) => s.id === subOrderId) || null;
      },
      updateSubOrderAccepted: async (subOrderId: string, prepTime: number) => {
        const order = subOrders.find((s) => s.id === subOrderId)!;
        order.status = 'MERCHANT_ACCEPTED';
        return order;
      },
      markSubOrderRejected: async (subOrderId: string, reason: string) => {
        const order = subOrders.find((s) => s.id === subOrderId)!;
        order.status = 'CANCELLED';
        return order;
      },
    };

    const mockEventRepo: any = { recordEvent: async () => {} };
    const mockCancellationRepo: any = { recordCancellation: async () => {} };
    const mockPaymentService: any = { processRefund: async () => ({ id: 'ref_1' }) };
    const mockDeliveryService: any = {};

    const merchantLifecycle = new OrderMerchantLifecycleService(
      db as any,
      mockOrderRepo,
      mockEventRepo,
      mockCancellationRepo,
      inventoryService,
      mockPaymentService,
      mockDeliveryService
    );

    // Merchant Food accepts sub_food_1
    const accepted = await merchantLifecycle.merchantAcceptOrder('sub_food_1', 'user_chef', 25);
    assert.strictEqual(accepted.status, 'MERCHANT_ACCEPTED');

    // Sibling sub-order sub_groc_2 remains in PLACED status
    const grocSub = subOrders.find((s) => s.id === 'sub_groc_2')!;
    assert.strictEqual(grocSub.status, 'PLACED');

    // Merchant Grocery rejects sub_groc_2
    const rejected = await merchantLifecycle.merchantRejectOrder('sub_groc_2', 'user_store', 'Item unavailable');
    assert.strictEqual(rejected.status, 'CANCELLED');

    // Sub-order food remains MERCHANT_ACCEPTED
    const foodSub = subOrders.find((s) => s.id === 'sub_food_1')!;
    assert.strictEqual(foodSub.status, 'MERCHANT_ACCEPTED');
  });

  it('3. Customer can cancel an individual sub-order in a group without affecting other sub-orders', async () => {
    const db = new MockDb();
    const inventoryService = new InventoryReservationService(db as any);

    let subOrders = [
      {
        id: 'sub_a',
        order_group_id: 'grp_multi',
        outlet_id: 'outlet_a',
        checkout_session_id: 'sess_cancel',
        customer_id: 'cust_1',
        status: 'PLACED',
        total_payable_inr: 300.0,
      },
      {
        id: 'sub_b',
        order_group_id: 'grp_multi',
        outlet_id: 'outlet_b',
        checkout_session_id: 'sess_cancel',
        customer_id: 'cust_1',
        status: 'PLACED',
        total_payable_inr: 200.0,
      },
    ];

    const mockOrderRepo: any = {
      findSubOrderForCancellation: async (subOrderId: string) => {
        return subOrders.find((s) => s.id === subOrderId) || null;
      },
      markSubOrderCancelled: async (subOrderId: string, reason: string, userId: string) => {
        const order = subOrders.find((s) => s.id === subOrderId)!;
        order.status = 'CANCELLED';
        return order;
      },
    };

    const mockEventRepo: any = { recordEvent: async () => {} };
    const mockCancellationRepo: any = { recordCancellation: async () => {} };
    let refundedSubOrder: string | null = null;
    let refundedAmount: number | null = null;

    const mockPaymentService: any = {
      processRefund: async (subOrderId: string, amount: number) => {
        refundedSubOrder = subOrderId;
        refundedAmount = amount;
        return { id: 'ref_cancelled', amountInr: amount };
      },
    };
    const mockDeliveryService: any = { cancelDeliveryJob: async () => {} };

    const cancellationService = new OrderCancellationService(
      mockOrderRepo,
      mockEventRepo,
      mockCancellationRepo,
      inventoryService,
      mockPaymentService,
      mockDeliveryService
    );

    // Cancel sub_a only
    const cancelled = await cancellationService.cancelOrder('sub_a', 'cust_1', 'CUSTOMER', 'Changed my mind');
    assert.strictEqual(cancelled.status, 'CANCELLED');
    assert.strictEqual(refundedSubOrder, 'sub_a');
    assert.strictEqual(refundedAmount, 300.0);

    // sub_b remains PLACED
    const remaining = subOrders.find((s) => s.id === 'sub_b')!;
    assert.strictEqual(remaining.status, 'PLACED');
  });
});
