// Job: Save and load persistent application data, active carts, geofenced addresses, and recovery state.

const memoryBackup = new Map<string, string>();

function getStorage(): Storage | null {
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
    return globalThis.localStorage;
  }
  return null;
}

export function saveToCache<T>(key: string, value: T): void {
  try {
    const raw = JSON.stringify(value);
    const storage = getStorage();
    if (storage) {
      storage.setItem(key, raw);
    } else {
      memoryBackup.set(key, raw);
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function loadFromCache<T>(key: string, fallback: T): T {
  try {
    const storage = getStorage();
    const raw = storage ? storage.getItem(key) : memoryBackup.get(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function removeFromCache(key: string): void {
  const storage = getStorage();
  if (storage) {
    storage.removeItem(key);
  }
  memoryBackup.delete(key);
}

export function getLocalItem(key: string): string | null {
  const storage = getStorage();
  return storage ? storage.getItem(key) : memoryBackup.get(key) || null;
}

export function setLocalItem(key: string, value: string): void {
  const storage = getStorage();
  if (storage) {
    storage.setItem(key, value);
  } else {
    memoryBackup.set(key, value);
  }
}

export function removeLocalItem(key: string): void {
  removeFromCache(key);
}

// 1. Active Cart Persistence
export interface CachedCartItem {
  id: string;
  title: string;
  priceCents: number;
  quantity: number;
  image?: string;
  options?: Record<string, any>;
}

export function saveActiveCart(vertical: string, items: CachedCartItem[]): void {
  saveToCache(`allgo_cart_${vertical}`, items);
}

export function loadActiveCart(vertical: string): CachedCartItem[] {
  return loadFromCache<CachedCartItem[]>(`allgo_cart_${vertical}`, []);
}

export function clearActiveCart(vertical: string): void {
  removeFromCache(`allgo_cart_${vertical}`);
}

// 2. Saved Addresses with Geofence Coordinates
export interface GeofencedAddress {
  id: string;
  label: 'HOME' | 'WORK' | 'OTHER' | string;
  address: string;
  landmark?: string;
  latitude: number;
  longitude: number;
  isDefault?: boolean;
}

const DEFAULT_ADDRESSES: GeofencedAddress[] = [
  {
    id: 'addr_home',
    label: 'HOME',
    address: '100 Feet Rd, Indiranagar, Bengaluru, Karnataka 560038',
    latitude: 12.9716,
    longitude: 77.5946,
    isDefault: true,
  },
  {
    id: 'addr_work',
    label: 'WORK',
    address: 'Koramangala 4th Block, Bengaluru, Karnataka 560034',
    latitude: 12.9352,
    longitude: 77.6245,
    isDefault: false,
  },
];

export function getSavedAddresses(): GeofencedAddress[] {
  return loadFromCache<GeofencedAddress[]>('allgo_saved_addresses', DEFAULT_ADDRESSES);
}

export function saveSavedAddress(address: GeofencedAddress): void {
  const current = getSavedAddresses();
  const filtered = current.filter((a) => a.id !== address.id);
  if (address.isDefault) {
    filtered.forEach((a) => (a.isDefault = false));
  }
  filtered.unshift(address);
  saveToCache('allgo_saved_addresses', filtered);
}

export function deleteSavedAddress(id: string): void {
  const current = getSavedAddresses();
  const updated = current.filter((a) => a.id !== id);
  saveToCache('allgo_saved_addresses', updated);
}

// 3. Active Order Recovery State
export interface OrderRecoveryState {
  orderId: string;
  vertical: string;
  status: string;
  createdAt: string;
  trackingActive: boolean;
}

export function saveActiveOrderRecovery(state: OrderRecoveryState): void {
  saveToCache('allgo_active_order_recovery', state);
}

export function loadActiveOrderRecovery(): OrderRecoveryState | null {
  return loadFromCache<OrderRecoveryState | null>('allgo_active_order_recovery', null);
}

export function clearActiveOrderRecovery(): void {
  removeFromCache('allgo_active_order_recovery');
}
