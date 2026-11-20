// Job: Real-time KDS order state management, batch picking check-off, OOS substitution handling, and custody handover OTP verification.

import { apiPost, apiGet } from './apiClient.ts';
import { loadFromCache, saveToCache } from './localCache.ts';

export interface KdsOrderItem {
  id: string;
  name: string;
  sku: string;
  aisle: string;
  category: string;
  quantity: number;
  priceCents: number;
  isPicked?: boolean;
  isOos?: boolean;
  notes?: string;
}

export interface KdsLiveOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  status: 'NEW' | 'ACCEPTED' | 'PREPARING' | 'READY_FOR_PICKUP' | 'PICKED_UP' | 'REJECTED';
  items: KdsOrderItem[];
  totalCents: number;
  prepTimeMinutes: number;
  secondsRemaining: number; // 90s countdown for NEW orders
  createdAt: string;
  handoverOtp: string;
  sealedBagsCount?: number;
  substitutionRule: 'BEST_MATCH' | 'CALL_ME' | 'REFUND_ITEM';
  refundedCents?: number;
}

const INITIAL_KDS_ORDERS: KdsLiveOrder[] = [
  {
    id: 'ORD-KDS-101',
    customerName: 'Priya Ramanathan',
    customerPhone: '+91 98450 11223',
    status: 'NEW',
    items: [
      { id: 'item_1', name: 'Nandini GoodLife Milk (500ml)', sku: 'SKU-DRY-01', aisle: 'Dairy - Aisle 1', category: 'Dairy', quantity: 2, priceCents: 6000 },
      { id: 'item_2', name: 'Whole Wheat Sandwich Bread (400g)', sku: 'SKU-BKR-04', aisle: 'Bakery - Aisle 2', category: 'Bakery', quantity: 1, priceCents: 5000 },
      { id: 'item_3', name: 'Farm Fresh Organic Eggs (6pk)', sku: 'SKU-DRY-09', aisle: 'Dairy - Aisle 1', category: 'Dairy', quantity: 1, priceCents: 7500 },
    ],
    totalCents: 18500,
    prepTimeMinutes: 15,
    secondsRemaining: 90,
    createdAt: new Date().toISOString(),
    handoverOtp: '4821',
    substitutionRule: 'BEST_MATCH',
  },
  {
    id: 'ORD-KDS-102',
    customerName: 'Karthik Subbaraj',
    customerPhone: '+91 97410 44556',
    status: 'PREPARING',
    items: [
      { id: 'item_4', name: 'Chettinad Pepper Chicken', sku: 'SKU-KIT-11', aisle: 'Kitchen Station 2', category: 'Hot Food', quantity: 1, priceCents: 32000, isPicked: true },
      { id: 'item_5', name: 'Butter Garlic Naan (2 pcs)', sku: 'SKU-KIT-02', aisle: 'Tandoor Station 1', category: 'Hot Food', quantity: 2, priceCents: 14000, isPicked: false },
    ],
    totalCents: 46000,
    prepTimeMinutes: 20,
    secondsRemaining: 0,
    createdAt: new Date(Date.now() - 300000).toISOString(),
    handoverOtp: '9120',
    substitutionRule: 'REFUND_ITEM',
  },
];

export function loadKdsOrders(): KdsLiveOrder[] {
  return loadFromCache<KdsLiveOrder[]>('allgo_kds_orders', INITIAL_KDS_ORDERS);
}

export function saveKdsOrders(orders: KdsLiveOrder[]): void {
  saveToCache('allgo_kds_orders', orders);
}

export async function acceptKdsOrder(orderId: string, prepTimeMinutes = 20): Promise<KdsLiveOrder | null> {
  const orders = loadKdsOrders();
  const target = orders.find((o) => o.id === orderId);
  if (!target) return null;

  target.status = 'PREPARING';
  target.prepTimeMinutes = prepTimeMinutes;
  target.secondsRemaining = 0;
  saveKdsOrders(orders);

  try {
    await apiPost(`/v1/merchants/orders/${orderId}/accept`, { prepTimeMinutes });
  } catch {
    // Local offline state updated
  }
  return target;
}

export async function rejectKdsOrder(orderId: string, reason = 'Store peak overload'): Promise<boolean> {
  const orders = loadKdsOrders();
  const target = orders.find((o) => o.id === orderId);
  if (!target) return false;

  target.status = 'REJECTED';
  saveKdsOrders(orders);

  try {
    await apiPost(`/v1/merchants/orders/${orderId}/reject`, { reason });
  } catch {
    // Local offline state updated
  }
  return true;
}

export function toggleItemPicked(orderId: string, itemId: string): KdsLiveOrder | null {
  const orders = loadKdsOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order) return null;

  const item = order.items.find((i) => i.id === itemId);
  if (item && !item.isOos) {
    item.isPicked = !item.isPicked;
  }

  // If all non-OOS items picked, mark ready for pickup
  const allPicked = order.items.every((i) => i.isOos || i.isPicked);
  if (allPicked && order.status === 'PREPARING') {
    order.status = 'READY_FOR_PICKUP';
  }

  saveKdsOrders(orders);
  return order;
}

export function flagItemOutOfStock(
  orderId: string,
  itemId: string
): { order: KdsLiveOrder | null; refundCents: number; message: string } {
  const orders = loadKdsOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order) return { order: null, refundCents: 0, message: 'Order not found' };

  const item = order.items.find((i) => i.id === itemId);
  if (!item) return { order, refundCents: 0, message: 'Item not found' };

  item.isOos = true;
  item.isPicked = false;

  const refundAmount = item.priceCents * item.quantity;
  order.refundedCents = (order.refundedCents || 0) + refundAmount;
  order.totalCents = Math.max(0, order.totalCents - refundAmount);

  saveKdsOrders(orders);

  let msg = '';
  if (order.substitutionRule === 'REFUND_ITEM') {
    msg = `Item 86ed. ₹${(refundAmount / 100).toFixed(0)} refunded to customer's wallet.`;
  } else if (order.substitutionRule === 'BEST_MATCH') {
    msg = `Item flagged OOS. Customer requested best match replacement.`;
  } else {
    msg = `Item flagged OOS. Customer requested phone call before substitution (${order.customerPhone}).`;
  }

  return { order, refundCents: refundAmount, message: msg };
}

export function completeDriverHandover(
  orderId: string,
  enteredOtp: string,
  sealedBagsCount: number
): { success: boolean; message: string; order?: KdsLiveOrder } {
  if (sealedBagsCount < 1) {
    return { success: false, message: 'Please enter at least 1 verified sealed bag count.' };
  }

  const orders = loadKdsOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order) return { success: false, message: 'Order not found.' };

  if (order.handoverOtp !== enteredOtp.trim()) {
    return { success: false, message: 'Invalid 4-digit Driver Handover PIN.' };
  }

  order.status = 'PICKED_UP';
  order.sealedBagsCount = sealedBagsCount;
  saveKdsOrders(orders);

  return {
    success: true,
    message: `Custody transferred! ${sealedBagsCount} sealed bags handed over to driver partner.`,
    order,
  };
}
