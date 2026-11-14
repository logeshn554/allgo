// Job: Order grace period tracking (60-120s window) for penalty-free modification and instant refund cancellation.

import { loadOrderById, updateOrderStatus } from './orderStorage.ts';
import type { SavedOrder } from './orderStorage.ts';
import { creditWallet } from './walletStorage.ts';

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

  // Cancel order
  updateOrderStatus(orderId, 'delivered'); // Mark finished/cancelled in local state
  // 100% Instant refund to customer digital wallet
  creditWallet(order.totalCents, `100% Instant Refund for Cancelled Order ${orderId}`, orderId);

  return {
    success: true,
    message: `Order successfully cancelled within grace period. ₹${(order.totalCents / 100).toFixed(0)} credited instantly to your wallet.`,
    refundedAmountCents: order.totalCents,
  };
}
