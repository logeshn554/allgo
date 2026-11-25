export interface GeoPoint {
  latitude: number;
  longitude: number;
  timestampMs: number;
  isMockProvider?: boolean;
}

export interface SanitizedTelemetryResult {
  accepted: boolean;
  rejectReason?: 'MOCK_PROVIDER' | 'EXCESSIVE_VELOCITY' | 'INVALID_COORDINATES' | 'TIME_ANOMALY';
  calculatedSpeedKmh: number;
  distanceDeltaMeters: number;
  timeDeltaSeconds: number;
}

const EARTH_RADIUS_METERS = 6371000;
const MAX_ALLOWED_VELOCITY_KMH = 120.0;

/**
 * calculateHaversineDistanceMeters
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * sanitizeDriverTelemetry
 *
 * Enforces velocity check ($\Delta d / \Delta t \le 120$ km/h) and rejects GPS spoofing (`isMockProvider`).
 */
export function sanitizeDriverTelemetry(
  previousPing: GeoPoint | null,
  currentPing: GeoPoint,
): SanitizedTelemetryResult {
  // 1. Check coordinates boundary
  if (
    currentPing.latitude < -90 ||
    currentPing.latitude > 90 ||
    currentPing.longitude < -180 ||
    currentPing.longitude > 180
  ) {
    return {
      accepted: false,
      rejectReason: 'INVALID_COORDINATES',
      calculatedSpeedKmh: 0,
      distanceDeltaMeters: 0,
      timeDeltaSeconds: 0,
    };
  }

  // 2. Reject mock GPS provider flags
  if (currentPing.isMockProvider === true) {
    return {
      accepted: false,
      rejectReason: 'MOCK_PROVIDER',
      calculatedSpeedKmh: 0,
      distanceDeltaMeters: 0,
      timeDeltaSeconds: 0,
    };
  }

  // If initial ping, accept by default
  if (!previousPing) {
    return {
      accepted: true,
      calculatedSpeedKmh: 0,
      distanceDeltaMeters: 0,
      timeDeltaSeconds: 0,
    };
  }

  const timeDeltaSeconds = (currentPing.timestampMs - previousPing.timestampMs) / 1000;

  // Time anomaly check (current ping cannot be older or identical to previous)
  if (timeDeltaSeconds <= 0) {
    return {
      accepted: false,
      rejectReason: 'TIME_ANOMALY',
      calculatedSpeedKmh: 0,
      distanceDeltaMeters: 0,
      timeDeltaSeconds,
    };
  }

  const distanceDeltaMeters = calculateHaversineDistanceMeters(
    previousPing.latitude,
    previousPing.longitude,
    currentPing.latitude,
    currentPing.longitude,
  );

  const speedMetersPerSecond = distanceDeltaMeters / timeDeltaSeconds;
  const calculatedSpeedKmh = speedMetersPerSecond * 3.6;

  if (calculatedSpeedKmh > MAX_ALLOWED_VELOCITY_KMH) {
    return {
      accepted: false,
      rejectReason: 'EXCESSIVE_VELOCITY',
      calculatedSpeedKmh,
      distanceDeltaMeters,
      timeDeltaSeconds,
    };
  }

  return {
    accepted: true,
    calculatedSpeedKmh,
    distanceDeltaMeters,
    timeDeltaSeconds,
  };
}
