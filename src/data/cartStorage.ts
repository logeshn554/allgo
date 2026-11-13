// Job: Save and load cart items separately for grocery, food, and parcel.

export type ServiceType = 'grocery' | 'food' | 'parcel';

export interface CartItem {
  id: string;
  title: string;
  priceCents: number;
  quantity: number;
}

const memoryCarts: Record<ServiceType, CartItem[]> = { grocery: [], food: [], parcel: [] };

export function loadCartItems(service: ServiceType): CartItem[] {
  return [...memoryCarts[service]];
}

export function saveItemToCart(service: ServiceType, newItem: CartItem): CartItem[] {
  const list = memoryCarts[service];
  const existing = list.find((i) => i.id === newItem.id);
  if (existing) {
    existing.quantity += newItem.quantity;
  } else {
    list.push({ ...newItem });
  }
  return loadCartItems(service);
}

export function clearSavedCart(service: ServiceType): void {
  memoryCarts[service] = [];
}
