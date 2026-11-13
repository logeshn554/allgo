export type ServiceType = 'grocery' | 'food' | 'parcel';

export interface CartItem {
  id: string;
  title: string;
  priceCents: number;
  quantity: number;
}

const memoryCarts: Record<ServiceType, CartItem[]> = {
  grocery: [],
  food: [],
  parcel: [],
};

export function loadCartItems(service: ServiceType): CartItem[] {
  return [...memoryCarts[service]];
}

export function saveItemToCart(service: ServiceType, newItem: CartItem): CartItem[] {
  const currentList = memoryCarts[service];
  const existingItem = currentList.find((item) => item.id === newItem.id);
  if (existingItem) {
    existingItem.quantity += newItem.quantity;
  } else {
    currentList.push({ ...newItem });
  }
  return loadCartItems(service);
}

export function removeOneFromCart(service: ServiceType, itemId: string): CartItem[] {
  memoryCarts[service] = memoryCarts[service]
    .map((item) => (item.id === itemId ? { ...item, quantity: item.quantity - 1 } : item))
    .filter((item) => item.quantity > 0);
  return loadCartItems(service);
}

export function clearSavedCart(service: ServiceType): void {
  memoryCarts[service] = [];
}
