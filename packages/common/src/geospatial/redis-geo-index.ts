// Job: High-performance Redis geospatial indexing and nearest-driver evaluation within 3-5 km.

export interface RedisDriverCandidate {
  partnerId: string;
  driverId?: string;
  latitude: number;
  longitude: number;
  vehicleType?: 'BICYCLE' | 'MOTORCYCLE' | 'AUTO' | 'CAB_ECONOMY' | 'CAB_PREMIUM' | string;
  isAvailable?: boolean;
  timestampMs?: number;
}

export interface NearbyDriverResult {
  partnerId: string;
  distanceMeters: number;
  estimatedArrivalMinutes: number;
  latitude: number;
  longitude: number;
  vehicleType: string;
}

const EARTH_RADIUS_METERS = 6371000;

export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const rLat1 = (lat1 * Math.PI) / 180;
  const rLat2 = (lat2 * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_METERS * c);
}

export function buildRedisGeoAddCommand(
  key: string,
  driver: RedisDriverCandidate
): [string, number, number, string] {
  return [key, driver.longitude, driver.latitude, driver.partnerId];
}

export function evaluateNearestDrivers(
  pickupLat: number,
  pickupLon: number,
  drivers: RedisDriverCandidate[],
  options?: {
    maxRadiusMeters?: number;
    requiredVehicleType?: string;
    maxResults?: number;
    maxStaleAgeMs?: number;
  }
): NearbyDriverResult[] {
  const maxRadius = options?.maxRadiusMeters ?? 5000;
  const maxResults = options?.maxResults ?? 10;
  const maxStaleAge = options?.maxStaleAgeMs ?? 120000; // 2 minutes
  const now = Date.now();

  const results: NearbyDriverResult[] = [];

  for (const driver of drivers) {
    if (driver.isAvailable === false) continue;
    if (options?.requiredVehicleType && driver.vehicleType && driver.vehicleType !== options.requiredVehicleType) {
      continue;
    }
    if (driver.timestampMs && now - driver.timestampMs > maxStaleAge) {
      continue;
    }

    const dist = haversineDistanceMeters(pickupLat, pickupLon, driver.latitude, driver.longitude);
    if (dist <= maxRadius) {
      // Average city courier speed ~ 25 km/h -> ~416 meters/min
      const etaMinutes = Math.max(2, Math.round(dist / 400));
      results.push({
        partnerId: driver.partnerId,
        distanceMeters: dist,
        estimatedArrivalMinutes: etaMinutes,
        latitude: driver.latitude,
        longitude: driver.longitude,
        vehicleType: driver.vehicleType ?? 'MOTORCYCLE',
      });
    }
  }

  // Sort by nearest distance first
  results.sort((a, b) => a.distanceMeters - b.distanceMeters);
  return results.slice(0, maxResults);
}
