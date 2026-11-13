// Job: Save and load driver locations with speed check.

export interface DriverCoordinate {
  driverId: string;
  latitude: number;
  longitude: number;
  updatedAtMs: number;
}

const driverLocations = new Map<string, DriverCoordinate>();

export function saveDriverLocation(coord: DriverCoordinate): boolean {
  const existing = driverLocations.get(coord.driverId);
  if (existing) {
    const timeDeltaHours = (coord.updatedAtMs - existing.updatedAtMs) / 3600000;
    if (timeDeltaHours > 0) {
      const R = 6371;
      const dLat = ((coord.latitude - existing.latitude) * Math.PI) / 180;
      const dLng = ((coord.longitude - existing.longitude) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((existing.latitude * Math.PI) / 180) *
          Math.cos((coord.latitude * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const speedKmH = distanceKm / timeDeltaHours;
      if (speedKmH > 120) {
        return false; // Reject speed violation
      }
    }
  }

  driverLocations.set(coord.driverId, coord);
  return true;
}

export function loadNearbyDrivers(): DriverCoordinate[] {
  return Array.from(driverLocations.values());
}
