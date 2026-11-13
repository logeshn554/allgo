// Job: Load product catalog and ride options safely.

export interface CatalogProduct {
  id: string;
  title: string;
  category: 'produce' | 'dairy' | 'bakery' | 'household';
  priceCents: number;
}

export interface RideOption {
  id: string;
  name: string;
  tier: 'bike' | 'auto' | 'cab_economy' | 'cab_premium';
  basePriceCents: number;
  perKmCents: number;
}

const mockProducts: CatalogProduct[] = [
  { id: 'prod_1', title: 'Fresh Organic Milk 1L', category: 'dairy', priceCents: 6500 },
  { id: 'prod_2', title: 'Whole Wheat Bread 400g', category: 'bakery', priceCents: 4500 },
  { id: 'prod_3', title: 'Farm Fresh Tomatoes 1kg', category: 'produce', priceCents: 3500 },
];

const mockRides: RideOption[] = [
  { id: 'ride_bike', name: 'Moto Fast', tier: 'bike', basePriceCents: 2000, perKmCents: 800 },
  { id: 'ride_auto', name: 'City Auto', tier: 'auto', basePriceCents: 3000, perKmCents: 1200 },
  { id: 'ride_cab', name: 'Prime Sedan', tier: 'cab_economy', basePriceCents: 5000, perKmCents: 1800 },
];

export function loadGroceryCatalog(): CatalogProduct[] {
  return [...mockProducts];
}

export function loadRideOptions(): RideOption[] {
  return [...mockRides];
}
