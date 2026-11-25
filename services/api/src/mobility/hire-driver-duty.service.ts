import crypto from 'node:crypto';
import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { HireDriverRepository } from './data/hire-driver.repository.js';
import { EndHireDutyDto, StartHireDutyDto } from './dto/mobility.dto.js';
import { PartnerContinuityService } from './partner-continuity.service.js';

@Injectable()
export class HireDriverDutyService {
  constructor(
    private readonly repo: HireDriverRepository,
    private readonly continuityService: PartnerContinuityService,
  ) {}

  async assignDriver(driverUserId: string, bookingId: string): Promise<any> {
    const partner = await this.continuityService.getPartnerByUserId(driverUserId);
    await this.continuityService.acquireVerticalLock(partner.id, 'HIRE_DRIVER');

    const booking = await this.repo.findById(bookingId);
    if (booking.status !== 'BOOKED') {
      await this.continuityService.releaseVerticalLock(partner.id);
      throw new BadRequestException(
        `Booking is not available for assignment (status: ${booking.status})`,
      );
    }

    const updated = await this.repo.updateDriverAssigned(bookingId, partner.id);

    await this.repo.recordHireDriverEvent(
      bookingId,
      'DRIVER_ASSIGNED',
      'PARTNER',
      driverUserId,
      booking.status,
      'ASSIGNED',
    );

    return updated;
  }

  async driverArrived(driverUserId: string, bookingId: string): Promise<any> {
    const partner = await this.continuityService.getPartnerByUserId(driverUserId);
    const booking = await this.repo.findById(bookingId);

    if (booking.partner_id !== partner.id) {
      throw new ForbiddenException('Not the assigned driver for this booking');
    }

    const updated = await this.repo.updateDriverArrived(bookingId);

    await this.repo.recordHireDriverEvent(
      bookingId,
      'DRIVER_ARRIVED',
      'PARTNER',
      driverUserId,
      booking.status,
      'ARRIVED',
    );

    return updated;
  }

  async startDuty(driverUserId: string, bookingId: string, dto: StartHireDutyDto): Promise<any> {
    const partner = await this.continuityService.getPartnerByUserId(driverUserId);
    const booking = await this.repo.findById(bookingId);

    if (booking.partner_id !== partner.id) {
      throw new ForbiddenException('Not the assigned driver for this booking');
    }

    const trimmed = dto.startOtp ? dto.startOtp.trim() : '';
    const inputHash = crypto.createHash('sha256').update(trimmed).digest('hex');
    const isHashMatch = booking.start_otp_hash ? booking.start_otp_hash === inputHash : false;
    const isPlainMatch = booking.start_otp === trimmed;

    if (!isHashMatch && !isPlainMatch) {
      await this.repo.incrementStartOtpAttempts(bookingId);
      throw new BadRequestException('Invalid start OTP for driver duty');
    }

    const updated = await this.repo.updateDutyStarted(bookingId, dto.odometerKm);

    await this.repo.recordHireDriverEvent(
      bookingId,
      'DUTY_STARTED',
      'PARTNER',
      driverUserId,
      booking.status,
      'STARTED',
      { startOdometerKm: dto.odometerKm },
    );

    return updated;
  }

  async endDuty(driverUserId: string, bookingId: string, dto: EndHireDutyDto): Promise<any> {
    const partner = await this.continuityService.getPartnerByUserId(driverUserId);
    const booking = await this.repo.findById(bookingId);

    if (booking.partner_id !== partner.id) {
      throw new ForbiddenException('Not the assigned driver for this booking');
    }

    const trimmed = dto.endOtp ? dto.endOtp.trim() : '';
    const inputHash = crypto.createHash('sha256').update(trimmed).digest('hex');
    const isHashMatch = booking.end_otp_hash ? booking.end_otp_hash === inputHash : false;
    const isPlainMatch = booking.end_otp === trimmed;

    if (!isHashMatch && !isPlainMatch) {
      await this.repo.incrementEndOtpAttempts(bookingId);
      throw new BadRequestException('Invalid end OTP for driver duty');
    }

    const startTime = booking.duty_started_at ? new Date(booking.duty_started_at) : new Date();
    const endTime = new Date();
    const actualHours = Math.max(
      Math.round(((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)) * 10) / 10,
      0.5,
    );

    const bookedHours = Number(booking.duration_hours);
    const overtimeHours = Math.max(actualHours - bookedHours, 0);
    const overtimeFee = Math.round(overtimeHours * 150.0 * 100) / 100;

    const baseAmount = Number(booking.total_amount_inr);
    const finalAmount = baseAmount + overtimeFee;
    const finalPayout = Math.round(finalAmount * 0.8 * 100) / 100;

    const updated = await this.repo.updateDutyCompleted(
      bookingId,
      dto.odometerKm || null,
      overtimeFee,
      finalAmount,
      finalPayout,
    );

    await this.repo.recordPartnerEarnings(partner.id, finalPayout);

    await this.repo.recordHireDriverEvent(
      bookingId,
      'DUTY_COMPLETED',
      'PARTNER',
      driverUserId,
      booking.status,
      'COMPLETED',
      { endOdometerKm: dto.odometerKm, overtimeFee, finalAmount },
    );

    await this.continuityService.releaseVerticalLock(partner.id);

    return updated;
  }
}
