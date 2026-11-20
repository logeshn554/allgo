import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { latLngToH3Index, getH3KRing, getDriverH3RedisKey } from '@allgo/common';
import { RedisService } from '../redis/redis.service.js';
import { DispatchAttemptRepository } from './data/dispatch-attempt.repository.js';
import {
  PartnerAvailabilityService,
  REDIS_ONLINE_PARTNERS_GEO_KEY,
} from './partner-availability.service.js';
import type { MapsGateway } from '../common/maps/maps-gateway.interface.js';

@Injectable()
export class DispatchCandidateMatcherService {
  private readonly logger = new Logger(DispatchCandidateMatcherService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly attemptRepo: DispatchAttemptRepository,
    private readonly partnerAvailabilityService: PartnerAvailabilityService,
    @Optional() @Inject('MapsGateway') private readonly mapsGateway?: MapsGateway
  ) {}

  async findEligibleCandidate(
    jobId: string,
    pickupLon: number,
    pickupLat: number,
    config: any
  ): Promise<{ selectedPartnerId: string | null; attemptsCount: number }> {
    let candidatePartnerIds: string[] = [];

    // 1. Uber H3 Geospatial Partitioning Lookup (Res 8 / Res 9 k-ring sets in Redis)
    try {
      const centerHex = latLngToH3Index(Number(pickupLat), Number(pickupLon), 8);
      const kRingHexes = getH3KRing(centerHex, 1);
      const h3Keys = kRingHexes.map(getDriverH3RedisKey);

      const h3Partners = await this.redis.sunion(...h3Keys);
      if (h3Partners && h3Partners.length > 0) {
        candidatePartnerIds = h3Partners;
      }
    } catch (err: any) {
      this.logger.debug(`H3 set lookup skipped or empty: ${err.message}`);
    }

    // 2. Fallback to Redis GEORADIUS if H3 sets had no active candidates
    if (candidatePartnerIds.length === 0) {
      try {
        candidatePartnerIds = await this.redis.georadius(
          REDIS_ONLINE_PARTNERS_GEO_KEY,
          Number(pickupLon),
          Number(pickupLat),
          Number(config.max_search_radius_meters),
          25
        );
      } catch (err: any) {
        this.logger.warn(`Redis GEORADIUS error, falling back to PostGIS spatial search: ${err.message}`);
      }
    }

    if (candidatePartnerIds.length === 0) {
      candidatePartnerIds = await this.attemptRepo.findSpatialCandidatePartnerIds(
        Number(pickupLon),
        Number(pickupLat),
        Number(config.max_search_radius_meters)
      );
    }

    const pastRejectedIds = await this.attemptRepo.findPastRejectedPartnerIds(jobId);
    const rejectedPartnerIds = new Set(pastRejectedIds);

    const eligiblePartnerIds: string[] = [];

    for (const pid of candidatePartnerIds) {
      if (rejectedPartnerIds.has(pid)) continue;

      const isActive = await this.attemptRepo.isPartnerActiveOnJob(pid);
      if (isActive) continue;

      const eligibility = await this.partnerAvailabilityService.checkEligibility(pid);
      if (!eligibility.isEligible) continue;

      eligiblePartnerIds.push(pid);
    }

    if (eligiblePartnerIds.length === 0) {
      return { selectedPartnerId: null, attemptsCount: pastRejectedIds.length + 1 };
    }

    // Road ETA Dispatch Ranking
    let selectedPartnerId: string | null = eligiblePartnerIds[0] ?? null;
    if (this.mapsGateway && eligiblePartnerIds.length > 1) {
      try {
        const topCandidates = eligiblePartnerIds.slice(0, 5);
        let bestEtaSeconds = Infinity;
        for (const pid of topCandidates) {
          const pt = await this.partnerAvailabilityService.getPartnerLastPoint(pid);
          if (pt) {
            const route = await this.mapsGateway.computeRoute(
              { latitude: pt.lat, longitude: pt.lon },
              { latitude: Number(pickupLat), longitude: Number(pickupLon) },
              'TWO_WHEELER'
            );
            if (route.durationSeconds < bestEtaSeconds) {
              bestEtaSeconds = route.durationSeconds;
              selectedPartnerId = pid;
            }
          }
        }
      } catch (err: any) {
        this.logger.debug(`Road ETA ranking fallback: ${err.message}`);
      }
    }

    return {
      selectedPartnerId,
      attemptsCount: pastRejectedIds.length + 1,
    };
  }
}

