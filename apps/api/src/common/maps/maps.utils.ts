export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export function buildPointKey(p: GeoPoint): string {
  return `${p.latitude.toFixed(4)},${p.longitude.toFixed(4)}`;
}

export function calculateHaversineMeters(p1: GeoPoint, p2: GeoPoint): number {
  const R = 6371e3;
  const phi1 = (p1.latitude * Math.PI) / 180;
  const phi2 = (p2.latitude * Math.PI) / 180;
  const deltaPhi = ((p2.latitude - p1.latitude) * Math.PI) / 180;
  const deltaLambda = ((p2.longitude - p1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
