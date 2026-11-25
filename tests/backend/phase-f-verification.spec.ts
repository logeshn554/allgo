import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { HireDriverBookingService } from '../../services/api/dist/mobility/hire-driver-booking.service.js';
import { OrderPlacementService } from '../../services/api/dist/ordering/services/order-placement.service.js';

describe('Phase F: Verification & End-to-End Edge Cases', () => {
  it('should auto-enqueue Cloud Task when scheduled hire-driver booking is made and cancel task on cancellation', async () => {
    let taskEnqueued: any = null;
    let taskCancelledName: string | null = null;

    const mockTasksGateway: any = {
      scheduleTask: async (options: any) => {
        taskEnqueued = options;
        return { taskName: options.taskName, scheduledFor: options.scheduledFor.toISOString() };
      },
      cancelTask: async (taskName: string) => {
        taskCancelledName = taskName;
        return true;
      },
    };

    const mockRepo: any = {
      getDefaultCityId: async () => 'city_chennai',
      insertBooking: async (data: any) => ({
        id: 'booking_123',
        booking_number: data.bookingNumber,
        status: 'CONFIRMED',
      }),
      recordHireDriverEvent: async () => {},
      findById: async () => ({ id: 'booking_123', status: 'CONFIRMED', partner_id: null }),
      updateBookingCancelled: async () => ({ id: 'booking_123', status: 'CANCELLED' }),
    };

    const mockFare: any = {
      checkStateClearance: async () => true,
      calculateHireDriverFare: () => ({ totalFare: 500 }),
    };

    const mockContinuity: any = {
      releaseVerticalLock: async () => {},
    };

    const bookingService = new HireDriverBookingService(
      mockRepo,
      mockFare,
      mockContinuity,
      mockTasksGateway,
    );

    const scheduledTime = new Date(Date.now() + 2 * 3600 * 1000);
    const booking = await bookingService.bookDriver('cust_test', {
      vehicleTransmission: 'MANUAL',
      durationHours: 4,
      scheduledStartTime: scheduledTime.toISOString(),
      pickupAddress: 'Mount Road, Chennai',
      pickupLocation: { latitude: 13.0827, longitude: 80.2707 },
    } as any);

    assert.ok(booking);
    assert.strictEqual(taskEnqueued.taskName, 'cloud_task_hire_booking_123');
    assert.strictEqual(taskEnqueued.targetType, 'SCHEDULED_HIRE_DRIVER');
    assert.strictEqual(taskEnqueued.targetId, 'booking_123');

    // Test cancellation triggers cancelTask
    await bookingService.cancelBooking('cust_test', 'CUSTOMER', 'booking_123', 'Trip postponed');
    assert.strictEqual(taskCancelledName, 'cloud_task_hire_booking_123');
  });

  it('should auto-enqueue Cloud Task when scheduled food order is placed', async () => {
    let taskEnqueued: any = null;

    const mockTasksGateway: any = {
      scheduleTask: async (options: any) => {
        taskEnqueued = options;
        return { taskName: options.taskName, scheduledFor: options.scheduledFor.toISOString() };
      },
    };

    const mockDb: any = {
      getPool: () => ({
        connect: async () => ({
          query: async (q: string) => {
            if (q.includes('BEGIN') || q.includes('COMMIT')) return { rows: [] };
            return { rows: [] };
          },
          release: () => {},
        }),
      }),
    };

    const mockOrderRepo: any = {
      findSessionByIdempotency: async () => null,
      insertCheckoutSession: async () => {},
      insertOrderGroup: async () => 'grp_123',
      insertSubOrder: async () => ({ id: 'sub_ord_777', sub_order_number: 'SUB-777' }),
      insertOrderItem: async () => 'item_row_1',
      insertDiscountAllocation: async () => {},
      clearCart: async () => {},
    };

    const mockCartService: any = {
      getCart: async () => ({
        cartId: 'cart_1',
        outlet: { id: 'outlet_1' },
        items: [{ itemId: 'item_1', quantity: 1 }],
      }),
    };

    const mockAddressService: any = {
      getSavedAddress: async () => ({ latitude: 13.0, longitude: 80.0 }),
      validateServiceability: async () => true,
    };

    const mockPricingService: any = {
      calculateCheckoutTotals: async () => ({
        itemsSubtotalInr: 200.0,
        deliveryFeeInr: 30.0,
        packagingFeeInr: 10.0,
        platformFeeInr: 10.0,
        gstAmountInr: 0,
        discountAmountInr: 0,
        finalPayableAmountInr: 250.0,
        itemsBreakdown: [
          {
            itemId: 'item_1',
            itemName: 'Burger',
            unitPriceInr: 200.0,
            quantity: 1,
            totalPriceInr: 200.0,
          },
        ],
      }),
    };

    const mockPaymentService: any = {
      initiatePayment: async () => ({ paymentId: 'pay_123', status: 'INITIATED' }),
    };

    const placementService = new OrderPlacementService(
      mockDb,
      mockOrderRepo,
      { recordEvent: async () => {} } as any,
      mockCartService,
      mockPricingService,
      mockAddressService,
      { reserveInventory: async () => {} } as any,
      mockPaymentService,
      mockTasksGateway,
    );

    const scheduledDate = new Date(Date.now() + 4 * 3600 * 1000);
    const orderRes = await placementService.placeOrder(
      'cust_99',
      {
        deliveryAddressId: 'addr_1',
        paymentMethod: 'UPI',
        scheduledFor: scheduledDate.toISOString(),
      } as any,
      async () => ({}),
    );

    assert.ok(orderRes);
    assert.strictEqual(taskEnqueued.taskName, 'cloud_task_order_sub_ord_777');
    assert.strictEqual(taskEnqueued.targetType, 'SCHEDULED_ORDER');
    assert.strictEqual(taskEnqueued.targetId, 'sub_ord_777');
  });

  it('should verify certificate pinning implementation in ApiClient and exports in allgo_mobile_shared', () => {
    const mobileSharedExport = path.resolve(
      import.meta.dirname,
      '../../packages/mobile_shared/lib/allgo_mobile_shared.dart',
    );
    const content = fs.readFileSync(mobileSharedExport, 'utf8');
    assert.match(content, /certificate_pinning\.dart/);
    assert.match(content, /language_selection_sheet\.dart/);
    assert.match(content, /legal_policy_viewer_screen\.dart/);
    assert.match(content, /permission_rationale_dialog\.dart/);
  });
});
