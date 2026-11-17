/**
 * AllGo Order Lifecycle Statuses
 *
 * Represents the discrete states of an order / sub-order from creation through
 * fulfillment or terminal failure.
 */
export declare const OrderStatus: {
    readonly CART: "CART";
    readonly PLACED: "PLACED";
    readonly PAYMENT_CONFIRMED: "PAYMENT_CONFIRMED";
    readonly MERCHANT_ACCEPTED: "MERCHANT_ACCEPTED";
    readonly PREPARING: "PREPARING";
    readonly READY: "READY";
    readonly PARTNER_ASSIGNED: "PARTNER_ASSIGNED";
    readonly PARTNER_AT_STORE: "PARTNER_AT_STORE";
    readonly PICKED_UP: "PICKED_UP";
    readonly OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY";
    readonly ARRIVED: "ARRIVED";
    readonly DELIVERED: "DELIVERED";
    readonly CANCELLED: "CANCELLED";
    readonly REFUNDED: "REFUNDED";
    readonly FAILED: "FAILED";
};
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
/**
 * Terminal states where no further standard forward transitions can occur
 */
export declare const TERMINAL_ORDER_STATUSES: readonly OrderStatus[];
/**
 * Active in-flight order statuses
 */
export declare const ACTIVE_ORDER_STATUSES: readonly OrderStatus[];
//# sourceMappingURL=order-status.enum.d.ts.map