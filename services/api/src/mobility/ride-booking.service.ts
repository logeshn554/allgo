import crypto from 'node:crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { RideEventRepository } from './data/ride-event.repository.js';
import { RideRepository } from './data/ride.repository.js';
import { BookRideDto } from './dto/mobility.dto.js';
import { MobilityFareService } from './mobility-fare.service.js';
import { PartnerContinuityService } from './partner-continuity.service.js';

@Injectable()
export class RideBookingService {
  private readonly logger = new Logger(RideBookingService.name);

  constructor(
    private readonly rideRepo: RideRepository,
    private readonly rideEventRepo: RideEventRepository,
    private readonly fareService: MobilityFareService,
    private readonly continuityService: PartnerContinuityService,
  ) {}

  private generateOtp(): string {
    return crypto.randomInt(1000, 9999).toString();
  }

  async bookRide(customerId: string, dto: BookRideDto): Promise<any> {
    await this.fareService.checkStateClearance(dto.stateCode || 'TN', 'RIDE');

    const distanceKm = this.fareService.calculateDistanceKm(
      dto.pickupLocation,
      dto.dropoffLocation,
    );
    const durationMinutes = this.fareService.estimateDurationMinutes(
      distanceKm,
      dto.vehicleCategory,
    );

    const fare = await this.fareService.calculateRideBookingFare(
      dto.vehicleCategory,
      distanceKm,
      durationMinutes,
    );

    const rideNumber = `RID-${Date.now().toString(36).toUpperCase()}-${crypto.randomInt(100, 999)}`;
    const startOtp = this.generateOtp();
    const otpHash = crypto.createHash('sha256').update(startOtp).digest('hex');

    let serviceType = 'CAB';
    if (dto.vehicleCategory === 'BIKE') serviceType = 'BIKE_TAXI';
    else if (dto.vehicleCategory === 'AUTO') serviceType = 'AUTO_RICKSHAW';
    else if (dto.vehicleCategory === 'CAB_PREMIUM') serviceType = 'CAB';

    const fareSnapshot = {
      baseFare: fare.baseFare,
      distanceKm,
      distanceFare: fare.distanceFare,
      durationMinutes,
      timeFare: fare.timeFare,
      platformFee: fare.platformFee,
      taxTotal: fare.gst,
      totalFare: fare.totalFare,
      pricingRuleVersion: 'v1.0',
      quotedAt: new Date().toISOString(),
    };

    const cityId = await this.rideRepo.getDefaultCityId();
    const partnerPayout = Math.round(fare.totalFare * 0.8 * 100) / 100;

    const ride = await this.rideRepo.insertRide({
      rideNumber,
      customerId,
      cityId,
      vehicleCategory: dto.vehicleCategory,
      pickupAddress: dto.pickupAddress,
      pickupLocation: dto.pickupLocation,
      dropoffAddress: dto.dropoffAddress,
      dropoffLocation: dto.dropoffLocation,
      startOtp,
      distanceKm,
      durationMinutes,
      fare,
      partnerPayout,
      paymentMethod: dto.paymentMethod,
      serviceType,
      otpHash,
      fareSnapshot,
      specialInstructions: dto.specialInstructions,
    });

    this.logger.log(`Created ride booking ${ride.ride_number} for customer ${customerId}`);

    await this.rideEventRepo.recordRideEvent(
      ride.id,
      'RIDE_REQUESTED',
      'CUSTOMER',
      customerId,
      null,
      'REQUESTED',
      fareSnapshot,
    );

    return ride;
  }

  async cancelRide(userId: string, role: string, rideId: string, reason: string): Promise<any> {
    const ride = await this.rideRepo.findById(rideId);

    if (ride.status === 'COMPLETED' || ride.status === 'CANCELLED') {
      throw new BadRequestException(`Cannot cancel ride in terminal status: ${ride.status}`);
    }

    const cancelEventType = role === 'PARTNER' ? 'DRIVER_CANCELLED' : 'CUSTOMER_CANCELLED';

    const updated = await this.rideRepo.updateRideCancelled(rideId, reason, userId);

    await this.rideEventRepo.recordRideEvent(
      rideId,
      cancelEventType,
      role,
      userId,
      ride.status,
      'CANCELLED',
      { reason },
    );

    if (ride.partner_id) {
      await this.continuityService.releaseVerticalLock(ride.partner_id);
    }

    return updated;
  }
}
