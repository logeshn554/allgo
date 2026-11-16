// Job: Order grace period tracking (60-120s window) for penalty-free modification and instant refund cancellation.

import { loadOrderById, updateOrderStatus, updateOrderItems } from './orderStorage.ts';
import type { SavedOrder } from './orderStorage.ts';
import type { CartItem } from './cartStorage.ts';
import { creditWallet, debitWallet } from './walletStorage.ts';

export interface GracePeriodStatus {
  orderId: string;
  isWithinGracePeriod: boolean;
  secondsRemaining: number;
  totalGracePeriodSeconds: number;
  canCancelWithoutPenalty: boolean;
  canModifyItems: boolean;
}

const DEFAULT_GRACE_PERIOD_SECONDS = 90; // 90 seconds grace window

// In-memory or persisted map of order creation timestamps
const orderTimestamps = new Map<string, number>();

export function recordOrderCreatedAt(orderId: string, timestampMs?: number): void {
  orderTimestamps.set(orderId, timestampMs ?? Date.now());
}

export function getOrderGracePeriodStatus(
  orderId: string,
  graceDurationSeconds: number = DEFAULT_GRACE_PERIOD_SECONDS
): GracePeriodStatus {
  const order = loadOrderById(orderId);
  if (!order) {
    return {
      orderId,
      isWithinGracePeriod: false,
      secondsRemaining: 0,
      totalGracePeriodSeconds: graceDurationSeconds,
      canCancelWithoutPenalty: false,
      canModifyItems: false,
    };
  }

  // Grace period only valid before merchant accepts (status === 'confirmed')
  if (order.status !== 'confirmed') {
    return {
      orderId,
      isWithinGracePeriod: false,
      secondsRemaining: 0,
      totalGracePeriodSeconds: graceDurationSeconds,
      canCancelWithoutPenalty: false,
      canModifyItems: false,
    };
  }

  const createdAt = orderTimestamps.get(orderId) || Date.now();
  const elapsedSeconds = Math.floor((Date.now() - createdAt) / 1000);
  const remaining = Math.max(0, graceDurationSeconds - elapsedSeconds);
  const isWithin = remaining > 0;

  return {
    orderId,
    isWithinGracePeriod: isWithin,
    secondsRemaining: remaining,
    totalGracePeriodSeconds: graceDurationSeconds,
    canCancelWithoutPenalty: isWithin,
    canModifyItems: isWithin,
  };
}

export function cancelOrderWithinGracePeriod(
  orderId: string
): { success: boolean; message: string; refundedAmountCents: number } {
  const status = getOrderGracePeriodStatus(orderId);
  const order = loadOrderById(orderId);

  if (!order) {
    return { success: false, message: 'Order not found.', refundedAmountCents: 0 };
  }

  if (!status.canCancelWithoutPenalty) {
    return {
      success: false,
      message: 'Grace period has expired or merchant has accepted order. Standard cancellation policy applies.',
      refundedAmountCents: 0,
    };
  }

  // Cancel order with explicit cancelled state
  updateOrderStatus(orderId, 'cancelled');
  // 100% Instant refund to customer digital wallet
  creditWallet(order.totalCents, `100% Instant Refund for Cancelled Order ${orderId}`, orderId);

  return {
    success: true,
    message: `Order successfully cancelled within grace period. ₹${(order.totalCents / 100).toFixed(0)} credited instantly to your wallet.`,
    refundedAmountCents: order.totalCents,
  };
}

export function modifyOrderItemsWithinGracePeriod(
  orderId: string,
  newItems: CartItem[]
): { success: boolean; message: string; updatedOrder?: SavedOrder; priceDifferenceCents: number } {
  const status = getOrderGracePeriodStatus(orderId);
  const order = loadOrderById(orderId);

  if (!order) {
    return { success: false, message: 'Order not found.', priceDifferenceCents: 0 };
  }

  if (!status.canModifyItems) {
    return {
      success: false,
      message: 'Modification grace period expired or order has already been accepted.',
      priceDifferenceCents: 0,
    };
  }

  if (!newItems || newItems.length === 0) {
    return {
      success: false,
      message: 'Order must contain at least one item. To cancel, please use cancel order.',
      priceDifferenceCents: 0,
    };
  }

  const newTotalCents = newItems.reduce((acc, it) => acc + it.priceCents * it.quantity, 0);
  const diffCents = newTotalCents - order.totalCents;

  if (diffCents < 0) {
    // New total is less: refund difference to customer wallet
    const refundCents = Math.abs(diffCents);
    creditWallet(refundCents, `Refund for modified order ${orderId}`, orderId);
  } else if (diffCents > 0) {
    // New total is higher: debit wallet if balance permits
    const debitRes = debitWallet(diffCents, `Additional charge for modified order ${orderId}`, orderId);
    if (!debitRes.success) {
      return {
        success: false,
        message: `Insufficient wallet balance to add items (needs ₹${(diffCents / 100).toFixed(0)} more).`,
        priceDifferenceCents: diffCents,
      };
    }
  }

  const updated = updateOrderItems(orderId, newItems, newTotalCents);
  return {
    success: true,
    message: `Order items updated successfully. Total is now ₹${(newTotalCents / 100).toFixed(0)}.`,
    updatedOrder: updated,
    priceDifferenceCents: diffCents,
  };
}
