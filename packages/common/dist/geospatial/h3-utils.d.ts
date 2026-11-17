/**
 * Uber H3 Geospatial Partitioning Utility
 *
 * Implements Resolution 8 (~460m edge) and Resolution 9 (~174m edge) spatial indexing
 * and k-ring (hexagonal neighbor ring) partitioning for O(1) Redis set lookups (`geo:drivers:<h3Index>`).
 */
export interface LatLng {
    lat: number;
    lng: number;
}
/**
 * Quantizes latitude and longitude to a deterministic hexagonal grid identifier string.
 * Res 8: ~0.005 deg precision (approx 450-500 meters)
 * Res 9: ~0.002 deg precision (approx 150-180 meters)
 */
export declare function latLngToH3Index(lat: number, lng: number, res?: 8 | 9): string;
/**
 * Generates concentric k-rings (hexagonal neighboring cells) for O(1) proximity lookups.
 * k = 1 returns the center hex + 6 adjacent hexes (7 total).
 * k = 2 returns center + radius 1 + radius 2 (19 total).
 */
export declare function getH3KRing(originHex: string, k?: number): string[];
/**
 * Builds Redis key for driver H3 spatial set.
 */
export declare function getDriverH3RedisKey(h3Index: string): string;
//# sourceMappingURL=h3-utils.d.ts.map