// Job: Load grocery categories and products from real discovery/catalog API with fallback cache.

export interface GroceryProduct {
  id: string;
  title: string;
  category: string;
  priceCents: number;
  iconKey: string;
}

const API_BASE = (typeof process !== 'undefined' && process.env?.API_URL) || 'https://allgo-api.onrender.com';

const FALLBACK_GROCERY_CATALOG: GroceryProduct[] = [
  { id: 'g1', title: 'Fresh Apples (1 kg)', category: 'Produce', priceCents: 12000, iconKey: 'produce' },
  { id: 'g2', title: 'Organic Spinach', category: 'Produce', priceCents: 4500, iconKey: 'produce' },
  { id: 'g3', title: 'Farm Milk (1 L)', category: 'Dairy', priceCents: 6800, iconKey: 'dairy' },
  { id: 'g4', title: 'Greek Yogurt', category: 'Dairy', priceCents: 8500, iconKey: 'dairy' },
  { id: 'g5', title: 'Whole Wheat Bread', category: 'Bakery', priceCents: 5500, iconKey: 'bakery' },
  { id: 'g6', title: 'Dishwash Liquid', category: 'Household', priceCents: 11000, iconKey: 'household' },
];

let liveCatalogCache: GroceryProduct[] = [...FALLBACK_GROCERY_CATALOG];
let liveCategoriesCache: string[] = ['All', 'Produce', 'Dairy', 'Bakery', 'Household'];

export async function fetchGroceryCatalogFromApi(): Promise<GroceryProduct[]> {
  try {
    const res = await fetch(`${API_BASE}/v1/discovery/outlets?verticalType=GROCERY`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        // Collect products across outlets or catalog API
        const transformed: GroceryProduct[] = [];
        const catSet = new Set<string>(['All']);
        for (const outlet of data) {
          if (Array.isArray(outlet.products)) {
            for (const p of outlet.products) {
              const cat = p.categoryName || 'General';
              catSet.add(cat);
              transformed.push({
                id: p.id || `p_${transformed.length + 1}`,
                title: p.title || p.name || 'Grocery Item',
                category: cat,
                priceCents: Math.round((Number(p.priceInr || p.price || 100)) * 100),
                iconKey: (p.iconKey || cat).toLowerCase(),
              });
            }
          }
        }
        if (transformed.length > 0) {
          liveCatalogCache = transformed;
          liveCategoriesCache = Array.from(catSet);
          return liveCatalogCache;
        }
      }
    }
  } catch (_err) {
    // Graceful fallback to cached catalogue
  }
  return liveCatalogCache;
}

export function loadGroceryProducts(category?: string): GroceryProduct[] {
  if (!category || category === 'All') {
    return [...liveCatalogCache];
  }
  return liveCatalogCache.filter((item) => item.category === category);
}

export function loadGroceryCategories(): string[] {
  return [...liveCategoriesCache];
}
