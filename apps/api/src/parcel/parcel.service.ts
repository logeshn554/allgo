import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { RedisService } from '../redis/redis.service.js';
import { PaymentService } from '../ordering/services/payment.service.js';
import { PartnerContinuityService } from '../mobility/partner-continuity.service.js';
import { DeliveryGateway } from '../delivery/delivery.gateway.js';
import { ParcelPricingService } from './parcel-pricing.service.js';
import { ParcelDispatchService } from './parcel-dispatch.service.js';
import {
  CreateParcelBookingDto,
  PayParcelDto,
  ReassignParcelDto,
  CancelParcelDto,
  FailedDeliveryAttemptDto,
  ReturnToSenderDto,
} from './dto/parcel.dto.js';
import { ParcelRepository } from './data/parcel.repository.js';
import { ParcelEventRepository } from './data/parcel-event.repository.js';
import { ParcelAssignmentRepository } from './data/parcel-assignment.repository.js';
import { ParcelBookingService } from './parcel-booking.service.js';
import { ParcelLifecycleService } from './parcel-lifecycle.service.js';
import { ParcelTrackingService } from './parcel-tracking.service.js';
import { PartnerParcelService } from './partner-parcel.service.js';
import { AdminParcelService } from './admin-parcel.service.js';

@Injectable()
export class ParcelService {
  private readonly booking: ParcelBookingService;
  private readonly lifecycle: ParcelLifecycleService;
  private readonly tracking: ParcelTrackingService;
  private readonly partner: PartnerParcelService;
  private readonly admin: AdminParcelService;

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly pricingService: ParcelPricingService,
    private readonly dispatchService: ParcelDispatchService,
    private readonly paymentService: PaymentService,
    private readonly continuityService: PartnerContinuityService,
    private readonly gateway: DeliveryGateway,
    bookingService?: ParcelBookingService,
    lifecycleService?: ParcelLifecycleService,
    trackingService?: ParcelTrackingService,
    partnerService?: PartnerParcelService,
    adminService?: AdminParcelService
  ) {
    if (bookingService && lifecycleService && trackingService && partnerService && adminService) {
      this.booking = bookingService;
      this.lifecycle = lifecycleService;
      this.tracking = trackingService;
      this.partner = partnerService;
      this.admin = adminService;
    } else {
      const parcelRepo = new ParcelRepository(db);
      const eventRepo = new ParcelEventRepository(db);
      const assignmentRepo = new ParcelAssignmentRepository(db);
      this.booking =
        bookingService ??
        new ParcelBookingService(
          db,
          parcelRepo,
          eventRepo,
          pricingService,
          dispatchService,
          paymentService,
          continuityService
        );
      this.lifecycle =
        lifecycleService ?? new ParcelLifecycleService(db, parcelRepo, eventRepo, continuityService);
      this.tracking = trackingService ?? new ParcelTrackingService(parcelRepo, eventRepo);
      this.partner =
        partnerService ?? new PartnerParcelService(parcelRepo, continuityService, assignmentRepo);
      this.admin =
        adminService ??
        new AdminParcelService(db, parcelRepo, eventRepo, dispatchService, continuityService);
    }
  }

  async createBooking(customerId: string, dto: CreateParcelBookingDto): Promise<any> {
    return this.booking.createBooking(customerId, dto);
  }

  async payBooking(customerId: string, parcelId: string, dto: PayParcelDto): Promise<any> {
    return this.booking.payBooking(customerId, parcelId, dto);
  }

  async confirmArrivedPickup(partnerUserId: string, parcelId: string): Promise<any> {
    return this.lifecycle.confirmArrivedPickup(partnerUserId, parcelId);
  }

  async verifyPickupOtp(partnerUserId: string, parcelId: string, otp: string): Promise<any> {
    return this.lifecycle.verifyPickupOtp(partnerUserId, parcelId, otp);
  }

  async startTransit(partnerUserId: string, parcelId: string): Promise<any> {
    return this.lifecycle.startTransit(partnerUserId, parcelId);
  }

  async confirmArrivedDestination(partnerUserId: string, parcelId: string): Promise<any> {
    return this.lifecycle.confirmArrivedDestination(partnerUserId, parcelId);
  }

  async verifyDelivery(
    partnerUserId: string,
    parcelId: string,
    otp: string,
    photoUrl?: string
  ): Promise<any> {
    return this.lifecycle.verifyDelivery(partnerUserId, parcelId, otp, photoUrl);
  }

  async recordFailedAttempt(
    partnerUserId: string,
    parcelId: string,
    dto: FailedDeliveryAttemptDto
  ): Promise<any> {
    return this.lifecycle.recordFailedAttempt(partnerUserId, parcelId, dto);
  }

  async initiateReturn(
    userId: string,
    role: string,
    parcelId: string,
    dto: ReturnToSenderDto
  ): Promise<any> {
    return this.lifecycle.initiateReturn(userId, role, parcelId, dto);
  }

  async completeReturn(partnerUserId: string, parcelId: string): Promise<any> {
    return this.lifecycle.completeReturn(partnerUserId, parcelId);
  }

  async cancelBooking(
    userId: string,
    role: string,
    parcelId: string,
    dto: CancelParcelDto
  ): Promise<any> {
    return this.booking.cancelBooking(userId, role, parcelId, dto);
  }

  async getParcelDetails(userId: string, role: string, parcelId: string): Promise<any> {
    return this.tracking.getParcelDetails(userId, role, parcelId);
  }

  async listCustomerBookings(
    customerId: string,
    limit: number = 20,
    offset: number = 0,
    status?: string
  ): Promise<any> {
    return this.tracking.listCustomerBookings(customerId, limit, offset, status);
  }

  async getTracking(userId: string, role: string, parcelId: string): Promise<any> {
    return this.tracking.getTracking(userId, role, parcelId);
  }

  async getEventTimeline(parcelId: string): Promise<any[]> {
    return this.tracking.getEventTimeline(parcelId);
  }

  async getReceipt(userId: string, role: string, parcelId: string): Promise<any> {
    return this.tracking.getReceipt(userId, role, parcelId);
  }

  async getPartnerActiveParcel(partnerUserId: string): Promise<any> {
    return this.partner.getPartnerActiveParcel(partnerUserId);
  }

  async getPartnerOffers(partnerUserId: string): Promise<any[]> {
    return this.partner.getPartnerOffers(partnerUserId);
  }

  async getPartnerHistory(
    partnerUserId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<any[]> {
    return this.partner.getPartnerHistory(partnerUserId, limit, offset);
  }

  async adminListParcels(filters: any): Promise<any> {
    return this.admin.adminListParcels(filters);
  }

  async adminReassign(adminUserId: string, parcelId: string, dto: ReassignParcelDto): Promise<any> {
    return this.admin.adminReassign(adminUserId, parcelId, dto);
  }

  async adminStats(): Promise<any> {
    return this.admin.adminStats();
  }
}
