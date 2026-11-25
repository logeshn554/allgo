// Job: Calculate verified order subtotal, delivery fee, tax, and total.

import type { CartItem } from './cartStorage.ts';

export interface OrderPriceSummary {
  subtotalCents: number;
  deliveryFeeCents: number;
  taxCents: number;
  totalCents: number;
}

export function calculateOrderPrice(items: CartItem[], distanceKm: number): OrderPriceSummary {
  const subtotalCents = items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);
  const safeDistance = Math.max(0, Math.min(distanceKm, 25));
  const deliveryFeeCents = Math.round(3000 + safeDistance * 1200);
  const taxCents = Math.round((subtotalCents + deliveryFeeCents) * 0.05);
  const totalCents = subtotalCents + deliveryFeeCents + taxCents;

  return { subtotalCents, deliveryFeeCents, taxCents, totalCents };
}
