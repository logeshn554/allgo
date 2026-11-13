// Job: Load current GPS coordinates and calculate distance in kilometers.

export interface GpsCoords {
  lat: number;
  lng: number;
}

const DEFAULT_COORDS: GpsCoords = { lat: 12.9716, lng: 77.5946 }; // Bengaluru center

export function loadCurrentGpsLocation(): Promise<GpsCoords> {
  return new Promise((resolve) => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(DEFAULT_COORDS),
        { timeout: 5000 }
      );
    } else {
      resolve(DEFAULT_COORDS);
    }
  });
}

export function calculateDistanceKm(from: GpsCoords, to: GpsCoords): number {
  const earthRadiusKm = 6371;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const rawKm = earthRadiusKm * c;
  return Math.max(0.5, Math.round(rawKm * 10) / 10);
}
