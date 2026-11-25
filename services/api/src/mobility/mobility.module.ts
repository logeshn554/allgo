import { Module } from '@nestjs/common';
import { MapsModule } from '../common/maps/maps.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { FinanceModule } from '../finance/finance.module.js';
import { RedisModule } from '../redis/redis.module.js';
import { AdminMobilityController } from './controllers/admin-mobility.controller.js';
import { HireDriverController } from './controllers/hire-driver.controller.js';
import { PartnerContinuityController } from './controllers/partner-continuity.controller.js';
import { RidesController } from './controllers/rides.controller.js';
import { HireDriverRepository } from './data/hire-driver.repository.js';
import { RideAssignmentRepository } from './data/ride-assignment.repository.js';
import { RideEventRepository } from './data/ride-event.repository.js';
import { RideRepository } from './data/ride.repository.js';
import { HireDriverBookingService } from './hire-driver-booking.service.js';
import { HireDriverDutyService } from './hire-driver-duty.service.js';
import { HireDriverQueryService } from './hire-driver-query.service.js';
import { HireDriverService } from './hire-driver.service.js';
import { MobilityFareService } from './mobility-fare.service.js';
import { ParcelsService } from './parcels.service.js';
import { PartnerContinuityExtensionService } from './partner-continuity-extension.service.js';
import { PartnerContinuityService } from './partner-continuity.service.js';
import { RideBookingService } from './ride-booking.service.js';
import { RideDispatchOfferService } from './ride-dispatch-offer.service.js';
import { RideSafetyQueryService } from './ride-safety-query.service.js';
import { RideTripExecutionService } from './ride-trip-execution.service.js';
import { RidesService } from './rides.service.js';

@Module({
  imports: [DatabaseModule, RedisModule, MapsModule, FinanceModule],
  providers: [
    MobilityFareService,
    PartnerContinuityService,
    PartnerContinuityExtensionService,
    RideRepository,
    RideAssignmentRepository,
    RideEventRepository,
    HireDriverRepository,
    RideBookingService,
    RideTripExecutionService,
    RideDispatchOfferService,
    RideSafetyQueryService,
    HireDriverBookingService,
    HireDriverDutyService,
    HireDriverQueryService,
    RidesService,
    ParcelsService,
    HireDriverService,
  ],
  controllers: [
    RidesController,
    HireDriverController,
    PartnerContinuityController,
    AdminMobilityController,
  ],
  exports: [
    MobilityFareService,
    PartnerContinuityService,
    PartnerContinuityExtensionService,
    RidesService,
    ParcelsService,
    HireDriverService,
    RideRepository,
    HireDriverRepository,
  ],
})
export class MobilityModule {}
