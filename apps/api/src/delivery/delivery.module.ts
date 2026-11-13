import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { RedisModule } from '../redis/redis.module.js';
import { ConfigModule } from '@nestjs/config';

import { DeliveryGateway } from './delivery.gateway.js';
import { PartnerAvailabilityService } from './partner-availability.service.js';

// Repositories
import { DeliveryJobRepository } from './data/delivery-job.repository.js';
import { DeliveryEventRepository } from './data/delivery-event.repository.js';
import { DeliveryProofRepository } from './data/delivery-proof.repository.js';
import { DeliveryExceptionRepository } from './data/delivery-exception.repository.js';
import { DispatchAttemptRepository } from './data/dispatch-attempt.repository.js';

// Sub-Services
import { DispatchCandidateMatcherService } from './dispatch-candidate-matcher.service.js';
import { DispatchOfferLifecycleService } from './dispatch-offer-lifecycle.service.js';
import { DispatchManualAssignmentService } from './dispatch-manual-assignment.service.js';
import { DeliveryJobLifecycleService } from './delivery-job-lifecycle.service.js';
import { DeliveryHandoverService } from './delivery-handover.service.js';
import { DeliveryExceptionService } from './delivery-exception.service.js';
import { AdminDeliverySupervisionService } from './admin-delivery-supervision.service.js';

// Facades
import { DispatchEngineService } from './dispatch-engine.service.js';
import { DeliveryJobService } from './delivery-job.service.js';

// Controllers
import { DeliveryJobController } from './controllers/delivery-job.controller.js';
import { MerchantDeliveryController } from './controllers/merchant-delivery.controller.js';
import { PartnerDeliveryController } from './controllers/partner-delivery.controller.js';
import { CustomerDeliveryController } from './controllers/customer-delivery.controller.js';
import { AdminDispatchController } from './controllers/admin-dispatch.controller.js';

@Module({
  imports: [DatabaseModule, RedisModule, ConfigModule],
  controllers: [
    DeliveryJobController,
    MerchantDeliveryController,
    PartnerDeliveryController,
    CustomerDeliveryController,
    AdminDispatchController,
  ],
  providers: [
    DeliveryGateway,
    PartnerAvailabilityService,
    // Repositories
    DeliveryJobRepository,
    DeliveryEventRepository,
    DeliveryProofRepository,
    DeliveryExceptionRepository,
    DispatchAttemptRepository,
    // Sub-Services
    DispatchCandidateMatcherService,
    DispatchOfferLifecycleService,
    DispatchManualAssignmentService,
    DeliveryJobLifecycleService,
    DeliveryHandoverService,
    DeliveryExceptionService,
    AdminDeliverySupervisionService,
    // Facades
    DispatchEngineService,
    DeliveryJobService,
  ],
  exports: [
    DeliveryGateway,
    PartnerAvailabilityService,
    DeliveryJobRepository,
    DeliveryEventRepository,
    DeliveryProofRepository,
    DeliveryExceptionRepository,
    DispatchAttemptRepository,
    DispatchCandidateMatcherService,
    DispatchOfferLifecycleService,
    DispatchManualAssignmentService,
    DeliveryJobLifecycleService,
    DeliveryHandoverService,
    DeliveryExceptionService,
    AdminDeliverySupervisionService,
    DispatchEngineService,
    DeliveryJobService,
  ],
})
export class DeliveryModule {}
