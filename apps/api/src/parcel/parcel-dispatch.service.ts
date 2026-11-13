import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { RedisService } from '../redis/redis.service.js';
import { DeliveryGateway } from '../delivery/delivery.gateway.js';
import { PartnerContinuityService } from '../mobility/partner-continuity.service.js';
import { ParcelAssignmentRepository } from './data/parcel-assignment.repository.js';
import { ParcelPartnerEligibilityService } from './parcel-partner-eligibility.service.js';
import { ParcelOfferDispatchService } from './parcel-offer-dispatch.service.js';

export const REDIS_ONLINE_PARTNERS_GEO_KEY = 'dispatch:partners:online:geo';

@Injectable()
export class ParcelDispatchService {
  private readonly eligibility: ParcelPartnerEligibilityService;
  private readonly offerDispatch: ParcelOfferDispatchService;

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly gateway: DeliveryGateway,
    continuityService?: PartnerContinuityService,
    eligibilityService?: ParcelPartnerEligibilityService,
    offerDispatchService?: ParcelOfferDispatchService
  ) {
    const continuity = continuityService ?? new PartnerContinuityService(db, redis);
    const assignmentRepo = new ParcelAssignmentRepository(db);
    this.eligibility = eligibilityService ?? new ParcelPartnerEligibilityService(db, continuity);
    this.offerDispatch =
      offerDispatchService ??
      new ParcelOfferDispatchService(db, redis, gateway, continuity, assignmentRepo, this.eligibility);
  }

  async checkEligibility(partnerId: string, weightKg?: number): Promise<{ isEligible: boolean; reason?: string }> {
    return this.eligibility.checkEligibility(partnerId, weightKg);
  }

  async checkPartnerEligibility(partnerId: string): Promise<{ isEligible: boolean; reason?: string }> {
    return this.eligibility.checkPartnerEligibility(partnerId);
  }

  async requestDispatch(parcelId: string): Promise<any> {
    return this.offerDispatch.requestDispatch(parcelId);
  }

  async acceptOffer(userId: string, attemptId: string): Promise<any> {
    return this.offerDispatch.acceptOffer(userId, attemptId);
  }

  async rejectOffer(userId: string, attemptId: string, reason: string): Promise<any> {
    return this.offerDispatch.rejectOffer(userId, attemptId, reason);
  }

  async getPartnerOffers(partnerUserId: string): Promise<any[]> {
    return this.offerDispatch.getPartnerOffers(partnerUserId);
  }
}
