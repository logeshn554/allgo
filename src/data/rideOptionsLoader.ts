// Job: Load Bike, Auto, and Cab options with per-kilometer fare rates.

export interface RideTier {
  id: string;
  name: string;
  tierKey: 'bike' | 'auto' | 'cabEconomy' | 'cabPremium';
  basePriceCents: number;
  perKmCents: number;
  etaMinutes: number;
}

const RIDE_TIERS: RideTier[] = [
  {
    id: 'ride_bike',
    name: 'Moto Bike',
    tierKey: 'bike',
    basePriceCents: 2000,
    perKmCents: 800,
    etaMinutes: 3,
  },
  {
    id: 'ride_auto',
    name: 'Auto Rickshaw',
    tierKey: 'auto',
    basePriceCents: 3000,
    perKmCents: 1200,
    etaMinutes: 5,
  },
  {
    id: 'ride_cab_econ',
    name: 'Cab Economy',
    tierKey: 'cabEconomy',
    basePriceCents: 5000,
    perKmCents: 1800,
    etaMinutes: 7,
  },
  {
    id: 'ride_cab_prem',
    name: 'Cab Premium',
    tierKey: 'cabPremium',
    basePriceCents: 7500,
    perKmCents: 2500,
    etaMinutes: 8,
  },
];

export function loadRideTiers(): RideTier[] {
  return [...RIDE_TIERS];
}

export function calculateRidePrice(tier: RideTier, distanceKm: number): number {
  const safeDistance = Math.max(1, Math.min(distanceKm, 50));
  return Math.round(tier.basePriceCents + safeDistance * tier.perKmCents);
}
