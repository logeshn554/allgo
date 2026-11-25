// Job: Load Bike, Auto, and Cab ride options and calculate ride fares.

export interface RideOption {
  id: 'bike' | 'auto' | 'cab_economy' | 'cab_premium';
  title: string;
  etaMinutes: number;
  baseFareCents: number;
  perKmCents: number;
  iconKey: string;
}

const RIDE_OPTIONS: RideOption[] = [
  {
    id: 'bike',
    title: 'AllGo Bike',
    etaMinutes: 2,
    baseFareCents: 2500,
    perKmCents: 700,
    iconKey: 'bike',
  },
  {
    id: 'auto',
    title: 'AllGo Auto',
    etaMinutes: 4,
    baseFareCents: 4000,
    perKmCents: 1100,
    iconKey: 'auto',
  },
  {
    id: 'cab_economy',
    title: 'Mini Cab',
    etaMinutes: 6,
    baseFareCents: 6000,
    perKmCents: 1500,
    iconKey: 'cab',
  },
  {
    id: 'cab_premium',
    title: 'Prime Sedan',
    etaMinutes: 8,
    baseFareCents: 9000,
    perKmCents: 2000,
    iconKey: 'premium',
  },
];

export function loadRideOptions(): RideOption[] {
  return [...RIDE_OPTIONS];
}

export function calculateRideFareCents(option: RideOption, distanceKm: number): number {
  const safeDistance = Math.max(1, Math.min(distanceKm, 50));
  return Math.round(option.baseFareCents + safeDistance * option.perKmCents);
}
