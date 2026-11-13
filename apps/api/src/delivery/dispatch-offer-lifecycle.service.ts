import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { DeliveryGateway } from './delivery.gateway.js';
import { PartnerAvailabilityService } from './partner-availability.service.js';
import { DispatchAttemptRepository } from './data/dispatch-attempt.repository.js';
import { DispatchCandidateMatcherService } from './dispatch-candidate-matcher.service.js';

@Injectable()
export class DispatchOfferLifecycleService {
  private readonly logger = new Logger(DispatchOfferLifecycleService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly gateway: DeliveryGateway,
    private readonly partnerAvailabilityService: PartnerAvailabilityService,
    private readonly attemptRepo: DispatchAttemptRepository,
    private readonly matcher: DispatchCandidateMatcherService
  ) {}

  async requestDispatch(jobId: string): Promise<any> {
    const jobRes = await this.db.query(
      `SELECT id, job_number, status, vertical_type, pickup_address, dropoff_address,
              customer_name, courier_fee_inr, surge_fee_inr, items_snapshot,
              ST_X(pickup_location::geometry) as pickup_lon,
              ST_Y(pickup_location::geometry) as pickup_lat,
              ST_X(dropoff_location::geometry) as dropoff_lon,
              ST_Y(dropoff_location::geometry) as dropoff_lat
       FROM delivery_jobs WHERE id = $1;`,
      [jobId]
    );

    if (jobRes.rows.length === 0) {
      throw new NotFoundException(`Delivery job ${jobId} not found`);
    }

    const job = jobRes.rows[0];

    if (job.status === 'READY_FOR_PICKUP' || job.status === 'DISPATCH_PENDING') {
      await this.db.query(
        `UPDATE delivery_jobs SET status = 'ASSIGNMENT_PENDING', updated_at = NOW() WHERE id = $1;`,
        [jobId]
      );
      await this.db.query(
        `INSERT INTO delivery_status_events (delivery_job_id, from_status, to_status, actor_role, reason)
         VALUES ($1, $2, 'ASSIGNMENT_PENDING', 'SYSTEM', 'Dispatch engine searching for eligible partners');`,
        [jobId, job.status]
      );
      this.gateway.emitJobStatusChanged(jobId, 'ASSIGNMENT_PENDING', { jobId });
    }

    const config = await this.attemptRepo.getConfig();
    const { selectedPartnerId, attemptsCount } = await this.matcher.findEligibleCandidate(
      jobId,
      Number(job.pickup_lon),
      Number(job.pickup_lat),
      config
    );

    if (!selectedPartnerId) {
      if (attemptsCount >= Number(config.max_reassignment_attempts)) {
        await this.attemptRepo.recordException(
          jobId,
          'NO_PARTNER_FOUND',
          'Max dispatch reassignment attempts reached with no accepting partner'
        );
        this.gateway.emitDispatchException(jobId, {
          jobId,
          type: 'NO_PARTNER_FOUND',
          message: 'No delivery partner available in service area',
        });
      }
      return { status: 'NO_PARTNERS_AVAILABLE', jobId, attempts: attemptsCount };
    }

    const timeoutSec = Number(config.offer_timeout_seconds) || 45;
    const expiresAt = new Date(Date.now() + timeoutSec * 1000);

    const attempt = await this.attemptRepo.createAttempt(jobId, selectedPartnerId, expiresAt);

    const offerPayload = {
      attemptId: attempt.id,
      jobId: job.id,
      jobNumber: job.job_number,
      verticalType: job.vertical_type,
      pickupAddress: job.pickup_address,
      dropoffAddress: job.dropoff_address,
      courierFeeInr: Number(job.courier_fee_inr),
      surgeFeeInr: Number(job.surge_fee_inr),
      totalPayoutInr: Number(job.courier_fee_inr) + Number(job.surge_fee_inr),
      expiresAt: expiresAt.toISOString(),
      timeoutSeconds: timeoutSec,
    };

    this.gateway.emitJobOffer(selectedPartnerId, offerPayload);

    return {
      status: 'OFFER_DISPATCHED',
      jobId,
      partnerId: selectedPartnerId,
      attemptId: attempt.id,
      offerExpiresAt: expiresAt.toISOString(),
    };
  }

  async acceptOffer(userId: string, attemptId: string): Promise<any> {
    const partner = await this.partnerAvailabilityService.getPartnerByUserId(userId);

    const attempt = await this.attemptRepo.findAttemptById(attemptId, partner.id);
    if (!attempt) throw new NotFoundException('Job offer attempt not found');

    if (attempt.status !== 'OFFERED') {
      throw new BadRequestException(`Offer is no longer available (current status: ${attempt.status})`);
    }

    if (new Date(attempt.offer_expires_at).getTime() < Date.now()) {
      await this.attemptRepo.updateAttemptStatus(attemptId, 'EXPIRED');
      throw new BadRequestException('Job offer has expired');
    }

    const assignRes = await this.db.query(
      `UPDATE delivery_jobs
       SET assigned_partner_id = $1, status = 'PARTNER_ASSIGNED', updated_at = NOW()
       WHERE id = $2 AND assigned_partner_id IS NULL RETURNING *;`,
      [partner.id, attempt.delivery_job_id]
    );

    if (assignRes.rows.length === 0) {
      await this.attemptRepo.updateAttemptStatus(attemptId, 'CANCELLED');
      throw new BadRequestException('Delivery job was already assigned to another partner');
    }

    const job = assignRes.rows[0];

    await this.attemptRepo.updateAttemptStatus(attemptId, 'ACCEPTED');
    await this.attemptRepo.cancelOtherOffers(job.id, attemptId);
    await this.attemptRepo.updatePartnerSessionBusy(partner.id);

    await this.db.query(
      `INSERT INTO delivery_status_events (delivery_job_id, from_status, to_status, actor_id, actor_role, reason)
       VALUES ($1, 'ASSIGNMENT_PENDING', 'PARTNER_ASSIGNED', $2, 'PARTNER', 'Partner accepted job offer');`,
      [job.id, userId]
    );

    this.gateway.emitJobStatusChanged(job.id, 'PARTNER_ASSIGNED', {
      jobId: job.id,
      partnerId: partner.id,
      partnerName: partner.full_name || 'Delivery Partner',
      partnerPhone: partner.phone,
    });

    return {
      success: true,
      jobId: job.id,
      status: 'PARTNER_ASSIGNED',
      assignedPartnerId: partner.id,
    };
  }

  async rejectOffer(userId: string, attemptId: string, reason?: string): Promise<any> {
    const partner = await this.partnerAvailabilityService.getPartnerByUserId(userId);
    const attempt = await this.attemptRepo.findAttemptById(attemptId, partner.id);
    if (!attempt) throw new NotFoundException('Job offer attempt not found');

    if (attempt.status === 'OFFERED') {
      await this.attemptRepo.updateAttemptStatus(attemptId, 'REJECTED', reason || 'Declined by partner');
    }

    this.requestDispatch(attempt.delivery_job_id).catch((err) => {
      this.logger.error(`Re-dispatch error after partner rejection: ${err.message}`);
    });

    return { success: true, message: 'Offer rejected' };
  }
}
