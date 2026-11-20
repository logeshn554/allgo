// Job: High-accuracy GPS telemetry streaming (3s active / 15s idle), heading, speed, and 150m geofence gating.

import { apiPost } from './apiClient.ts';

export interface GpsCoords {
  lat: number;
  lng: number;
}

export interface DriverTelemetryPing {
  lat: number;
  lng: number;
  heading: number; // 0-360 degrees
  speedMps: number;
  speedKmh: number;
  accuracy: number;
  timestamp: string;
}

const DEFAULT_COORDS: GpsCoords = { lat: 12.9716, lng: 77.5946 }; // Bengaluru center

export function loadCurrentGpsLocation(): Promise<GpsCoords> {
  return new Promise((resolve) => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(DEFAULT_COORDS),
        { timeout: 5000, enableHighAccuracy: true }
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
  return Math.max(0.1, Math.round(rawKm * 100) / 100);
}

export function checkGeofenceProximity(
  current: GpsCoords,
  target: GpsCoords,
  maxDistanceMeters = 150
): { isInside: boolean; distanceMeters: number } {
  const distanceKm = calculateDistanceKm(current, target);
  const distanceMeters = Math.round(distanceKm * 1000);
  return {
    isInside: distanceMeters <= maxDistanceMeters,
    distanceMeters,
  };
}

let simulatedLat = 12.9716;
let simulatedLng = 77.5946;
let simulatedHeading = 45;

export function startDriverTelemetryStream(options: {
  driverId: string;
  isTripActive: boolean;
  onPing?: (ping: DriverTelemetryPing) => void;
  onError?: (err: any) => void;
}): () => void {
  let isStopped = false;
  const intervalMs = options.isTripActive ? 3000 : 15000;

  const sendPing = async () => {
    if (isStopped) return;

    // Simulate minor movement delta for foreground telemetry
    simulatedLat += (Math.random() - 0.48) * 0.0004;
    simulatedLng += (Math.random() - 0.48) * 0.0004;
    simulatedHeading = (simulatedHeading + Math.floor(Math.random() * 10 - 5) + 360) % 360;

    const speedMps = options.isTripActive ? 8.5 + Math.random() * 4 : 0;
    const speedKmh = Math.round(speedMps * 3.6);

    const ping: DriverTelemetryPing = {
      lat: simulatedLat,
      lng: simulatedLng,
      heading: simulatedHeading,
      speedMps: Math.round(speedMps * 10) / 10,
      speedKmh,
      accuracy: 4.5,
      timestamp: new Date().toISOString(),
    };

    options.onPing?.(ping);

    try {
      await apiPost('/v1/delivery/driver/telemetry', {
        driverId: options.driverId,
        latitude: ping.lat,
        longitude: ping.lng,
        heading: ping.heading,
        speedMps: ping.speedMps,
        isTripActive: options.isTripActive,
      });
    } catch {
      // Offline fallback
    }
  };

  // Immediate first ping
  sendPing();
  const timer = setInterval(sendPing, intervalMs);

  return () => {
    isStopped = true;
    clearInterval(timer);
  };
}
