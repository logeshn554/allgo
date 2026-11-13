// Job: Save and load driver GPS coordinates while blocking fake speed jumps.

export interface DriverLocation {
  driverId: string;
  lat: number;
  lng: number;
  updatedAtMs: number;
}

const activeDrivers = new Map<string, DriverLocation>();

export function saveDriverLocation(driverId: string, lat: number, lng: number): boolean {
  const now = Date.now();
  const prev = activeDrivers.get(driverId);

  if (prev) {
    const hours = (now - prev.updatedAtMs) / 3600000;
    const approxKm = Math.hypot(lat - prev.lat, lng - prev.lng) * 111;
    if (hours > 0 && approxKm / hours > 130) {
      return false; // Reject unrealistic GPS jump over 130 km/h
    }
  }

  activeDrivers.set(driverId, { driverId, lat, lng, updatedAtMs: now });
  return true;
}

export function loadDriverLocation(driverId: string): DriverLocation | undefined {
  return activeDrivers.get(driverId);
}
