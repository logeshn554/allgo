import { Injectable } from '@nestjs/common';
import { PartnerContinuityService } from './partner-continuity.service.js';
import { HireDriverRepository } from './data/hire-driver.repository.js';

@Injectable()
export class HireDriverQueryService {
  constructor(
    private readonly repo: HireDriverRepository,
    private readonly continuityService: PartnerContinuityService,
  ) {}

  async recordHireDriverEvent(
    bookingId: string,
    eventType: string,
    actorRole: string = 'SYSTEM',
    actorId?: string | null,
    fromStatus?: string | null,
    toStatus?: string | null,
    metadata: any = {}
  ): Promise<void> {
    return this.repo.recordHireDriverEvent(
      bookingId,
      eventType,
      actorRole,
      actorId,
      fromStatus,
      toStatus,
      metadata
    );
  }

  async getBookingEvents(_userId: string, _role: string, bookingId: string): Promise<any[]> {
    return this.repo.getBookingEvents(bookingId);
  }

  async listBookings(userId: string, role: string, options?: { limit?: number; offset?: number }): Promise<any[]> {
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    let whereClause = '';
    const params: any[] = [limit, offset];

    if (role === 'CUSTOMER') {
      whereClause = 'WHERE b.customer_id = $3';
      params.push(userId);
    } else if (role === 'PARTNER') {
      whereClause = 'WHERE b.partner_id IN (SELECT id FROM partners WHERE user_id = $3)';
      params.push(userId);
    }

    return this.repo.listBookings(whereClause, params);
  }

  async getBookingDetails(userId: string, role: string, bookingId: string): Promise<any> {
    const b = await this.repo.findByIdWithDetails(bookingId);

    const isCustomer = b.customer_id === userId;
    const isDriver = role === 'PARTNER';

    return {
      id: b.id,
      bookingNumber: b.booking_number,
      durationHours: b.duration_hours,
      transmission: b.vehicle_transmission,
      status: b.status,
      pickupAddress: b.pickup_address,
      scheduledStartTime: b.scheduled_start_time,
      totalAmountInr: Number(b.total_amount_inr),
      startOtp: isCustomer ? b.start_otp : null,
      endOtp: isCustomer ? b.end_otp : null,
      driver: b.partner_id
        ? {
            name: b.driver_name || 'Chauffeur',
            phone: isCustomer ? b.driver_phone : undefined,
          }
        : null,
      createdAt: b.created_at,
    };
  }

  async getPartnerActiveBooking(partnerUserId: string): Promise<any | null> {
    const partner = await this.continuityService.getPartnerByUserId(partnerUserId);
    return this.repo.findActiveByPartnerId(partner.id);
  }

  async getBookingOrThrow(bookingId: string): Promise<any> {
    return this.repo.findById(bookingId);
  }
}
