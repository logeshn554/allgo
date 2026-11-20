// Job: Save and load driver GPS coordinates backed by Redis state / REST API with anti-spoofing validation.

export interface DriverLocation {
  driverId: string;
  lat: number;
  lng: number;
  updatedAtMs: number;
}

const API_BASE = (typeof process !== 'undefined' && process.env?.API_URL) || 'https://allgo-api.onrender.com';

// Local cache mirror for low-latency lookups
const localDriversCache = new Map<string, DriverLocation>();

export function saveDriverLocation(driverId: string, lat: number, lng: number): boolean {
  const now = Date.now();
  const prev = localDriversCache.get(driverId);

  if (prev) {
    const hours = (now - prev.updatedAtMs) / 3600000;
    const approxKm = Math.hypot(lat - prev.lat, lng - prev.lng) * 111;
    if (hours > 0 && approxKm / hours > 130) {
      return false; // Reject unrealistic GPS jump over 130 km/h
    }
  }

  const record: DriverLocation = { driverId, lat, lng, updatedAtMs: now };
  localDriversCache.set(driverId, record);

  // Synchronize state asynchronously with real backend Redis telemetry endpoint
  if (typeof fetch !== 'undefined') {
    fetch(`${API_BASE}/v1/partner/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partnerId: driverId, latitude: lat, longitude: lng, timestamp: now }),
    }).catch(() => {
      // Retain in local cache if offline or network temporarily unreachable
    });
  }

  return true;
}

export function loadDriverLocation(driverId: string): DriverLocation | undefined {
  return localDriversCache.get(driverId);
}

export async function fetchDriverLocationFromApi(driverId: string): Promise<DriverLocation | undefined> {
  try {
    const res = await fetch(`${API_BASE}/v1/partner/location/${driverId}`);
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        const record: DriverLocation = {
          driverId,
          lat: data.latitude,
          lng: data.longitude,
          updatedAtMs: data.timestamp ? new Date(data.timestamp).getTime() : Date.now(),
        };
        localDriversCache.set(driverId, record);
        return record;
      }
    }
  } catch (_err) {
    // Graceful fallback to cached location
  }
  return localDriversCache.get(driverId);
}
