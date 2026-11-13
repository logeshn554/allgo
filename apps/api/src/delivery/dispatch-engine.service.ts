import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { RedisService } from '../redis/redis.service.js';
import { DeliveryGateway } from './delivery.gateway.js';
import { PartnerAvailabilityService } from './partner-availability.service.js';
import { DispatchAttemptRepository } from './data/dispatch-attempt.repository.js';
import { DispatchCandidateMatcherService } from './dispatch-candidate-matcher.service.js';
import { DispatchOfferLifecycleService } from './dispatch-offer-lifecycle.service.js';
import { DispatchManualAssignmentService } from './dispatch-manual-assignment.service.js';

@Injectable()
export class DispatchEngineService {
  private readonly matcher: DispatchCandidateMatcherService;
  private readonly offerLifecycle: DispatchOfferLifecycleService;
  private readonly manualAssignment: DispatchManualAssignmentService;

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly gateway: DeliveryGateway,
    partnerAvailabilityService?: PartnerAvailabilityService,
    matcherService?: DispatchCandidateMatcherService,
    offerLifecycleService?: DispatchOfferLifecycleService,
    manualAssignmentService?: DispatchManualAssignmentService
  ) {
    const partnerAvailability = partnerAvailabilityService ?? new PartnerAvailabilityService(db, redis, gateway);
    const attemptRepo = new DispatchAttemptRepository(db);

    this.matcher = matcherService ?? new DispatchCandidateMatcherService(redis, attemptRepo, partnerAvailability);
    this.offerLifecycle =
      offerLifecycleService ??
      new DispatchOfferLifecycleService(db, gateway, partnerAvailability, attemptRepo, this.matcher, redis);
    this.manualAssignment =
      manualAssignmentService ??
      new DispatchManualAssignmentService(db, gateway, partnerAvailability, attemptRepo);
  }

  async requestDispatch(jobId: string): Promise<any> {
    return this.offerLifecycle.requestDispatch(jobId);
  }

  async acceptOffer(userId: string, attemptId: string): Promise<any> {
    return this.offerLifecycle.acceptOffer(userId, attemptId);
  }

  async rejectOffer(userId: string, attemptId: string, reason?: string): Promise<any> {
    return this.offerLifecycle.rejectOffer(userId, attemptId, reason);
  }

  async manualAssign(adminId: string, jobId: string, partnerId: string, reason?: string): Promise<any> {
    return this.manualAssignment.manualAssign(adminId, jobId, partnerId, reason);
  }
}
