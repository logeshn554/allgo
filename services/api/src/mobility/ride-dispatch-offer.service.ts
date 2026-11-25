import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { RideAssignmentRepository } from './data/ride-assignment.repository.js';
import { RideEventRepository } from './data/ride-event.repository.js';
import { RideRepository } from './data/ride.repository.js';
import { PartnerContinuityService } from './partner-continuity.service.js';

@Injectable()
export class RideDispatchOfferService {
  private readonly logger = new Logger(RideDispatchOfferService.name);

  constructor(
    private readonly rideRepo: RideRepository,
    private readonly assignmentRepo: RideAssignmentRepository,
    private readonly rideEventRepo: RideEventRepository,
    private readonly continuityService: PartnerContinuityService,
  ) {}

  async requestDispatch(rideId: string): Promise<any> {
    const ride = await this.rideRepo.findById(rideId);

    const eligiblePartners = await this.assignmentRepo.findEligiblePartners(rideId);

    if (eligiblePartners.length === 0) {
      await this.rideEventRepo.recordRideEvent(
        rideId,
        'DISPATCH_NO_PARTNERS',
        'SYSTEM',
        null,
        ride.status,
        ride.status,
      );
      return { status: 'NO_PARTNERS_AVAILABLE', rideId };
    }

    const selectedPartner = eligiblePartners[0];
    const expiresAt = new Date(Date.now() + 20 * 1000); // 20s offer SLA

    const assignment = await this.assignmentRepo.createAssignment(
      rideId,
      selectedPartner.id,
      expiresAt,
    );

    await this.rideRepo.updateSearchingForDriver(rideId);

    await this.rideEventRepo.recordRideEvent(
      rideId,
      'DRIVER_ASSIGNED',
      'SYSTEM',
      null,
      ride.status,
      'SEARCHING_FOR_DRIVER',
      { partnerId: selectedPartner.id, attemptId: assignment.id },
    );

    return {
      status: 'OFFER_DISPATCHED',
      rideId,
      partnerId: selectedPartner.id,
      attemptId: assignment.id,
      offerExpiresAt: expiresAt.toISOString(),
    };
  }

  async getPartnerOffers(partnerUserId: string): Promise<any[]> {
    const partner = await this.continuityService.getPartnerByUserId(partnerUserId);
    const rows = await this.assignmentRepo.getPartnerOffers(partner.id);

    return rows.map((r: any) => ({
      attemptId: r.id,
      rideId: r.ride_id,
      rideNumber: r.ride_number,
      rideType: r.ride_type,
      serviceType: r.service_type,
      pickupAddress: r.pickup_address,
      dropoffAddress: r.drop_address,
      totalFareInr: Number(r.total_fare_inr),
      partnerPayoutInr: Number(r.partner_payout_inr),
      estimatedDistanceKm: Number(r.estimated_distance_km),
      offerSentAt: r.offer_sent_at,
      offerExpiresAt: r.offer_expires_at,
    }));
  }

  async getPartnerActiveRide(partnerUserId: string): Promise<any | null> {
    const partner = await this.continuityService.getPartnerByUserId(partnerUserId);
    return this.rideRepo.findActiveByPartnerId(partner.id);
  }

  async acceptOffer(partnerUserId: string, attemptId: string): Promise<any> {
    const partner = await this.continuityService.getPartnerByUserId(partnerUserId);
    const assignment = await this.assignmentRepo.findAssignmentById(attemptId);

    if (assignment.partner_id !== partner.id) {
      throw new ForbiddenException('Not authorized to accept this offer');
    }
    if (assignment.status !== 'OFFERED') {
      throw new BadRequestException(`Offer is no longer active (status: ${assignment.status})`);
    }
    if (new Date(assignment.offer_expires_at) < new Date()) {
      await this.assignmentRepo.expireAssignment(attemptId);
      throw new BadRequestException('Ride offer has expired');
    }

    await this.continuityService.acquireVerticalLock(partner.id, 'RIDE');
    await this.assignmentRepo.updateAssignmentAccepted(attemptId);

    const updatedRide = await this.rideRepo.updatePartnerAccepted(assignment.ride_id, partner.id);

    await this.rideEventRepo.recordRideEvent(
      assignment.ride_id,
      'DRIVER_ACCEPTED',
      'PARTNER',
      partnerUserId,
      'OFFERED',
      'ACCEPTED',
    );

    return updatedRide;
  }

  async rejectOffer(partnerUserId: string, attemptId: string, reason?: string): Promise<any> {
    const partner = await this.continuityService.getPartnerByUserId(partnerUserId);
    const assignment = await this.assignmentRepo.findAssignmentById(attemptId);

    if (assignment.partner_id !== partner.id) {
      throw new ForbiddenException('Not authorized to reject this offer');
    }

    await this.assignmentRepo.updateAssignmentRejected(attemptId, reason);

    await this.rideEventRepo.recordRideEvent(
      assignment.ride_id,
      'DRIVER_REJECTED',
      'PARTNER',
      partnerUserId,
      assignment.status,
      'REJECTED',
      { reason },
    );

    setImmediate(async () => {
      try {
        await this.requestDispatch(assignment.ride_id);
      } catch (e: any) {
        this.logger.warn(`Background ride redispatch failed: ${e.message}`);
      }
    });

    return { status: 'OFFER_REJECTED', attemptId, rideId: assignment.ride_id };
  }
}
