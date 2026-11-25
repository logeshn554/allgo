import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MapsModule } from '../common/maps/maps.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { HealthModule } from '../health/health.module.js';
import { RedisModule } from '../redis/redis.module.js';

import { DeliveryGateway } from './delivery.gateway.js';
import { PartnerAvailabilityService } from './partner-availability.service.js';

import { DeliveryEventRepository } from './data/delivery-event.repository.js';
import { DeliveryExceptionRepository } from './data/delivery-exception.repository.js';
// Repositories
import { DeliveryJobRepository } from './data/delivery-job.repository.js';
import { DeliveryProofRepository } from './data/delivery-proof.repository.js';
import { DispatchAttemptRepository } from './data/dispatch-attempt.repository.js';

import { AdminDashboardService } from './admin-dashboard.service.js';
import { AdminDeliverySupervisionService } from './admin-delivery-supervision.service.js';
import { DeliveryExceptionService } from './delivery-exception.service.js';
import { DeliveryHandoverService } from './delivery-handover.service.js';
import { DeliveryJobLifecycleService } from './delivery-job-lifecycle.service.js';
// Sub-Services
import { DispatchCandidateMatcherService } from './dispatch-candidate-matcher.service.js';
import { DispatchManualAssignmentService } from './dispatch-manual-assignment.service.js';
import { DispatchOfferLifecycleService } from './dispatch-offer-lifecycle.service.js';
import { MultiStoreBatchingService } from './multi-store-batching.service.js';

import { DeliveryJobService } from './delivery-job.service.js';
// Facades
import { DispatchEngineService } from './dispatch-engine.service.js';

import { AdminDashboardController } from './controllers/admin-dashboard.controller.js';
import { AdminDispatchController } from './controllers/admin-dispatch.controller.js';
import { CustomerDeliveryController } from './controllers/customer-delivery.controller.js';
// Controllers
import { DeliveryJobController } from './controllers/delivery-job.controller.js';
import { MerchantDeliveryController } from './controllers/merchant-delivery.controller.js';
import { PartnerDeliveryController } from './controllers/partner-delivery.controller.js';

@Module({
  imports: [DatabaseModule, RedisModule, ConfigModule, MapsModule, HealthModule],
  controllers: [
    DeliveryJobController,
    MerchantDeliveryController,
    PartnerDeliveryController,
    CustomerDeliveryController,
    AdminDispatchController,
    AdminDashboardController,
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
    MultiStoreBatchingService,
    AdminDashboardService,
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
    MultiStoreBatchingService,
    AdminDashboardService,
    DispatchEngineService,
    DeliveryJobService,
  ],
})
export class DeliveryModule {}
