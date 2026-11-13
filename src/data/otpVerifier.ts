import { loadOrderById, updateOrderStatus } from './orderStorage';

const failedTriesByOrder = new Map<string, number>();

export function verifyDeliveryPin(orderId: string, enteredPin: string): { ok: boolean; message: string } {
  const currentTries = failedTriesByOrder.get(orderId) || 0;
  if (currentTries >= 3) {
    return { ok: false, message: 'Order locked after 3 wrong PIN tries.' };
  }

  const order = loadOrderById(orderId);
  if (!order) return { ok: false, message: 'Order not found.' };

  if (order.otpPin !== enteredPin) {
    const nextTries = currentTries + 1;
    failedTriesByOrder.set(orderId, nextTries);
    return { ok: false, message: `Wrong PIN. ${3 - nextTries} tries left.` };
  }

  failedTriesByOrder.delete(orderId);
  updateOrderStatus(orderId, 'delivered');
  return { ok: true, message: 'Delivery complete!' };
}
