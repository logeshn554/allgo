import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DeliveryPricingService } from '../../apps/api/dist/ordering/services/delivery-pricing.service.js';
import { OrderPlacementService } from '../../apps/api/dist/ordering/services/order-placement.service.js';

describe('Multi-Merchant Unified Cart & Combined Checkout (Phase 2 & 3)', () => {
  const mockPricingRepo: any = {
    getOutletLocation: async (outletId: string) => {
      if (outletId === 'outlet_biryani_anna_nagar') {
        return { id: outletId, lat: 13.0850, lng: 80.2100, zone_id: 'zone_central' };
      }
      if (outletId === 'outlet_zepto_grocery') {
        return { id: outletId, lat: 13.0600, lng: 80.2400, zone_id: 'zone_central' };
      }
      return null;
    },
    getItemsWithOverrides: async (outletId: string, itemIds: string[]) => {
      return itemIds.map((id) => {
        if (id === 'item_mutton_biryani') {
          return {
            id,
            name: 'Special Mutton Biryani',
            base_price_inr: 350.0,
            is_active: true,
            outlet_available: true,
          };
        }
        if (id === 'item_organic_milk') {
          return {
            id,
            name: 'Fresh Organic Milk 1L',
            base_price_inr: 75.0,
            is_active: true,
            outlet_available: true,
          };
        }
        return {
          id,
          name: 'Item ' + id,
          base_price_inr: 100.0,
          is_active: true,
          outlet_available: true,
        };
      });
    },
    getItemVariant: async () => null,
    getItemOptions: async () => [],
  };

  const mockSurgeCalculator: any = {
    calculateDistanceKm: (lat1: number, lon1: number, lat2: number, lon2: number) => {
      // Deterministic distance mock
      if (lat1 === 13.0850) return 2.5; // Biryani outlet
      return 4.0; // Grocery outlet
    },
    toPaisa: (inr: number) => Math.round(inr * 100),
    fromPaisa: (paisa: number) => Math.round(paisa) / 100,
    calculateDeliveryFee: async (distanceKm: number) => {
      // Base ₹30 for <= 3km, ₹30 + ₹10/km beyond
      const feeInr = distanceKm <= 3.0 ? 30.0 : 30.0 + (distanceKm - 3.0) * 10.0;
      return {
        deliveryFeePaisa: Math.round(feeInr * 100),
        deliveryFeeInr: feeInr,
        zoneInfo: { surgeMultiplier: 1.0, isSurgeActive: false, isPeakHour: false },
      };
    },
  };

  const mockCouponsService: any = {
    validateCoupon: async () => ({ discountAmountInr: 0 }),
    findBestAutoAppliedCoupon: async () => null,
  };

  it('1. DeliveryPricingService: Calculates per-outlet delivery fees and combined order totals for multi-merchant cart', async () => {
    const pricingService = new DeliveryPricingService(
      mockPricingRepo,
      mockSurgeCalculator,
      mockCouponsService
    );

    const cartItems = [
      {
        item_id: 'item_mutton_biryani',
        outlet_id: 'outlet_biryani_anna_nagar',
        quantity: 2, // 2 * 350 = 700.00
      },
      {
        item_id: 'item_organic_milk',
        outlet_id: 'outlet_zepto_grocery',
        quantity: 3, // 3 * 75 = 225.00
      },
    ];

    const customerLocation = { latitude: 13.0827, longitude: 80.2707 };
    const pricing = await pricingService.calculateCheckoutTotals(
      cartItems,
      undefined,
      customerLocation
    );

    // Items Subtotal = 700 + 225 = 925.00
    assert.strictEqual(pricing.itemsSubtotalInr, 925.0);

    // Outlet A distance 2.5km -> ₹30.00 delivery
    // Outlet B distance 4.0km -> ₹40.00 delivery
    // Total delivery fees = 30 + 40 = 70.00
    assert.strictEqual(pricing.deliveryFeeInr, 70.0);

    // Packaging: ₹15 per outlet * 2 outlets = ₹30.00
    assert.strictEqual(pricing.packagingFeeInr, 30.0);

    // Platform fee: ₹5 charged once per unified checkout
    assert.strictEqual(pricing.platformFeeInr, 5.0);

    // 5% GST on 925.00 = 46.25
    assert.strictEqual(pricing.gstAmountInr, 46.25);

    // Final payable = 925 + 70 + 30 + 5 + 46.25 = 1076.25
    assert.strictEqual(pricing.finalPayableAmountInr, 1076.25);

    // Verify outletsBreakdown array
    assert.ok(pricing.outletsBreakdown);
    assert.strictEqual(pricing.outletsBreakdown.length, 2);

    const outletA = pricing.outletsBreakdown.find((o) => o.outletId === 'outlet_biryani_anna_nagar');
    assert.ok(outletA);
    assert.strictEqual(outletA.itemsSubtotalInr, 700.0);
    assert.strictEqual(outletA.deliveryFeeInr, 30.0);
    assert.strictEqual(outletA.packagingFeeInr, 15.0);
    assert.strictEqual(outletA.gstAmountInr, 35.0);

    const outletB = pricing.outletsBreakdown.find((o) => o.outletId === 'outlet_zepto_grocery');
    assert.ok(outletB);
    assert.strictEqual(outletB.itemsSubtotalInr, 225.0);
    assert.strictEqual(outletB.deliveryFeeInr, 40.0);
    assert.strictEqual(outletB.packagingFeeInr, 15.0);
    assert.strictEqual(outletB.gstAmountInr, 11.25);
  });

  it('2. Single-Merchant Backwards Compatibility: When single outlet is present, pricing matches standard rates', async () => {
    const pricingService = new DeliveryPricingService(
      mockPricingRepo,
      mockSurgeCalculator,
      mockCouponsService
    );

    const cartItems = [
      {
        item_id: 'item_mutton_biryani',
        outlet_id: 'outlet_biryani_anna_nagar',
        quantity: 2,
      },
    ];

    const customerLocation = { latitude: 13.0827, longitude: 80.2707 };
    const pricing = await pricingService.calculateCheckoutTotals(
      cartItems,
      'outlet_biryani_anna_nagar',
      customerLocation
    );

    assert.strictEqual(pricing.itemsSubtotalInr, 700.0);
    assert.strictEqual(pricing.deliveryFeeInr, 30.0);
    assert.strictEqual(pricing.packagingFeeInr, 15.0);
    assert.strictEqual(pricing.platformFeeInr, 5.0);
    assert.strictEqual(pricing.gstAmountInr, 35.0);
    assert.strictEqual(pricing.finalPayableAmountInr, 785.0);
    assert.strictEqual(pricing.outletsBreakdown?.length, 1);
  });

  it('3. OrderPlacementService: Places unified order with 1 order_group and 2 sub_orders for multi-merchant cart', async () => {
    const mockDb: any = {
      getPool: () => ({
        connect: async () => ({
          query: async () => ({ rows: [] }),
          release: () => {},
        }),
      }),
    };

    let insertedOrderGroup: any = null;
    const insertedSubOrders: any[] = [];
    const insertedOrderItems: any[] = [];
    let cartCleared = false;

    const mockOrderRepo: any = {
      findSessionByIdempotency: async () => null,
      insertCheckoutSession: async () => {},
      insertOrderGroup: async (_client: any, data: any) => {
        insertedOrderGroup = data;
        return 'group_unified_999';
      },
      insertSubOrder: async (_client: any, data: any) => {
        insertedSubOrders.push(data);
        return {
          id: `sub_ord_${data.outletId}`,
          sub_order_number: data.subOrderNumber,
        };
      },
      insertOrderItem: async (_client: any, data: any) => {
        insertedOrderItems.push(data);
        return `item_row_${insertedOrderItems.length}`;
      },
      insertCustomization: async () => {},
      insertDiscountAllocation: async () => {},
      clearCart: async () => {
        cartCleared = true;
      },
    };

    const mockCartService: any = {
      getCart: async () => ({
        cartId: 'cart_multi_123',
        outlet: { id: 'outlet_biryani_anna_nagar', name: 'Buhari Biryani' },
        items: [
          {
            itemId: 'item_mutton_biryani',
            name: 'Special Mutton Biryani',
            outletId: 'outlet_biryani_anna_nagar',
            verticalType: 'FOOD',
            quantity: 2,
            unitPriceInr: 350.0,
            totalPriceInr: 700.0,
          },
          {
            itemId: 'item_organic_milk',
            name: 'Fresh Organic Milk 1L',
            outletId: 'outlet_zepto_grocery',
            verticalType: 'GROCERY',
            quantity: 3,
            unitPriceInr: 75.0,
            totalPriceInr: 225.0,
          },
        ],
      }),
    };

    const mockAddressService: any = {
      getSavedAddress: async () => ({
        id: 'addr_home',
        latitude: 13.0827,
        longitude: 80.2707,
        address_line1: 'Anna Salai, Chennai',
      }),
      validateServiceability: async () => true,
    };

    const mockPricingService: any = {
      calculateCheckoutTotals: async () => ({
        itemsSubtotalInr: 925.0,
        deliveryFeeInr: 70.0,
        packagingFeeInr: 30.0,
        platformFeeInr: 5.0,
        gstAmountInr: 46.25,
        discountAmountInr: 0,
        finalPayableAmountInr: 1076.25,
        itemsBreakdown: [
          { itemId: 'item_mutton_biryani', itemName: 'Special Mutton Biryani', unitPriceInr: 350.0, quantity: 2, totalPriceInr: 700.0 },
          { itemId: 'item_organic_milk', itemName: 'Fresh Organic Milk 1L', unitPriceInr: 75.0, quantity: 3, totalPriceInr: 225.0 },
        ],
        outletsBreakdown: [
          { outletId: 'outlet_biryani_anna_nagar', itemsSubtotalInr: 700.0, deliveryFeeInr: 30.0, packagingFeeInr: 15.0, gstAmountInr: 35.0, distanceKm: 2.5, itemCount: 2 },
          { outletId: 'outlet_zepto_grocery', itemsSubtotalInr: 225.0, deliveryFeeInr: 40.0, packagingFeeInr: 15.0, gstAmountInr: 11.25, distanceKm: 4.0, itemCount: 3 },
        ],
      }),
    };

    let paymentInitiatedWithAmount = 0;
    const mockPaymentService: any = {
      initiatePayment: async (_ogId: string, _soId: string, _cId: string, _method: string, amount: number) => {
        paymentInitiatedWithAmount = amount;
        return { paymentId: 'pay_multi_1076', status: 'INITIATED' };
      },
    };

    const reservedOutlets: string[] = [];
    const mockInventoryReservation: any = {
      reserveInventory: async (_client: any, _session: any, outletId: string) => {
        reservedOutlets.push(outletId);
      },
    };

    const placementService = new OrderPlacementService(
      mockDb,
      mockOrderRepo,
      { recordEvent: async () => {} } as any,
      mockCartService,
      mockPricingService,
      mockAddressService,
      mockInventoryReservation,
      mockPaymentService
    );

    const orderRes = await placementService.placeOrder(
      'cust_multi_test',
      {
        deliveryAddressId: 'addr_home',
        paymentMethod: 'UPI',
      } as any,
      async () => ({})
    );

    // Verify Master Order Group
    assert.ok(orderRes);
    assert.strictEqual(orderRes.orderGroupId, 'group_unified_999');
    assert.strictEqual(insertedOrderGroup.finalPayableAmountInr, 1076.25);
    assert.strictEqual(insertedOrderGroup.itemsSubtotalInr, 925.0);
    assert.strictEqual(insertedOrderGroup.totalDeliveryFeesInr || insertedOrderGroup.deliveryFeeInr, 70.0);

    // Verify 2 Distinct Sub-Orders were created
    assert.strictEqual(insertedSubOrders.length, 2);
    assert.strictEqual(insertedSubOrders[0].outletId, 'outlet_biryani_anna_nagar');
    assert.strictEqual(insertedSubOrders[0].verticalType, 'FOOD');
    assert.strictEqual(insertedSubOrders[0].itemsSubtotalInr, 700.0);

    assert.strictEqual(insertedSubOrders[1].outletId, 'outlet_zepto_grocery');
    assert.strictEqual(insertedSubOrders[1].verticalType, 'GROCERY');
    assert.strictEqual(insertedSubOrders[1].itemsSubtotalInr, 225.0);

    // Verify inventory was reserved for both outlets
    assert.strictEqual(reservedOutlets.length, 2);
    assert.ok(reservedOutlets.includes('outlet_biryani_anna_nagar'));
    assert.ok(reservedOutlets.includes('outlet_zepto_grocery'));

    // Verify Order Items were created under their respective sub-orders
    assert.strictEqual(insertedOrderItems.length, 2);
    assert.strictEqual(insertedOrderItems[0].subOrderId, 'sub_ord_outlet_biryani_anna_nagar');
    assert.strictEqual(insertedOrderItems[1].subOrderId, 'sub_ord_outlet_zepto_grocery');

    // Verify single combined payment
    assert.strictEqual(paymentInitiatedWithAmount, 1076.25);

    // Verify cart was cleared
    assert.strictEqual(cartCleared, true);

    // Verify response structure has both backward-compatible primarySubOrderId and subOrders array
    assert.strictEqual(orderRes.subOrderId, 'sub_ord_outlet_biryani_anna_nagar');
    assert.strictEqual(orderRes.subOrders.length, 2);
  });
});
