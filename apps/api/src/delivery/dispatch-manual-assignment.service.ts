import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { DeliveryGateway } from './delivery.gateway.js';
import { PartnerAvailabilityService } from './partner-availability.service.js';
import { DispatchAttemptRepository } from './data/dispatch-attempt.repository.js';

@Injectable()
export class DispatchManualAssignmentService {
  constructor(
    private readonly db: DatabaseService,
    private readonly gateway: DeliveryGateway,
    private readonly partnerAvailabilityService: PartnerAvailabilityService,
    private readonly attemptRepo: DispatchAttemptRepository
  ) {}

  async manualAssign(adminId: string, jobId: string, partnerId: string, reason?: string): Promise<any> {
    const eligibility = await this.partnerAvailabilityService.checkEligibility(partnerId);
    if (!eligibility.isEligible) {
      throw new BadRequestException(`Cannot assign: ${eligibility.reason}`);
    }

    const jobCheck = await this.db.query('SELECT status FROM delivery_jobs WHERE id = $1;', [jobId]);
    if (jobCheck.rows.length === 0) throw new NotFoundException('Delivery job not found');
    const fromStatus = jobCheck.rows[0].status;

    const res = await this.db.query(
      `UPDATE delivery_jobs
       SET assigned_partner_id = $1, status = 'PARTNER_ASSIGNED', updated_at = NOW()
       WHERE id = $2 RETURNING *;`,
      [partnerId, jobId]
    );

    await this.attemptRepo.cancelOtherOffers(jobId);

    await this.db.query(
      `INSERT INTO delivery_status_events (delivery_job_id, from_status, to_status, actor_id, actor_role, reason)
       VALUES ($1, $2, 'PARTNER_ASSIGNED', $3, 'ADMIN', $4);`,
      [jobId, fromStatus, adminId, reason || 'Manual dispatch assignment by administrator']
    );

    this.gateway.emitJobStatusChanged(jobId, 'PARTNER_ASSIGNED', {
      jobId,
      partnerId,
      manualAssign: true,
    });

    return res.rows[0];
  }
}
