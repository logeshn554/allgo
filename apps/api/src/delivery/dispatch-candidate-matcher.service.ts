import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service.js';
import { DispatchAttemptRepository } from './data/dispatch-attempt.repository.js';
import {
  PartnerAvailabilityService,
  REDIS_ONLINE_PARTNERS_GEO_KEY,
} from './partner-availability.service.js';

@Injectable()
export class DispatchCandidateMatcherService {
  private readonly logger = new Logger(DispatchCandidateMatcherService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly attemptRepo: DispatchAttemptRepository,
    private readonly partnerAvailabilityService: PartnerAvailabilityService
  ) {}

  async findEligibleCandidate(
    jobId: string,
    pickupLon: number,
    pickupLat: number,
    config: any
  ): Promise<{ selectedPartnerId: string | null; attemptsCount: number }> {
    let candidatePartnerIds: string[] = [];

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

    if (candidatePartnerIds.length === 0) {
      candidatePartnerIds = await this.attemptRepo.findSpatialCandidatePartnerIds(
        Number(pickupLon),
        Number(pickupLat),
        Number(config.max_search_radius_meters)
      );
    }

    const pastRejectedIds = await this.attemptRepo.findPastRejectedPartnerIds(jobId);
    const rejectedPartnerIds = new Set(pastRejectedIds);

    let selectedPartnerId: string | null = null;

    for (const pid of candidatePartnerIds) {
      if (rejectedPartnerIds.has(pid)) continue;

      const isActive = await this.attemptRepo.isPartnerActiveOnJob(pid);
      if (isActive) continue;

      const eligibility = await this.partnerAvailabilityService.checkEligibility(pid);
      if (!eligibility.isEligible) continue;

      selectedPartnerId = pid;
      break;
    }

    return {
      selectedPartnerId,
      attemptsCount: pastRejectedIds.length + 1,
    };
  }
}
