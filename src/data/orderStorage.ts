// Job: Save new orders and load live order progress.

import { CartItem } from './cartStorage';

export type OrderStep = 'confirmed' | 'matched' | 'on_the_way' | 'delivered';

export interface SavedOrder {
  id: string;
  items: CartItem[];
  totalCents: number;
  status: OrderStep;
  otpPin: string;
  etaMinutes: number;
}

const savedOrders = new Map<string, SavedOrder>();

export function saveNewOrder(items: CartItem[], totalCents: number): SavedOrder {
  const id = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
  const otpPin = String(Math.floor(100000 + Math.random() * 900000));
  const order: SavedOrder = { id, items, totalCents, status: 'confirmed', otpPin, etaMinutes: 18 };
  savedOrders.set(id, order);
  return order;
}

export function loadOrderById(orderId: string): SavedOrder | undefined {
  return savedOrders.get(orderId);
}

export function updateOrderStatus(orderId: string, nextStatus: OrderStep): SavedOrder | undefined {
  const order = savedOrders.get(orderId);
  if (!order) return undefined;
  order.status = nextStatus;
  return order;
}
