import { CartItem } from './cartStorage';

export interface OrderPriceSummary {
  subtotalCents: number;
  deliveryFeeCents: number;
  taxCents: number;
  totalCents: number;
}

export function calculateOrderPrice(items: CartItem[], distanceKm: number): OrderPriceSummary {
  const subtotalCents = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  const baseFeeCents = 3000;
  const perKmCents = 1200;
  const safeDistance = Math.max(0, Math.min(distanceKm, 25));

  const deliveryFeeCents = Math.round(baseFeeCents + safeDistance * perKmCents);
  const taxCents = Math.round((subtotalCents + deliveryFeeCents) * 0.05);
  const totalCents = subtotalCents + deliveryFeeCents + taxCents;

  return { subtotalCents, deliveryFeeCents, taxCents, totalCents };
}
