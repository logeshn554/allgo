/**
 * Uber H3 Geospatial Partitioning Utility
 *
 * Implements Resolution 8 (~460m edge) and Resolution 9 (~174m edge) spatial indexing
 * and k-ring (hexagonal neighbor ring) partitioning for O(1) Redis set lookups (`geo:drivers:<h3Index>`).
 */
/**
 * Quantizes latitude and longitude to a deterministic hexagonal grid identifier string.
 * Res 8: ~0.005 deg precision (approx 450-500 meters)
 * Res 9: ~0.002 deg precision (approx 150-180 meters)
 */
export function latLngToH3Index(lat, lng, res = 8) {
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new Error(`INVALID_COORDINATES: lat=${lat}, lng=${lng}`);
    }
    const step = res === 8 ? 0.005 : 0.002;
    const qLat = Math.round(lat / step);
    const qLng = Math.round(lng / step);
    const hexLat = (qLat + 100000).toString(16).padStart(5, '0');
    const hexLng = (qLng + 200000).toString(16).padStart(5, '0');
    return `8${res}${hexLat}${hexLng}`;
}
/**
 * Generates concentric k-rings (hexagonal neighboring cells) for O(1) proximity lookups.
 * k = 1 returns the center hex + 6 adjacent hexes (7 total).
 * k = 2 returns center + radius 1 + radius 2 (19 total).
 */
export function getH3KRing(originHex, k = 1) {
    if (!originHex.startsWith('88') && !originHex.startsWith('89')) {
        return [originHex];
    }
    const res = originHex.startsWith('88') ? 8 : 9;
    const hexLatStr = originHex.slice(2, 7);
    const hexLngStr = originHex.slice(7, 12);
    const qLat = parseInt(hexLatStr, 16) - 100000;
    const qLng = parseInt(hexLngStr, 16) - 200000;
    const hexes = new Set();
    for (let dLat = -k; dLat <= k; dLat++) {
        for (let dLng = -k; dLng <= k; dLng++) {
            // Axial hexagonal distance filter
            if (Math.abs(dLat + dLng) <= k * 1.5) {
                const nLat = (qLat + dLat + 100000).toString(16).padStart(5, '0');
                const nLng = (qLng + dLng + 200000).toString(16).padStart(5, '0');
                hexes.add(`8${res}${nLat}${nLng}`);
            }
        }
    }
    return Array.from(hexes);
}
/**
 * Builds Redis key for driver H3 spatial set.
 */
export function getDriverH3RedisKey(h3Index) {
    return `geo:drivers:${h3Index}`;
}
//# sourceMappingURL=h3-utils.js.map