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
/**
 * calculateHaversineDistanceMeters
 */
export declare function calculateHaversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number;
/**
 * sanitizeDriverTelemetry
 *
 * Enforces velocity check ($\Delta d / \Delta t \le 120$ km/h) and rejects GPS spoofing (`isMockProvider`).
 */
export declare function sanitizeDriverTelemetry(previousPing: GeoPoint | null, currentPing: GeoPoint): SanitizedTelemetryResult;
//# sourceMappingURL=telemetry-sanitizer.d.ts.map