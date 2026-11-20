// Job: High-performance Redis geospatial indexing and nearest-driver evaluation within 3-5 km.
const EARTH_RADIUS_METERS = 6371000;
export function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const rLat1 = (lat1 * Math.PI) / 180;
    const rLat2 = (lat2 * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(EARTH_RADIUS_METERS * c);
}
export function buildRedisGeoAddCommand(key, driver) {
    return [key, driver.longitude, driver.latitude, driver.partnerId];
}
export function evaluateNearestDrivers(pickupLat, pickupLon, drivers, options) {
    const maxRadius = options?.maxRadiusMeters ?? 5000;
    const maxResults = options?.maxResults ?? 10;
    const maxStaleAge = options?.maxStaleAgeMs ?? 120000; // 2 minutes
    const now = Date.now();
    const results = [];
    for (const driver of drivers) {
        if (driver.isAvailable === false)
            continue;
        if (options?.requiredVehicleType && driver.vehicleType && driver.vehicleType !== options.requiredVehicleType) {
            continue;
        }
        if (driver.timestampMs && now - driver.timestampMs > maxStaleAge) {
            continue;
        }
        const dist = haversineDistanceMeters(pickupLat, pickupLon, driver.latitude, driver.longitude);
        if (dist <= maxRadius) {
            // Average city courier speed ~ 25 km/h -> ~416 meters/min
            const etaMinutes = Math.max(2, Math.round(dist / 400));
            results.push({
                partnerId: driver.partnerId,
                distanceMeters: dist,
                estimatedArrivalMinutes: etaMinutes,
                latitude: driver.latitude,
                longitude: driver.longitude,
                vehicleType: driver.vehicleType ?? 'MOTORCYCLE',
            });
        }
    }
    // Sort by nearest distance first
    results.sort((a, b) => a.distanceMeters - b.distanceMeters);
    return results.slice(0, maxResults);
}
//# sourceMappingURL=redis-geo-index.js.map