// Job: Request device location and compute real-world GPS coordinates & distance.

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export async function getCurrentCoordinates(): Promise<GeoLocation> {
  return new Promise((resolve) => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve({ latitude: 12.9716, longitude: 77.5946 }) // Default to Bengaluru city center
      );
    } else {
      resolve({ latitude: 12.9716, longitude: 77.5946 });
    }
  });
}

export function computeHaversineDistanceKm(from: GeoLocation, to: GeoLocation): number {
  const R = 6371;
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLng = ((to.longitude - from.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((from.latitude * Math.PI) / 180) *
      Math.cos((to.latitude * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.max(0.5, Math.round(R * c * 10) / 10);
}
