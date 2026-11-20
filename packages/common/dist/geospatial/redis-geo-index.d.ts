export interface RedisDriverCandidate {
    partnerId: string;
    driverId?: string;
    latitude: number;
    longitude: number;
    vehicleType?: 'BICYCLE' | 'MOTORCYCLE' | 'AUTO' | 'CAB_ECONOMY' | 'CAB_PREMIUM' | string;
    isAvailable?: boolean;
    timestampMs?: number;
}
export interface NearbyDriverResult {
    partnerId: string;
    distanceMeters: number;
    estimatedArrivalMinutes: number;
    latitude: number;
    longitude: number;
    vehicleType: string;
}
export declare function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number;
export declare function buildRedisGeoAddCommand(key: string, driver: RedisDriverCandidate): [string, number, number, string];
export declare function evaluateNearestDrivers(pickupLat: number, pickupLon: number, drivers: RedisDriverCandidate[], options?: {
    maxRadiusMeters?: number;
    requiredVehicleType?: string;
    maxResults?: number;
    maxStaleAgeMs?: number;
}): NearbyDriverResult[];
//# sourceMappingURL=redis-geo-index.d.ts.map