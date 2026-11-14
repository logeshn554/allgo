// Job: Verify the 4-digit handover PIN and lock after 3 wrong tries to prevent false drop-offs.

import { loadOrderById, updateOrderStatus } from './orderStorage.ts';

const failedTriesByOrder = new Map<string, number>();

export function verifyDeliveryPin(orderId: string, enteredPin: string): { ok: boolean; message: string } {
  const tries = failedTriesByOrder.get(orderId) || 0;
  if (tries >= 3) return { ok: false, message: 'Order locked after 3 wrong PIN tries.' };

  const order = loadOrderById(orderId);
  if (!order) return { ok: false, message: 'Order not found.' };

  if (order.otpPin !== enteredPin) {
    failedTriesByOrder.set(orderId, tries + 1);
    return { ok: false, message: `Wrong PIN. ${2 - tries} tries left.` };
  }

  failedTriesByOrder.delete(orderId);
  updateOrderStatus(orderId, 'delivered');
  return { ok: true, message: 'Delivery verified!' };
}
