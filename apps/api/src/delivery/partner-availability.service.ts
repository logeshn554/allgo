import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { latLngToH3Index, getDriverH3RedisKey } from '@allgo/common';
import { DatabaseService } from '../database/database.service.js';
import { RedisService } from '../redis/redis.service.js';
import { DeliveryGateway } from './delivery.gateway.js';
import {
  LocationCoordinatesDto,
  PartnerLocationUpdateDto,
} from './dto/delivery.dto.js';
import { PartnerAvailabilityRepository } from './data/partner-availability.repository.js';

export const REDIS_ONLINE_PARTNERS_GEO_KEY = 'dispatch:partners:online:geo';
export const HEARTBEAT_TTL_SECONDS = 120;

@Injectable()
export class PartnerAvailabilityService {
  private readonly logger = new Logger(PartnerAvailabilityService.name);
  private readonly repo: PartnerAvailabilityRepository;

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly gateway: DeliveryGateway,
    repo?: PartnerAvailabilityRepository
  ) {
    this.repo = repo ?? new PartnerAvailabilityRepository(db);
  }

  async getPartnerByUserId(userId: string): Promise<any> {
    return this.repo.getPartnerByUserId(userId);
  }

  async checkEligibility(partnerId: string): Promise<{ isEligible: boolean; reason?: string }> {
    return this.repo.checkEligibility(partnerId);
  }

  async setOnline(userId: string, coords: LocationCoordinatesDto, batteryPercentage: number = 100): Promise<any> {
    const partner = await this.getPartnerByUserId(userId);

    const eligibility = await this.checkEligibility(partner.id);
    if (!eligibility.isEligible) {
      throw new ForbiddenException(`Cannot go online: ${eligibility.reason}`);
    }

    const sessionId = await this.repo.createSession(
      partner.id,
      coords.longitude,
      coords.latitude,
      batteryPercentage
    );

    try {
      await this.redis.geoadd(REDIS_ONLINE_PARTNERS_GEO_KEY, coords.longitude, coords.latitude, partner.id);
      await this.redis.setex(`dispatch:partner:${partner.id}:heartbeat`, HEARTBEAT_TTL_SECONDS, 'ONLINE');
      const h3Index = latLngToH3Index(coords.latitude, coords.longitude, 8);
      const h3Key = getDriverH3RedisKey(h3Index);
      await this.redis.sadd(h3Key, partner.id);
      await this.redis.expire(h3Key, HEARTBEAT_TTL_SECONDS);
    } catch (err: any) {
      this.logger.warn(`Redis GEO update failed during setOnline: ${err.message}`);
    }

    return {
      status: 'ONLINE',
      partnerId: partner.id,
      sessionId,
      location: coords,
    };
  }

  async setOffline(userId: string): Promise<{ status: string }> {
    const partner = await this.getPartnerByUserId(userId);
    await this.repo.endSession(partner.id);

    try {
      await this.redis.zrem(REDIS_ONLINE_PARTNERS_GEO_KEY, partner.id);
      await this.redis.del(`dispatch:partner:${partner.id}:heartbeat`);
    } catch {}

    return { status: 'OFFLINE' };
  }

  async heartbeat(userId: string, coords: LocationCoordinatesDto, batteryPercentage: number = 100): Promise<any> {
    const partner = await this.getPartnerByUserId(userId);
    await this.repo.updateHeartbeat(partner.id, coords.longitude, coords.latitude, batteryPercentage);

    try {
      await this.redis.geoadd(REDIS_ONLINE_PARTNERS_GEO_KEY, coords.longitude, coords.latitude, partner.id);
      await this.redis.setex(`dispatch:partner:${partner.id}:heartbeat`, HEARTBEAT_TTL_SECONDS, 'ONLINE');
      const h3Index = latLngToH3Index(coords.latitude, coords.longitude, 8);
      const h3Key = getDriverH3RedisKey(h3Index);
      await this.redis.sadd(h3Key, partner.id);
      await this.redis.expire(h3Key, HEARTBEAT_TTL_SECONDS);
    } catch {}

    return { success: true, timestamp: new Date().toISOString() };
  }

  async recordLocation(userId: string, dto: PartnerLocationUpdateDto): Promise<{ success: boolean; id: string }> {
    const partner = await this.getPartnerByUserId(userId);
    const activeJobId = await this.repo.getActiveJobId(partner.id);
    const now = dto.recordedAt ? new Date(dto.recordedAt) : new Date();

    const prevPoint = await this.repo.getLastRecordedPoint(partner.id);

    if (prevPoint) {
      const timeDiffSec = (now.getTime() - new Date(prevPoint.recorded_at).getTime()) / 1000;

      if (timeDiffSec >= 0 && timeDiffSec < 3600) {
        const distMeters = this.calculateDistanceMeters(
          Number(prevPoint.lat),
          Number(prevPoint.lon),
          dto.latitude,
          dto.longitude
        );
        const effectiveTime = Math.max(timeDiffSec, 1);
        const speedKmh = (distMeters / effectiveTime) * 3.6;

        if (dto.isMockProvider === true) {
          this.logger.warn(`Mock GPS location rejected for partner ${partner.id}`);
          throw new BadRequestException('MOCK_PROVIDER: Fake/mock GPS coordinates rejected');
        }

        if (speedKmh > 120.0) {
          this.logger.warn(`Suspicious GPS velocity detected for partner ${partner.id}: ${speedKmh.toFixed(1)} km/h`);
          throw new BadRequestException(`EXCESSIVE_VELOCITY: Velocity ${speedKmh.toFixed(1)} km/h exceeds 120 km/h limit`);
        }
      }
    }

    const id = await this.repo.insertLocation(
      partner.id,
      activeJobId,
      dto.longitude,
      dto.latitude,
      dto.heading,
      dto.speedMps,
      dto.accuracyMeters,
      now
    );

    try {
      await this.redis.geoadd(REDIS_ONLINE_PARTNERS_GEO_KEY, dto.longitude, dto.latitude, partner.id);
      await this.redis.setex(`dispatch:partner:${partner.id}:heartbeat`, HEARTBEAT_TTL_SECONDS, 'ONLINE');
      const h3Index = latLngToH3Index(dto.latitude, dto.longitude, 8);
      const h3Key = getDriverH3RedisKey(h3Index);
      await this.redis.sadd(h3Key, partner.id);
      await this.redis.expire(h3Key, HEARTBEAT_TTL_SECONDS);
    } catch {}

    if (activeJobId) {
      this.gateway.emitPartnerLocationUpdate(activeJobId, {
        jobId: activeJobId,
        partnerId: partner.id,
        latitude: dto.latitude,
        longitude: dto.longitude,
        heading: dto.heading,
        speedMps: dto.speedMps,
        recordedAt: now.toISOString(),
      });
    }

    return { success: true, id };
  }

  private calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
