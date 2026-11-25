import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { DeliveryModule } from '../delivery/delivery.module.js';
import { MobilityModule } from '../mobility/mobility.module.js';
import { OrderingModule } from '../ordering/ordering.module.js';
import { RedisModule } from '../redis/redis.module.js';
import { ZonesModule } from '../zones/zones.module.js';

import { ParcelAssignmentRepository } from './data/parcel-assignment.repository.js';
import { ParcelEventRepository } from './data/parcel-event.repository.js';
// Repositories
import { ParcelRepository } from './data/parcel.repository.js';

import { AdminParcelService } from './admin-parcel.service.js';
import { ParcelBookingService } from './parcel-booking.service.js';
import { ParcelLifecycleService } from './parcel-lifecycle.service.js';
import { ParcelOfferDispatchService } from './parcel-offer-dispatch.service.js';
import { ParcelPartnerEligibilityService } from './parcel-partner-eligibility.service.js';
import { ParcelPricingService } from './parcel-pricing.service.js';
// Sub-Services
import { ParcelRestrictionService } from './parcel-restriction.service.js';
import { ParcelTrackingService } from './parcel-tracking.service.js';
import { PartnerParcelService } from './partner-parcel.service.js';

// Facades
import { ParcelDispatchService } from './parcel-dispatch.service.js';
import { ParcelService } from './parcel.service.js';

import { AdminParcelController } from './controllers/admin-parcel.controller.js';
// Controllers
import { CustomerParcelController } from './controllers/customer-parcel.controller.js';
import { PartnerParcelController } from './controllers/partner-parcel.controller.js';

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    ZonesModule,
    DeliveryModule,
    OrderingModule,
    MobilityModule,
  ],
  controllers: [CustomerParcelController, PartnerParcelController, AdminParcelController],
  providers: [
    // Repositories
    ParcelRepository,
    ParcelEventRepository,
    ParcelAssignmentRepository,
    // Sub-Services
    ParcelRestrictionService,
    ParcelPricingService,
    ParcelPartnerEligibilityService,
    ParcelOfferDispatchService,
    ParcelBookingService,
    ParcelLifecycleService,
    ParcelTrackingService,
    PartnerParcelService,
    AdminParcelService,
    // Facades
    ParcelDispatchService,
    ParcelService,
  ],
  exports: [
    ParcelRepository,
    ParcelEventRepository,
    ParcelAssignmentRepository,
    ParcelRestrictionService,
    ParcelPricingService,
    ParcelPartnerEligibilityService,
    ParcelOfferDispatchService,
    ParcelBookingService,
    ParcelLifecycleService,
    ParcelTrackingService,
    PartnerParcelService,
    AdminParcelService,
    ParcelDispatchService,
    ParcelService,
  ],
})
export class ParcelModule {}
