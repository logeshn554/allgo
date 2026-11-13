import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { MobilityFareService } from './mobility-fare.service.js';
import { PartnerContinuityService } from './partner-continuity.service.js';
import { RideRepository } from './data/ride.repository.js';
import { RideAssignmentRepository } from './data/ride-assignment.repository.js';
import { RideEventRepository } from './data/ride-event.repository.js';
import { RideBookingService } from './ride-booking.service.js';
import { RideTripExecutionService } from './ride-trip-execution.service.js';
import { RideDispatchOfferService } from './ride-dispatch-offer.service.js';
import { RideSafetyQueryService } from './ride-safety-query.service.js';
import {
  BookRideDto,
  CompleteTripDto,
  TriggerSosDto,
} from './dto/mobility.dto.js';

@Injectable()
export class RidesService {
  private readonly bookingService: RideBookingService;
  private readonly tripExecutionService: RideTripExecutionService;
  private readonly dispatchOfferService: RideDispatchOfferService;
  private readonly safetyQueryService: RideSafetyQueryService;

  constructor(
    private readonly db: DatabaseService,
    private readonly fareService: MobilityFareService,
    private readonly continuityService: PartnerContinuityService,
    bookingService?: RideBookingService,
    tripExecutionService?: RideTripExecutionService,
    dispatchOfferService?: RideDispatchOfferService,
    safetyQueryService?: RideSafetyQueryService,
  ) {
    if (bookingService && tripExecutionService && dispatchOfferService && safetyQueryService) {
      this.bookingService = bookingService;
      this.tripExecutionService = tripExecutionService;
      this.dispatchOfferService = dispatchOfferService;
      this.safetyQueryService = safetyQueryService;
    } else {
      const rideRepo = new RideRepository(this.db);
      const assignmentRepo = new RideAssignmentRepository(this.db);
      const eventRepo = new RideEventRepository(this.db);

      this.bookingService = new RideBookingService(rideRepo, eventRepo, this.fareService, this.continuityService);
      this.tripExecutionService = new RideTripExecutionService(rideRepo, eventRepo, this.continuityService);
      this.dispatchOfferService = new RideDispatchOfferService(rideRepo, assignmentRepo, eventRepo, this.continuityService);
      this.safetyQueryService = new RideSafetyQueryService(rideRepo, eventRepo);
    }
  }

  async recordRideEvent(
    rideId: string,
    eventType: string,
    actorRole: string = 'SYSTEM',
    actorId?: string | null,
    fromStatus?: string | null,
    toStatus?: string | null,
    metadata: any = {}
  ): Promise<void> {
    return this.safetyQueryService.recordRideEvent(rideId, eventType, actorRole, actorId, fromStatus, toStatus, metadata);
  }

  async bookRide(customerId: string, dto: BookRideDto): Promise<any> {
    return this.bookingService.bookRide(customerId, dto);
  }

  async assignDriver(driverUserId: string, rideId: string): Promise<any> {
    return this.tripExecutionService.assignDriver(driverUserId, rideId);
  }

  async driverArrived(driverUserId: string, rideId: string): Promise<any> {
    return this.tripExecutionService.driverArrived(driverUserId, rideId);
  }

  async startTrip(driverUserId: string, rideId: string, otp: string): Promise<any> {
    return this.tripExecutionService.startTrip(driverUserId, rideId, otp);
  }

  async completeTrip(driverUserId: string, rideId: string, dto?: CompleteTripDto): Promise<any> {
    return this.tripExecutionService.completeTrip(driverUserId, rideId, dto);
  }

  async triggerSos(userId: string, role: string, rideId: string, dto: TriggerSosDto): Promise<any> {
    return this.safetyQueryService.triggerSos(userId, role, rideId, dto);
  }

  async cancelRide(userId: string, role: string, rideId: string, reason: string): Promise<any> {
    return this.bookingService.cancelRide(userId, role, rideId, reason);
  }

  async requestDispatch(rideId: string): Promise<any> {
    return this.dispatchOfferService.requestDispatch(rideId);
  }

  async getPartnerOffers(partnerUserId: string): Promise<any[]> {
    return this.dispatchOfferService.getPartnerOffers(partnerUserId);
  }

  async getPartnerActiveRide(partnerUserId: string): Promise<any | null> {
    return this.dispatchOfferService.getPartnerActiveRide(partnerUserId);
  }

  async acceptOffer(partnerUserId: string, attemptId: string): Promise<any> {
    return this.dispatchOfferService.acceptOffer(partnerUserId, attemptId);
  }

  async rejectOffer(partnerUserId: string, attemptId: string, reason?: string): Promise<any> {
    return this.dispatchOfferService.rejectOffer(partnerUserId, attemptId, reason);
  }

  async getRideEvents(userId: string, role: string, rideId: string): Promise<any[]> {
    return this.safetyQueryService.getRideEvents(userId, role, rideId);
  }

  async listRides(userId: string, role: string, options?: { limit?: number; offset?: number }): Promise<any[]> {
    return this.safetyQueryService.listRides(userId, role, options);
  }

  async getRideDetails(userId: string, role: string, rideId: string): Promise<any> {
    return this.safetyQueryService.getRideDetails(userId, role, rideId);
  }
}
