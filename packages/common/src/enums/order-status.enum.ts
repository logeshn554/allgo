/**
 * AllGo Order Lifecycle Statuses
 *
 * Represents the discrete states of an order / sub-order from creation through
 * fulfillment or terminal failure.
 */
export enum OrderStatus {
  CART = 'CART',
  PLACED = 'PLACED',
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED',
  MERCHANT_ACCEPTED = 'MERCHANT_ACCEPTED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  PARTNER_ASSIGNED = 'PARTNER_ASSIGNED',
  PARTNER_AT_STORE = 'PARTNER_AT_STORE',
  PICKED_UP = 'PICKED_UP',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  ARRIVED = 'ARRIVED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED',
}

/**
 * Terminal states where no further standard forward transitions can occur
 */
export const TERMINAL_ORDER_STATUSES: readonly OrderStatus[] = [
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
  OrderStatus.REFUNDED,
  OrderStatus.FAILED,
];

/**
 * Active in-flight order statuses
 */
export const ACTIVE_ORDER_STATUSES: readonly OrderStatus[] = [
  OrderStatus.PLACED,
  OrderStatus.PAYMENT_CONFIRMED,
  OrderStatus.MERCHANT_ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.PARTNER_ASSIGNED,
  OrderStatus.PARTNER_AT_STORE,
  OrderStatus.PICKED_UP,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.ARRIVED,
];
