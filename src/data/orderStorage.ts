// Job: Save new orders and load orders with persistent storage and backend sync.

import type { CartItem } from './cartStorage.ts';
import { getLocalItem, setLocalItem } from './localCache.ts';
import { recordOrderCreatedAt } from './orderModificationService.ts';

export type OrderStep = 'confirmed' | 'matched' | 'on_the_way' | 'delivered' | 'cancelled';

export interface SavedOrder {
  id: string;
  items: CartItem[];
  totalCents: number;
  status: OrderStep;
  otpPin: string;
  etaMinutes: number;
}

function getOrdersMap(): Map<string, SavedOrder> {
  const raw = getLocalItem('orders_map');
  if (!raw) return new Map();
  try {
    const list: SavedOrder[] = JSON.parse(raw);
    return new Map(list.map((o) => [o.id, o]));
  } catch (_e) {
    return new Map();
  }
}

function persistOrdersMap(map: Map<string, SavedOrder>): void {
  setLocalItem('orders_map', JSON.stringify(Array.from(map.values())));
}

export function saveNewOrder(items: CartItem[], totalCents: number): SavedOrder {
  const id = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
  // 4-digit verification handover PIN to prevent false drop-offs
  const otpPin = String(Math.floor(1000 + Math.random() * 9000));
  const order: SavedOrder = { id, items, totalCents, status: 'confirmed', otpPin, etaMinutes: 18 };

  recordOrderCreatedAt(id);
  const map = getOrdersMap();
  map.set(id, order);
  persistOrdersMap(map);
  return order;
}

export function loadOrderById(orderId: string): SavedOrder | undefined {
  const map = getOrdersMap();
  return map.get(orderId);
}

export function loadAllOrders(): SavedOrder[] {
  const map = getOrdersMap();
  return Array.from(map.values()).reverse();
}

export function updateOrderStatus(orderId: string, nextStatus: OrderStep): SavedOrder | undefined {
  const map = getOrdersMap();
  const order = map.get(orderId);
  if (!order) return undefined;

  order.status = nextStatus;
  map.set(orderId, order);
  persistOrdersMap(map);
  return order;
}

export function updateOrderItems(orderId: string, items: CartItem[], totalCents: number): SavedOrder | undefined {
  const map = getOrdersMap();
  const order = map.get(orderId);
  if (!order) return undefined;

  order.items = items;
  order.totalCents = totalCents;
  map.set(orderId, order);
  persistOrdersMap(map);
  return order;
}
