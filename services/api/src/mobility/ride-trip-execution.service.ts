import crypto from 'node:crypto';
import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { RideEventRepository } from './data/ride-event.repository.js';
import { RideRepository } from './data/ride.repository.js';
import { CompleteTripDto } from './dto/mobility.dto.js';
import { PartnerContinuityService } from './partner-continuity.service.js';

@Injectable()
export class RideTripExecutionService {
  constructor(
    private readonly rideRepo: RideRepository,
    private readonly rideEventRepo: RideEventRepository,
    private readonly continuityService: PartnerContinuityService,
  ) {}

  async assignDriver(driverUserId: string, rideId: string): Promise<any> {
    const partner = await this.continuityService.getPartnerByUserId(driverUserId);
    await this.continuityService.acquireVerticalLock(partner.id, 'RIDE');

    const ride = await this.rideRepo.findById(rideId);
    if (ride.status !== 'REQUESTED') {
      await this.continuityService.releaseVerticalLock(partner.id);
      throw new BadRequestException(`Ride is no longer available (status: ${ride.status})`);
    }

    return this.rideRepo.updateDriverAssigned(rideId, partner.id);
  }

  async driverArrived(driverUserId: string, rideId: string): Promise<any> {
    const partner = await this.continuityService.getPartnerByUserId(driverUserId);
    const ride = await this.rideRepo.findById(rideId);

    if (ride.partner_id !== partner.id) {
      throw new ForbiddenException('Not the assigned driver for this ride');
    }

    const updated = await this.rideRepo.updateDriverArrived(rideId);

    await this.rideEventRepo.recordRideEvent(
      rideId,
      'DRIVER_ARRIVED',
      'PARTNER',
      driverUserId,
      ride.status,
      'ARRIVED',
    );

    return updated;
  }

  async startTrip(driverUserId: string, rideId: string, otp: string): Promise<any> {
    const partner = await this.continuityService.getPartnerByUserId(driverUserId);
    const ride = await this.rideRepo.findById(rideId);

    if (ride.partner_id !== partner.id) {
      throw new ForbiddenException('Not the assigned driver for this ride');
    }

    if (Number(ride.otp_attempts || 0) >= 5) {
      throw new ForbiddenException('Max OTP verification attempts exceeded. Ride is locked.');
    }

    const trimmed = otp ? otp.trim() : '';
    const inputHash = crypto.createHash('sha256').update(trimmed).digest('hex');
    const isHashMatch = ride.otp_hash ? ride.otp_hash === inputHash : false;
    const isPlainMatch = ride.start_otp === trimmed;

    if (!isHashMatch && !isPlainMatch) {
      await this.rideRepo.incrementOtpAttempts(rideId);
      throw new BadRequestException('Invalid ride start OTP provided by passenger');
    }

    const updated = await this.rideRepo.updateTripStarted(rideId);

    await this.rideEventRepo.recordRideEvent(
      rideId,
      'TRIP_STARTED',
      'PARTNER',
      driverUserId,
      ride.status,
      'IN_PROGRESS',
    );

    return updated;
  }

  async completeTrip(driverUserId: string, rideId: string, dto?: CompleteTripDto): Promise<any> {
    const partner = await this.continuityService.getPartnerByUserId(driverUserId);
    const ride = await this.rideRepo.findById(rideId);

    if (ride.partner_id !== partner.id) {
      throw new ForbiddenException('Not the assigned driver for this ride');
    }

    if (ride.status !== 'IN_PROGRESS' && ride.status !== 'TRIP_STARTED') {
      throw new BadRequestException(`Cannot complete ride from status: ${ride.status}`);
    }

    const actualDist = dto?.actualDistanceKm ?? Number(ride.estimated_distance_km);
    const actualDur = dto?.actualDurationMinutes ?? Number(ride.estimated_duration_minutes);

    const updated = await this.rideRepo.updateTripCompleted(rideId, actualDist, actualDur);

    const payout = Number(ride.partner_payout_inr);
    await this.rideEventRepo.recordEarningsEntry(
      partner.id,
      payout,
      'Completed passenger mobility ride',
    );

    await this.rideEventRepo.recordRideEvent(
      rideId,
      'TRIP_COMPLETED',
      'PARTNER',
      driverUserId,
      ride.status,
      'COMPLETED',
      { actualDistanceKm: actualDist, actualDurationMinutes: actualDur, payoutInr: payout },
    );

    await this.continuityService.releaseVerticalLock(partner.id);

    return updated;
  }
}
