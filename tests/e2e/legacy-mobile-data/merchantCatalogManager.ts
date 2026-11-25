// Job: Merchant live inventory 86ing, variant option toggling, and peak prep time buffers.

import { getLocalItem, setLocalItem } from './localCache.ts';

export interface MerchantItem {
  id: string;
  name: string;
  category: string;
  priceCents: number;
  isAvailable: boolean; // 86ed status
  prepTimeMinutes: number;
  variants: { id: string; name: string; priceCents: number; inStock: boolean }[];
}

export interface StoreOperationalConfig {
  merchantId: string;
  isOpen: boolean;
  dynamicPrepBufferMinutes: number; // e.g. 0, 10, 20 mins during peak rush
  autoPrintKdsTickets: boolean;
}

const ITEMS_STORAGE_KEY = 'allgo_merchant_catalog_items_v1';
const STORE_CONFIG_KEY = 'allgo_merchant_store_config_v1';

const DEFAULT_ITEMS: MerchantItem[] = [
  {
    id: 'prod_1',
    name: 'Special Chettinad Biryani',
    category: 'Main Course',
    priceCents: 28000,
    isAvailable: true,
    prepTimeMinutes: 20,
    variants: [
      { id: 'v1', name: 'Regular', priceCents: 28000, inStock: true },
      { id: 'v2', name: 'Family Pack', priceCents: 52000, inStock: true },
    ],
  },
  {
    id: 'prod_2',
    name: 'Paneer Butter Masala',
    category: 'Curries',
    priceCents: 22000,
    isAvailable: true,
    prepTimeMinutes: 15,
    variants: [],
  },
  {
    id: 'prod_3',
    name: 'Garlic Butter Naan (2 pcs)',
    category: 'Breads',
    priceCents: 8000,
    isAvailable: true,
    prepTimeMinutes: 10,
    variants: [],
  },
];

export function loadMerchantCatalog(): MerchantItem[] {
  const raw = getLocalItem(ITEMS_STORAGE_KEY);
  if (!raw) {
    setLocalItem(ITEMS_STORAGE_KEY, JSON.stringify(DEFAULT_ITEMS));
    return DEFAULT_ITEMS;
  }
  try {
    return JSON.parse(raw);
  } catch (_e) {
    return DEFAULT_ITEMS;
  }
}

export function toggleItemAvailability(productId: string): {
  success: boolean;
  isAvailable: boolean;
} {
  const items = loadMerchantCatalog();
  const item = items.find((p) => p.id === productId);
  if (!item) return { success: false, isAvailable: false };

  // "86ing" an item flips its availability
  item.isAvailable = !item.isAvailable;
  setLocalItem(ITEMS_STORAGE_KEY, JSON.stringify(items));
  return { success: true, isAvailable: item.isAvailable };
}

export function toggleVariantAvailability(
  productId: string,
  variantId: string,
): { success: boolean; inStock: boolean } {
  const items = loadMerchantCatalog();
  const item = items.find((p) => p.id === productId);
  if (!item) return { success: false, inStock: false };

  const variant = item.variants.find((v) => v.id === variantId);
  if (!variant) return { success: false, inStock: false };

  variant.inStock = !variant.inStock;
  setLocalItem(ITEMS_STORAGE_KEY, JSON.stringify(items));
  return { success: true, inStock: variant.inStock };
}

export function loadStoreConfig(): StoreOperationalConfig {
  const raw = getLocalItem(STORE_CONFIG_KEY);
  if (!raw) {
    const initial: StoreOperationalConfig = {
      merchantId: 'merch_chennai_1',
      isOpen: true,
      dynamicPrepBufferMinutes: 0,
      autoPrintKdsTickets: true,
    };
    setLocalItem(STORE_CONFIG_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(raw);
  } catch (_e) {
    return {
      merchantId: 'merch_chennai_1',
      isOpen: true,
      dynamicPrepBufferMinutes: 0,
      autoPrintKdsTickets: true,
    };
  }
}

export function updateDynamicPrepBuffer(bufferMinutes: number): StoreOperationalConfig {
  const config = loadStoreConfig();
  config.dynamicPrepBufferMinutes = Math.max(0, Math.min(60, bufferMinutes));
  setLocalItem(STORE_CONFIG_KEY, JSON.stringify(config));
  return config;
}
