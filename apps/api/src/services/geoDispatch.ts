import { Injectable, Logger } from '@nestjs/common';
import type { ServiceVertical } from '@allgo/common';
import { RedisService } from '../redis/redis.service.js';
import type {
  DriverTelemetryPayload,
  DriverProfile,
  GeoDispatchOptions,
  DispatchWaveCandidate,
} from './geoDispatchTypes.js';

export const DISPATCH_RINGS_METERS = [1500, 3000, 5000];
export const DRIVER_HEARTBEAT_TTL_SECONDS = 30;
export const DRIVER_OFFER_LOCK_TTL_SECONDS = 15;
export const DEFAULT_MAX_COD_FLOAT_INR = 1500;

@Injectable()
export class GeoDispatchEngine {
  private readonly logger = new Logger(GeoDispatchEngine.name);

  constructor(private readonly redis: RedisService) {}

  async ingestDriverTelemetry(
    payload: DriverTelemetryPayload,
    profile?: Partial<DriverProfile>
  ): Promise<void> {
    const { driverId, vertical, latitude, longitude } = payload;
    const geoKey = `drivers:online:${vertical}`;

    // 1. GEOADD longitude latitude driverId
    if (typeof (this.redis as any).geoadd === 'function') {
      await (this.redis as any).geoadd(geoKey, longitude, latitude, driverId);
    }

    // 2. 30-Second TTL Heartbeat
    await this.redis.set(`driver:heartbeat:${driverId}`, 'online', 'EX', DRIVER_HEARTBEAT_TTL_SECONDS);

    // 3. Update driver metadata cache
    if (profile) {
      const existingStr = await this.redis.get(`driver:profile:${driverId}`);
      const existing = existingStr ? JSON.parse(existingStr) : {};
      const updated: DriverProfile = {
        driverId,
        verticals: profile.verticals || existing.verticals || [vertical],
        vehicleType: profile.vehicleType || existing.vehicleType || 'MOTORCYCLE',
        currentCodFloatInr: profile.currentCodFloatInr ?? existing.currentCodFloatInr ?? 0,
        maxCodLimitInr: profile.maxCodLimitInr ?? existing.maxCodLimitInr ?? DEFAULT_MAX_COD_FLOAT_INR,
        isOnline: true,
        lastHeartbeat: new Date().toISOString(),
      };
      await this.redis.set(`driver:profile:${driverId}`, JSON.stringify(updated), 'EX', 3600);
    }
  }

  async dispatchWave(
    orderId: string,
    vertical: ServiceVertical,
    pickupLat: number,
    pickupLon: number,
    options: GeoDispatchOptions = {}
  ): Promise<DispatchWaveCandidate | null> {
    const geoKey = `drivers:online:${vertical}`;

    for (const radiusMeters of DISPATCH_RINGS_METERS) {
      const candidates = await this.queryCandidatesInRadius(geoKey, pickupLon, pickupLat, radiusMeters);

      for (const candidate of candidates) {
        const { driverId, distanceMeters } = candidate;

        // A. Verify 30-second TTL heartbeat
        const heartbeat = await this.redis.get(`driver:heartbeat:${driverId}`);
        if (!heartbeat) {
          // Heartbeat expired, prune from geo index
          await this.pruneInactiveDriver(geoKey, driverId);
          continue;
        }

        // B. Check if previously rejected for this order
        const isRejected = await this.isDriverRejected(orderId, driverId);
        if (isRejected) {
          continue;
        }

        // C. Fetch Profile & Check Vehicle Capability & CoD Float Limits
        const profile = await this.getDriverProfile(driverId);
        if (!this.matchesVehicleCapability(profile, options.requiredVehicleType)) {
          continue;
        }

        if (options.isCod && !this.isCodFloatAllowed(profile, options)) {
          continue;
        }

        // D. Acquire 15-second Offer Lock atomically
        const locked = await this.acquireOfferLock(driverId, orderId);
        if (!locked) {
          continue;
        }

        return {
          driverId,
          distanceMeters,
          radiusRingMeters: radiusMeters,
          lockedUntil: new Date(Date.now() + DRIVER_OFFER_LOCK_TTL_SECONDS * 1000).toISOString(),
          lockTtlSeconds: DRIVER_OFFER_LOCK_TTL_SECONDS,
        };
      }
    }

    return null;
  }

  async recordDriverRejection(orderId: string, driverId: string, reason?: string): Promise<void> {
    const rejectedKey = `order:${orderId}:rejected_drivers`;
    if (typeof (this.redis as any).sadd === 'function') {
      await (this.redis as any).sadd(rejectedKey, driverId);
      await this.redis.expire(rejectedKey, 3600);
    }
    // Release 15-second lock so driver can be offered other jobs
    await this.releaseDriverOfferLock(driverId);
    this.logger.log(`Driver ${driverId} rejected order ${orderId}. Reason: ${reason || 'unspecified'}`);
  }

  async releaseDriverOfferLock(driverId: string): Promise<void> {
    await this.redis.del(`driver:lock:${driverId}`);
  }

  private async queryCandidatesInRadius(
    geoKey: string,
    lon: number,
    lat: number,
    radiusMeters: number
  ): Promise<Array<{ driverId: string; distanceMeters: number }>> {
    try {
      if (typeof (this.redis as any).geosearch === 'function') {
        const raw = await (this.redis as any).geosearch(
          geoKey,
          'FROMLONLAT',
          lon,
          lat,
          'BYRADIUS',
          radiusMeters,
          'M',
          'ASC',
          'WITHDIST'
        );
        return this.parseGeoSearchResults(raw);
      }
      if (typeof (this.redis as any).georadius === 'function') {
        const raw = await (this.redis as any).georadius(geoKey, lon, lat, radiusMeters, 'm', 'WITHDIST', 'ASC');
        return this.parseGeoSearchResults(raw);
      }
    } catch (err: any) {
      this.logger.debug(`Geo query notice: ${err.message}`);
    }
    return [];
  }

  private parseGeoSearchResults(raw: any[]): Array<{ driverId: string; distanceMeters: number }> {
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => {
      if (Array.isArray(item)) {
        return { driverId: String(item[0]), distanceMeters: parseFloat(item[1]) || 0 };
      }
      return { driverId: String(item), distanceMeters: 0 };
    });
  }

  private async isDriverRejected(orderId: string, driverId: string): Promise<boolean> {
    if (typeof (this.redis as any).sismember === 'function') {
      const isMember = await (this.redis as any).sismember(`order:${orderId}:rejected_drivers`, driverId);
      return Boolean(isMember);
    }
    return false;
  }

  private async getDriverProfile(driverId: string): Promise<DriverProfile | null> {
    const str = await this.redis.get(`driver:profile:${driverId}`);
    if (!str) return null;
    try {
      return JSON.parse(str) as DriverProfile;
    } catch {
      return null;
    }
  }

  private matchesVehicleCapability(profile: DriverProfile | null, required?: string): boolean {
    if (!required) return true;
    if (!profile) return false;
    return profile.vehicleType.toUpperCase() === required.toUpperCase();
  }

  private isCodFloatAllowed(profile: DriverProfile | null, options: GeoDispatchOptions): boolean {
    const currentFloat = profile?.currentCodFloatInr ?? 0;
    const codAmount = options.codAmountInr ?? 0;
    const maxLimit = profile?.maxCodLimitInr ?? options.maxCodFloatInr ?? DEFAULT_MAX_COD_FLOAT_INR;
    return currentFloat + codAmount <= maxLimit;
  }

  private async acquireOfferLock(driverId: string, orderId: string): Promise<boolean> {
    const lockKey = `driver:lock:${driverId}`;
    const result = await (this.redis as any).set(lockKey, orderId, 'NX', 'EX', DRIVER_OFFER_LOCK_TTL_SECONDS);
    return result === 'OK';
  }

  private async pruneInactiveDriver(geoKey: string, driverId: string): Promise<void> {
    if (typeof (this.redis as any).zrem === 'function') {
      await (this.redis as any).zrem(geoKey, driverId);
    }
  }
}
