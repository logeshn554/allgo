// Job: Save and load cart items with persistent local storage.

import { getLocalItem, setLocalItem } from './localCache';

export type ServiceType = 'grocery' | 'food' | 'parcel';

export interface CartItem {
  id: string;
  title: string;
  priceCents: number;
  quantity: number;
}

export function loadCartItems(service: ServiceType): CartItem[] {
  const raw = getLocalItem(`cart_${service}`);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (_e) {
    return [];
  }
}

export function saveItemToCart(service: ServiceType, newItem: CartItem): CartItem[] {
  const currentList = loadCartItems(service);
  const existing = currentList.find((i) => i.id === newItem.id);

  if (existing) {
    existing.quantity += newItem.quantity;
  } else {
    currentList.push({ ...newItem });
  }

  setLocalItem(`cart_${service}`, JSON.stringify(currentList));
  return currentList;
}

export function clearSavedCart(service: ServiceType): void {
  setLocalItem(`cart_${service}`, JSON.stringify([]));
}
