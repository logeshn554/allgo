import { Injectable, BadRequestException, Logger, Optional } from '@nestjs/common';
import crypto from 'node:crypto';
import { MobilityFareService } from './mobility-fare.service.js';
import { PartnerContinuityService } from './partner-continuity.service.js';
import { HireDriverRepository } from './data/hire-driver.repository.js';
import { BookHireDriverDto } from './dto/mobility.dto.js';
import { CloudTasksGateway } from '../common/scheduling/cloud-tasks.gateway.js';

@Injectable()
export class HireDriverBookingService {
  private readonly logger = new Logger(HireDriverBookingService.name);

  constructor(
    private readonly repo: HireDriverRepository,
    private readonly fareService: MobilityFareService,
    private readonly continuityService: PartnerContinuityService,
    @Optional() private readonly cloudTasksGateway?: CloudTasksGateway,
  ) {}

  private generateOtp(): string {
    return crypto.randomInt(1000, 9999).toString();
  }

  async bookDriver(customerId: string, dto: BookHireDriverDto): Promise<any> {
    await this.fareService.checkStateClearance(dto.stateCode || 'TN', 'HIRE_DRIVER');

    const scheduledDate = new Date(dto.scheduledStartTime);
    const fare = this.fareService.calculateHireDriverFare(
      dto.durationHours,
      scheduledDate
    );

    const bookingNumber = `HDR-${Date.now().toString(36).toUpperCase()}-${crypto.randomInt(100, 999)}`;
    const startOtp = this.generateOtp();
    const endOtp = this.generateOtp();
    const startOtpHash = crypto.createHash('sha256').update(startOtp).digest('hex');
    const endOtpHash = crypto.createHash('sha256').update(endOtp).digest('hex');

    const cityId = await this.repo.getDefaultCityId();
    const partnerPayout = Math.round(fare.totalFare * 0.8 * 100) / 100;

    const booking = await this.repo.insertBooking({
      bookingNumber,
      customerId,
      cityId,
      vehicleTransmission: dto.vehicleTransmission,
      durationHours: dto.durationHours,
      scheduledDate,
      pickupAddress: dto.pickupAddress,
      pickupLocation: dto.pickupLocation,
      startOtp,
      endOtp,
      fare,
      partnerPayout,
      startOtpHash,
      endOtpHash,
    });

    this.logger.log(`Created driver hire booking ${booking.booking_number}`);

    await this.repo.recordHireDriverEvent(
      booking.id,
      'BOOKED',
      'CUSTOMER',
      customerId,
      null,
      'BOOKED',
      { durationHours: dto.durationHours, scheduledStartTime: scheduledDate.toISOString() }
    );

    if (this.cloudTasksGateway) {
      await this.cloudTasksGateway.scheduleTask({
        taskName: `cloud_task_hire_${booking.id}`,
        targetType: 'SCHEDULED_HIRE_DRIVER',
        targetId: booking.id,
        scheduledFor: scheduledDate,
        payload: { bookingId: booking.id, customerId, scheduledStartTime: scheduledDate.toISOString() },
      });
    }

    return booking;
  }

  async cancelBooking(userId: string, role: string, bookingId: string, reason: string): Promise<any> {
    const booking = await this.repo.findById(bookingId);

    if (booking.status === 'COMPLETED' || booking.status === 'CANCELLED') {
      throw new BadRequestException(`Cannot cancel booking in terminal status: ${booking.status}`);
    }

    const cancelEventType = role === 'PARTNER' ? 'DRIVER_CANCELLED' : 'CUSTOMER_CANCELLED';

    const updated = await this.repo.updateBookingCancelled(bookingId, reason);

    if (this.cloudTasksGateway) {
      await this.cloudTasksGateway.cancelTask(`cloud_task_hire_${bookingId}`);
    }

    await this.repo.recordHireDriverEvent(
      bookingId,
      cancelEventType,
      role,
      userId,
      booking.status,
      'CANCELLED',
      { reason }
    );

    if (booking.partner_id) {
      await this.continuityService.releaseVerticalLock(booking.partner_id);
    }

    return updated;
  }
}
