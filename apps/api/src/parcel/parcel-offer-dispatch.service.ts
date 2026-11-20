import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { RedisService } from '../redis/redis.service.js';
import { DeliveryGateway } from '../delivery/delivery.gateway.js';
import { PartnerContinuityService } from '../mobility/partner-continuity.service.js';
import { ParcelAssignmentRepository } from './data/parcel-assignment.repository.js';
import { ParcelPartnerEligibilityService } from './parcel-partner-eligibility.service.js';

export const REDIS_ONLINE_PARTNERS_GEO_KEY = 'dispatch:partners:online:geo';

@Injectable()
export class ParcelOfferDispatchService {
  private readonly logger = new Logger(ParcelOfferDispatchService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly gateway: DeliveryGateway,
    private readonly continuityService: PartnerContinuityService,
    private readonly assignmentRepo: ParcelAssignmentRepository,
    private readonly eligibilityService: ParcelPartnerEligibilityService
  ) {}

  async requestDispatch(parcelId: string): Promise<any> {
    const parcelRes = await this.db.query(
      `SELECT p.*,
              ST_X(p.pickup_location::geometry) as pickup_lon,
              ST_Y(p.pickup_location::geometry) as pickup_lat,
              ST_X(p.drop_location::geometry) as dropoff_lon,
              ST_Y(p.drop_location::geometry) as dropoff_lat
       FROM parcels p WHERE p.id = $1;`,
      [parcelId]
    );

    if (parcelRes.rows.length === 0) {
      throw new NotFoundException(`Parcel ${parcelId} not found`);
    }

    const parcel = parcelRes.rows[0];

    const existingOffer = await this.assignmentRepo.findExistingActiveOffer(parcelId);
    if (existingOffer) {
      return {
        status: 'OFFER_DISPATCHED',
        parcelId,
        partnerId: existingOffer.partner_id,
        attemptId: existingOffer.id,
        offerExpiresAt: existingOffer.offer_expires_at.toISOString(),
      };
    }

    if (parcel.status === 'BOOKED' || parcel.status === 'PAYMENT_CONFIRMED') {
      await this.db.query(
        `UPDATE parcels SET status = 'SEARCHING_FOR_PARTNER', updated_at = NOW() WHERE id = $1;`,
        [parcelId]
      );
      await this.db.query(
        `INSERT INTO parcel_delivery_events (
           parcel_id, event_type, from_status, to_status, actor_role, reason
         ) VALUES ($1, 'SEARCHING_FOR_PARTNER', $2, 'SEARCHING_FOR_PARTNER', 'SYSTEM', 'Dispatch engine searching for eligible courier partners');`,
        [parcelId, parcel.status]
      );
    }

    const configRes = await this.db.query('SELECT * FROM dispatch_configurations LIMIT 1;');
    const config = configRes.rows[0] || { max_search_radius_meters: 6000, offer_timeout_seconds: 45, max_reassignment_attempts: 5 };

    let candidatePartnerIds: string[] = [];
    try {
      candidatePartnerIds = await this.redis.georadius(
        REDIS_ONLINE_PARTNERS_GEO_KEY,
        Number(parcel.pickup_lon),
        Number(parcel.pickup_lat),
        Number(config.max_search_radius_meters),
        25
      );
    } catch (err: any) {
      this.logger.warn(`Redis GEORADIUS error, falling back to PostGIS spatial: ${err.message}`);
    }

    if (candidatePartnerIds.length === 0) {
      candidatePartnerIds = await this.assignmentRepo.findSpatialCandidatePartnerIds(
        Number(parcel.pickup_lon),
        Number(parcel.pickup_lat),
        Number(config.max_search_radius_meters)
      );
    }

    const pastRejectedIds = await this.assignmentRepo.findPastRejectedPartnerIds(parcelId);
    const rejectedPartnerIds = new Set(pastRejectedIds);

    let selectedPartnerId: string | null = null;

    for (const pid of candidatePartnerIds) {
      if (rejectedPartnerIds.has(pid)) continue;

      const isActive = await this.assignmentRepo.isPartnerActiveOnParcel(pid);
      if (isActive) continue;

      const eligibility = await this.eligibilityService.checkPartnerEligibility(pid);
      if (!eligibility.isEligible) continue;

      selectedPartnerId = pid;
      break;
    }

    if (!selectedPartnerId) {
      const currentAttemptsCount = pastRejectedIds.length + 1;
      this.logger.warn(`No eligible partner found for parcel ${parcelId} (attempt #${currentAttemptsCount})`);
      return { status: 'NO_PARTNERS_AVAILABLE', parcelId, attempts: currentAttemptsCount };
    }

    const timeoutSec = Number(config.offer_timeout_seconds) || 45;
    const expiresAt = new Date(Date.now() + timeoutSec * 1000);

    const attempt = await this.assignmentRepo.createAttempt(parcelId, selectedPartnerId, expiresAt);

    const offerPayload = {
      attemptId: attempt.id,
      parcelId: parcel.id,
      parcelNumber: parcel.parcel_number,
      serviceType: parcel.service_type,
      packageCategory: parcel.package_category,
      weightKg: Number(parcel.estimated_weight_kg),
      pickupAddress: parcel.pickup_address,
      dropoffAddress: parcel.drop_address,
      totalPayoutInr: Number(parcel.partner_payout_inr),
      expiresAt: expiresAt.toISOString(),
      timeoutSeconds: timeoutSec,
    };

    try {
      this.gateway.server?.to(`partner:${selectedPartnerId}`).emit('parcel:offer', offerPayload);
    } catch (_) {}

    return {
      status: 'OFFER_DISPATCHED',
      parcelId,
      partnerId: selectedPartnerId,
      attemptId: attempt.id,
      offerExpiresAt: expiresAt.toISOString(),
    };
  }

  async acceptOffer(userId: string, attemptId: string): Promise<any> {
    const partner = await this.continuityService.getPartnerByUserId(userId);
    await this.continuityService.acquireVerticalLock(partner.id, 'PARCEL');

    let updatedParcel: any;
    try {
      updatedParcel = await this.db.transaction(async (client) => {
        const attempt = await this.assignmentRepo.findAttemptForUpdate(client, attemptId);
        if (!attempt) {
          throw new NotFoundException('Parcel offer attempt not found');
        }

        if (attempt.partner_id !== partner.id) {
          throw new ForbiddenException('Not authorized to accept this parcel offer');
        }

        if (attempt.status !== 'OFFERED') {
          throw new BadRequestException(`Offer is no longer active (status: ${attempt.status})`);
        }

        if (new Date() > new Date(attempt.offer_expires_at)) {
          await this.assignmentRepo.updateAttemptStatus(attemptId, 'EXPIRED', undefined, client);
          throw new BadRequestException('Parcel offer has expired');
        }
        const parcelRes = await client.query(`SELECT * FROM parcels WHERE id = $1 FOR UPDATE;`, [
          attempt.parcel_id,
        ]);
        const parcel = parcelRes.rows[0];
        if (parcel.partner_id && parcel.partner_id !== partner.id) {
          throw new BadRequestException('Parcel has already been assigned to another partner');
        }
        await this.assignmentRepo.updateAttemptStatus(attemptId, 'ACCEPTED', undefined, client);
        await this.assignmentRepo.cancelOtherOffers(attempt.parcel_id, attemptId, client);
        const updatedRes = await client.query(
          `UPDATE parcels SET partner_id = $1, status = 'PARTNER_ASSIGNED', updated_at = NOW() WHERE id = $2 RETURNING *;`,
          [partner.id, attempt.parcel_id]
        );
        await client.query(
          `INSERT INTO parcel_delivery_events (
             parcel_id, event_type, from_status, to_status, actor_id, actor_role, reason
           ) VALUES ($1, 'PARTNER_ASSIGNED', $2, 'PARTNER_ASSIGNED', $3, 'PARTNER', 'Courier partner accepted parcel delivery offer');`,
          [attempt.parcel_id, parcel.status, userId]
        );
        return updatedRes.rows[0];
      });
    } catch (err: any) {
      await this.continuityService.releaseVerticalLock(partner.id);
      throw err;
    }
    try {
      this.gateway.server?.to(`user:${updatedParcel.sender_id}`).emit('parcel:status_changed', {
        parcelId: updatedParcel.id,
        status: 'PARTNER_ASSIGNED',
        partnerId: partner.id,
      });
    } catch (_) {}
    return updatedParcel;
  }
  async rejectOffer(userId: string, attemptId: string, reason: string): Promise<any> {
    const partner = await this.continuityService.getPartnerByUserId(userId);
    const attempt = await this.assignmentRepo.findAttemptById(attemptId);
    if (!attempt) {
      throw new NotFoundException('Parcel offer not found');
    }
    if (attempt.partner_id !== partner.id) {
      throw new ForbiddenException('Not authorized to reject this offer');
    }
    await this.assignmentRepo.updateAttemptStatus(attemptId, 'REJECTED', reason || 'Rejected by partner');
    setImmediate(async () => {
      try {
        await this.requestDispatch(attempt.parcel_id);
      } catch (e: any) {
        this.logger.warn(`Background parcel redispatch failed: ${e.message}`);
      }
    });
    return { status: 'OFFER_REJECTED', attemptId, parcelId: attempt.parcel_id };
  }
  async getPartnerOffers(partnerUserId: string): Promise<any[]> {
    const partner = await this.continuityService.getPartnerByUserId(partnerUserId);
    const rows = await this.assignmentRepo.getPartnerOffers(partner.id);
    return rows.map((r: any) => ({
      attemptId: r.id,
      parcelId: r.parcel_id,
      parcelNumber: r.parcel_number,
      serviceType: r.service_type,
      packageCategory: r.package_category,
      weightKg: Number(r.estimated_weight_kg),
      pickupAddress: r.pickup_address,
      dropoffAddress: r.drop_address,
      totalPayoutInr: Number(r.partner_payout_inr),
      offerSentAt: r.offer_sent_at,
      offerExpiresAt: r.offer_expires_at,
    }));
  }
}