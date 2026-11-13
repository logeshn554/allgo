import Redis from 'ioredis';
import * as h3 from 'h3-js';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export interface DriverPing {
  driverId: string;
  lat: number;
  lng: number;
  timestampMs: number;
  isMockProvider?: boolean;
}

export async function processDriverTelemetry(ping: DriverPing): Promise<boolean> {
  if (ping.isMockProvider) {
    return false;
  }

  const prevKey = `driver:telemetry:${ping.driverId}`;
  const rawPrev = await redis.get(prevKey);

  if (rawPrev) {
    const prev = JSON.parse(rawPrev);
    const timeDeltaHours = (ping.timestampMs - prev.timestampMs) / 3600000;

    if (timeDeltaHours > 0) {
      const R = 6371;
      const dLat = ((ping.lat - prev.lat) * Math.PI) / 180;
      const dLng = ((ping.lng - prev.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((prev.lat * Math.PI) / 180) *
          Math.cos((ping.lat * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const velocityKmH = distanceKm / timeDeltaHours;

      if (velocityKmH > 120) {
        return false;
      }
    }
  }

  await redis.set(prevKey, JSON.stringify(ping), 'EX', 300);

  const h3Index = h3.latLngToCell(ping.lat, ping.lng, 8);
  const oldH3Key = `driver:h3:${ping.driverId}`;
  const prevH3 = await redis.get(oldH3Key);

  if (prevH3 && prevH3 !== h3Index) {
    await redis.srem(`geo:drivers:${prevH3}`, ping.driverId);
  }

  await redis.sadd(`geo:drivers:${h3Index}`, ping.driverId);
  await redis.set(oldH3Key, h3Index, 'EX', 300);

  return true;
}

export async function findNearbyDrivers(lat: number, lng: number): Promise<string[]> {
  const originIndex = h3.latLngToCell(lat, lng, 8);
  const neighboringHexagons = h3.gridDisk(originIndex, 2);

  const pipeline = redis.pipeline();
  neighboringHexagons.forEach((hex) => {
    pipeline.smembers(`geo:drivers:${hex}`);
  });

  const results = await pipeline.exec();
  const driverSet = new Set<string>();

  results?.forEach(([, drivers]) => {
    if (Array.isArray(drivers)) {
      drivers.forEach((d) => driverSet.add(d as string));
    }
  });

  return Array.from(driverSet);
}

export async function claimOrderForDriver(orderId: string, driverId: string): Promise<boolean> {
  const lockKey = `lock:order_claim:${orderId}`;
  const acquired = await redis.set(lockKey, driverId, 'NX', 'EX', 10);
  return acquired === 'OK';
}
