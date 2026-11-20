import { OrderStatus } from '../contracts/order-status.ts';

export { OrderStatus };
export type { OrderStatus as OrderStatusType };

/**
 * Terminal states where no further standard forward transitions can occur
 */
export const TERMINAL_ORDER_STATUSES: readonly OrderStatus[] = [
  OrderStatus.DELIVERED,
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED,
  OrderStatus.REFUNDED,
  OrderStatus.FAILED,
];

/**
 * Active in-flight order statuses
 */
export const ACTIVE_ORDER_STATUSES: readonly OrderStatus[] = [
  OrderStatus.CREATED,
  OrderStatus.PAYMENT_PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PLACED,
  OrderStatus.PAYMENT_CONFIRMED,
  OrderStatus.MERCHANT_ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.READY_FOR_PICKUP,
  OrderStatus.DISPATCHING,
  OrderStatus.DRIVER_ASSIGNED,
  OrderStatus.PARTNER_ASSIGNED,
  OrderStatus.PARTNER_AT_STORE,
  OrderStatus.ARRIVED_AT_PICKUP,
  OrderStatus.PICKED_UP,
  OrderStatus.IN_TRANSIT,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.ARRIVED,
  OrderStatus.ARRIVED_AT_DROP,
];
