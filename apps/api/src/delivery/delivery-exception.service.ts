import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { DeliveryJobRepository } from './data/delivery-job.repository.js';
import { DeliveryEventRepository } from './data/delivery-event.repository.js';
import { DeliveryExceptionRepository } from './data/delivery-exception.repository.js';
import { DeliveryGateway } from './delivery.gateway.js';
import { CancelDeliveryDto, ReportExceptionDto } from './dto/delivery.dto.js';

@Injectable()
export class DeliveryExceptionService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jobRepo: DeliveryJobRepository,
    private readonly eventRepo: DeliveryEventRepository,
    private readonly exceptionRepo: DeliveryExceptionRepository,
    private readonly gateway: DeliveryGateway
  ) {}

  async cancelDeliveryJob(
    userId: string,
    userRole: string,
    jobId: string,
    dto: CancelDeliveryDto
  ): Promise<any> {
    const job = await this.jobRepo.findById(jobId);
    if (!job) throw new NotFoundException('Delivery job not found');

    if (job.status === 'DELIVERED' || job.status === 'CANCELLED') {
      throw new BadRequestException(`Cannot cancel job in terminal status: ${job.status}`);
    }

    const updated = await this.jobRepo.updateJobCancelled(
      jobId,
      dto.reasonDetails || dto.reasonCode,
      userId
    );

    await this.exceptionRepo.recordCancellation(
      jobId,
      userId,
      userRole,
      dto.reasonCode,
      dto.reasonDetails || null,
      job.status
    );

    if (job.assigned_partner_id) {
      await this.db.query(
        `UPDATE partner_availability_sessions SET status = 'ONLINE' WHERE partner_id = $1 AND status = 'BUSY';`,
        [job.assigned_partner_id]
      );
    }

    await this.eventRepo.recordEvent({
      deliveryJobId: jobId,
      fromStatus: job.status,
      toStatus: 'CANCELLED',
      actorId: userId,
      actorRole: userRole,
      reason: dto.reasonDetails || dto.reasonCode,
    });

    this.gateway.emitJobStatusChanged(jobId, 'CANCELLED', { jobId, reason: dto.reasonCode });
    return updated;
  }

  async reportException(
    userId: string,
    userRole: string,
    jobId: string,
    dto: ReportExceptionDto
  ): Promise<any> {
    let partnerId: string | null = null;
    if (userRole === 'PARTNER') {
      const pRes = await this.db.query('SELECT id FROM partners WHERE user_id = $1;', [userId]);
      if (pRes.rows.length > 0) partnerId = pRes.rows[0].id;
    }

    const exception = await this.exceptionRepo.recordException(
      jobId,
      partnerId,
      dto.exceptionType,
      dto.details
    );

    this.gateway.emitDispatchException(jobId, {
      jobId,
      exceptionId: exception.id,
      exceptionType: dto.exceptionType,
      details: dto.details,
    });

    return exception;
  }

  async listExceptions(status?: string): Promise<any[]> {
    return this.exceptionRepo.listExceptions(status);
  }
}
