import type { ServiceVertical } from '@allgo/common';

export interface DriverTelemetryPayload {
  driverId: string;
  vertical: ServiceVertical;
  latitude: number;
  longitude: number;
  heading?: number;
  speedMps?: number;
  accuracyMeters?: number;
  recordedAt?: string;
}

export interface DriverProfile {
  driverId: string;
  verticals: ServiceVertical[];
  vehicleType: string;
  currentCodFloatInr: number;
  maxCodLimitInr: number;
  isOnline: boolean;
  lastHeartbeat?: string;
}

export interface GeoDispatchOptions {
  requiredVehicleType?: string;
  isCod?: boolean;
  codAmountInr?: number;
  maxCodFloatInr?: number;
}

export interface DispatchWaveCandidate {
  driverId: string;
  distanceMeters: number;
  radiusRingMeters: number;
  lockedUntil: string;
  lockTtlSeconds: number;
}
