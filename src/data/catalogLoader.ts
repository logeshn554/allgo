// Job: Load grocery categories and products matched to existing grocery icons.

export interface GroceryProduct {
  id: string;
  title: string;
  category: string;
  priceCents: number;
  iconKey: string;
}

const GROCERY_CATALOG: GroceryProduct[] = [
  { id: 'g1', title: 'Fresh Apples (1 kg)', category: 'Produce', priceCents: 12000, iconKey: 'produce' },
  { id: 'g2', title: 'Organic Spinach', category: 'Produce', priceCents: 4500, iconKey: 'produce' },
  { id: 'g3', title: 'Farm Milk (1 L)', category: 'Dairy', priceCents: 6800, iconKey: 'dairy' },
  { id: 'g4', title: 'Greek Yogurt', category: 'Dairy', priceCents: 8500, iconKey: 'dairy' },
  { id: 'g5', title: 'Whole Wheat Bread', category: 'Bakery', priceCents: 5500, iconKey: 'bakery' },
  { id: 'g6', title: 'Dishwash Liquid', category: 'Household', priceCents: 11000, iconKey: 'household' },
];

export function loadGroceryProducts(category?: string): GroceryProduct[] {
  if (!category || category === 'All') {
    return [...GROCERY_CATALOG];
  }
  return GROCERY_CATALOG.filter((item) => item.category === category);
}

export function loadGroceryCategories(): string[] {
  return ['All', 'Produce', 'Dairy', 'Bakery', 'Household'];
}
