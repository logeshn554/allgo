// Job: Dynamic ETA countdown, velocity/traffic calculations, and route polyline interpolation.

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface DynamicEtaUpdate {
  remainingMeters: number;
  remainingSeconds: number;
  estimatedArrivalTimestamp: string;
  trafficLevel: 'LIGHT' | 'MODERATE' | 'HEAVY';
  routeProgressPercent: number;
}

export function generateRoutePolyline(
  origin: GeoPoint,
  destination: GeoPoint,
  steps = 8,
): GeoPoint[] {
  const points: GeoPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const fraction = i / steps;
    // Introduce slight curved trajectory mimicking city road grid
    const curveOffset = Math.sin(fraction * Math.PI) * 0.002;
    points.push({
      latitude: origin.latitude + (destination.latitude - origin.latitude) * fraction + curveOffset,
      longitude:
        origin.longitude +
        (destination.longitude - origin.longitude) * fraction +
        curveOffset * 0.5,
    });
  }
  return points;
}

export function calculateDynamicEta(
  currentPos: GeoPoint,
  destination: GeoPoint,
  totalDistanceMeters: number,
  trafficMultiplier = 1.2,
): DynamicEtaUpdate {
  const dLat = ((destination.latitude - currentPos.latitude) * Math.PI) / 180;
  const dLon = ((destination.longitude - currentPos.longitude) * Math.PI) / 180;
  const rLat1 = (currentPos.latitude * Math.PI) / 180;
  const rLat2 = (destination.latitude * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const remainingMeters = Math.max(
    50,
    Math.round(6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))),
  );

  // Speed in m/s: urban average ~ 6.5 m/s (23 km/h)
  const baseSeconds = remainingMeters / 6.5;
  const remainingSeconds = Math.round(baseSeconds * trafficMultiplier);

  const trafficLevel: 'LIGHT' | 'MODERATE' | 'HEAVY' =
    trafficMultiplier > 1.4 ? 'HEAVY' : trafficMultiplier > 1.15 ? 'MODERATE' : 'LIGHT';

  const coveredMeters = Math.max(0, totalDistanceMeters - remainingMeters);
  const routeProgressPercent = Math.min(
    100,
    Math.max(5, Math.round((coveredMeters / Math.max(1, totalDistanceMeters)) * 100)),
  );

  const arrivalDate = new Date(Date.now() + remainingSeconds * 1000);

  return {
    remainingMeters,
    remainingSeconds,
    estimatedArrivalTimestamp: arrivalDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    trafficLevel,
    routeProgressPercent,
  };
}
