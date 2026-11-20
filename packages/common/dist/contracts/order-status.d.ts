import { z } from 'zod';
/**
 * Strict Unified Order Status Contract across all verticals
 */
export declare const OrderStatus: {
    readonly CREATED: "CREATED";
    readonly PAYMENT_PENDING: "PAYMENT_PENDING";
    readonly CONFIRMED: "CONFIRMED";
    readonly MERCHANT_ACCEPTED: "MERCHANT_ACCEPTED";
    readonly PREPARING: "PREPARING";
    readonly READY_FOR_PICKUP: "READY_FOR_PICKUP";
    readonly DISPATCHING: "DISPATCHING";
    readonly DRIVER_ASSIGNED: "DRIVER_ASSIGNED";
    readonly ARRIVED_AT_PICKUP: "ARRIVED_AT_PICKUP";
    readonly PICKED_UP: "PICKED_UP";
    readonly IN_TRANSIT: "IN_TRANSIT";
    readonly ARRIVED_AT_DROP: "ARRIVED_AT_DROP";
    readonly DELIVERED: "DELIVERED";
    readonly COMPLETED: "COMPLETED";
    readonly CANCELLED: "CANCELLED";
    readonly DISPUTED: "DISPUTED";
    readonly CART: "CART";
    readonly PLACED: "PLACED";
    readonly PAYMENT_CONFIRMED: "PAYMENT_CONFIRMED";
    readonly READY: "READY";
    readonly PARTNER_ASSIGNED: "PARTNER_ASSIGNED";
    readonly PARTNER_AT_STORE: "PARTNER_AT_STORE";
    readonly OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY";
    readonly ARRIVED: "ARRIVED";
    readonly REFUNDED: "REFUNDED";
    readonly FAILED: "FAILED";
};
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
export declare const OrderStatusSchema: z.ZodEnum<{
    readonly CREATED: "CREATED";
    readonly PAYMENT_PENDING: "PAYMENT_PENDING";
    readonly CONFIRMED: "CONFIRMED";
    readonly MERCHANT_ACCEPTED: "MERCHANT_ACCEPTED";
    readonly PREPARING: "PREPARING";
    readonly READY_FOR_PICKUP: "READY_FOR_PICKUP";
    readonly DISPATCHING: "DISPATCHING";
    readonly DRIVER_ASSIGNED: "DRIVER_ASSIGNED";
    readonly ARRIVED_AT_PICKUP: "ARRIVED_AT_PICKUP";
    readonly PICKED_UP: "PICKED_UP";
    readonly IN_TRANSIT: "IN_TRANSIT";
    readonly ARRIVED_AT_DROP: "ARRIVED_AT_DROP";
    readonly DELIVERED: "DELIVERED";
    readonly COMPLETED: "COMPLETED";
    readonly CANCELLED: "CANCELLED";
    readonly DISPUTED: "DISPUTED";
    readonly CART: "CART";
    readonly PLACED: "PLACED";
    readonly PAYMENT_CONFIRMED: "PAYMENT_CONFIRMED";
    readonly READY: "READY";
    readonly PARTNER_ASSIGNED: "PARTNER_ASSIGNED";
    readonly PARTNER_AT_STORE: "PARTNER_AT_STORE";
    readonly OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY";
    readonly ARRIVED: "ARRIVED";
    readonly REFUNDED: "REFUNDED";
    readonly FAILED: "FAILED";
}>;
//# sourceMappingURL=order-status.d.ts.map