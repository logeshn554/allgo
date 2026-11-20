import { z } from 'zod';

/**
 * Strict Unified Order Status Contract across all verticals
 */
export const OrderStatus = {
  // Phase 1 Canonical Lifecycle States
  CREATED: 'CREATED',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  CONFIRMED: 'CONFIRMED',
  MERCHANT_ACCEPTED: 'MERCHANT_ACCEPTED',
  PREPARING: 'PREPARING',
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',
  DISPATCHING: 'DISPATCHING',
  DRIVER_ASSIGNED: 'DRIVER_ASSIGNED',
  ARRIVED_AT_PICKUP: 'ARRIVED_AT_PICKUP',
  PICKED_UP: 'PICKED_UP',
  IN_TRANSIT: 'IN_TRANSIT',
  ARRIVED_AT_DROP: 'ARRIVED_AT_DROP',
  DELIVERED: 'DELIVERED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  DISPUTED: 'DISPUTED',

  // Backwards-compatible aliases
  CART: 'CART',
  PLACED: 'PLACED',
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  READY: 'READY',
  PARTNER_ASSIGNED: 'PARTNER_ASSIGNED',
  PARTNER_AT_STORE: 'PARTNER_AT_STORE',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  ARRIVED: 'ARRIVED',
  REFUNDED: 'REFUNDED',
  FAILED: 'FAILED',
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const OrderStatusSchema = z.nativeEnum(OrderStatus);
