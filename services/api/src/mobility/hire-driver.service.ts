import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { HireDriverRepository } from './data/hire-driver.repository.js';
import { BookHireDriverDto, EndHireDutyDto, StartHireDutyDto } from './dto/mobility.dto.js';
import { HireDriverBookingService } from './hire-driver-booking.service.js';
import { HireDriverDutyService } from './hire-driver-duty.service.js';
import { HireDriverQueryService } from './hire-driver-query.service.js';
import { MobilityFareService } from './mobility-fare.service.js';
import { PartnerContinuityService } from './partner-continuity.service.js';

@Injectable()
export class HireDriverService {
  private readonly bookingService: HireDriverBookingService;
  private readonly dutyService: HireDriverDutyService;
  private readonly queryService: HireDriverQueryService;

  constructor(
    private readonly db: DatabaseService,
    private readonly fareService: MobilityFareService,
    private readonly continuityService: PartnerContinuityService,
    bookingService?: HireDriverBookingService,
    dutyService?: HireDriverDutyService,
    queryService?: HireDriverQueryService,
  ) {
    if (bookingService && dutyService && queryService) {
      this.bookingService = bookingService;
      this.dutyService = dutyService;
      this.queryService = queryService;
    } else {
      const repo = new HireDriverRepository(this.db);
      this.bookingService = new HireDriverBookingService(
        repo,
        this.fareService,
        this.continuityService,
      );
      this.dutyService = new HireDriverDutyService(repo, this.continuityService);
      this.queryService = new HireDriverQueryService(repo, this.continuityService);
    }
  }

  async recordHireDriverEvent(
    bookingId: string,
    eventType: string,
    actorRole = 'SYSTEM',
    actorId?: string | null,
    fromStatus?: string | null,
    toStatus?: string | null,
    metadata: any = {},
  ): Promise<void> {
    return this.queryService.recordHireDriverEvent(
      bookingId,
      eventType,
      actorRole,
      actorId,
      fromStatus,
      toStatus,
      metadata,
    );
  }

  async bookDriver(customerId: string, dto: BookHireDriverDto): Promise<any> {
    return this.bookingService.bookDriver(customerId, dto);
  }

  async assignDriver(driverUserId: string, bookingId: string): Promise<any> {
    return this.dutyService.assignDriver(driverUserId, bookingId);
  }

  async driverArrived(driverUserId: string, bookingId: string): Promise<any> {
    return this.dutyService.driverArrived(driverUserId, bookingId);
  }

  async startDuty(driverUserId: string, bookingId: string, dto: StartHireDutyDto): Promise<any> {
    return this.dutyService.startDuty(driverUserId, bookingId, dto);
  }

  async endDuty(driverUserId: string, bookingId: string, dto: EndHireDutyDto): Promise<any> {
    return this.dutyService.endDuty(driverUserId, bookingId, dto);
  }

  async cancelBooking(
    userId: string,
    role: string,
    bookingId: string,
    reason: string,
  ): Promise<any> {
    return this.bookingService.cancelBooking(userId, role, bookingId, reason);
  }

  async getBookingEvents(userId: string, role: string, bookingId: string): Promise<any[]> {
    return this.queryService.getBookingEvents(userId, role, bookingId);
  }

  async listBookings(
    userId: string,
    role: string,
    options?: { limit?: number; offset?: number },
  ): Promise<any[]> {
    return this.queryService.listBookings(userId, role, options);
  }

  async getBookingDetails(userId: string, role: string, bookingId: string): Promise<any> {
    return this.queryService.getBookingDetails(userId, role, bookingId);
  }

  async getPartnerActiveBooking(partnerUserId: string): Promise<any | null> {
    return this.queryService.getPartnerActiveBooking(partnerUserId);
  }
}
