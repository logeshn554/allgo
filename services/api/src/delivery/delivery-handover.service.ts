import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { DeliveryEventRepository } from './data/delivery-event.repository.js';
import { DeliveryJobRepository } from './data/delivery-job.repository.js';
import { DeliveryProofRepository } from './data/delivery-proof.repository.js';
import { DeliveryGateway } from './delivery.gateway.js';
import { CompleteDeliveryDto } from './dto/delivery.dto.js';

@Injectable()
export class DeliveryHandoverService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jobRepo: DeliveryJobRepository,
    private readonly eventRepo: DeliveryEventRepository,
    private readonly proofRepo: DeliveryProofRepository,
    private readonly gateway: DeliveryGateway,
  ) {}

  async merchantVerifyHandover(
    userId: string,
    jobId: string,
    otpInput: string | { handoverOtp: string },
  ): Promise<any> {
    const job = await this.jobRepo.verifyMerchantJobAccess(userId, jobId);

    if (job.status !== 'PARTNER_ARRIVED' && job.status !== 'PARTNER_ASSIGNED') {
      throw new BadRequestException(
        `Cannot verify handover in status: ${job.status}. Partner must arrive first.`,
      );
    }

    const otp = typeof otpInput === 'string' ? otpInput : otpInput?.handoverOtp;
    if (!otp || job.handover_otp !== otp.trim()) {
      throw new BadRequestException('Invalid handover OTP provided');
    }

    const updated = await this.jobRepo.updateJobPickedUp(jobId);

    await this.eventRepo.recordEvent({
      deliveryJobId: jobId,
      fromStatus: job.status,
      toStatus: 'PICKED_UP',
      actorId: userId,
      actorRole: 'MERCHANT',
      reason: 'Physical handover verified via OTP',
    });

    this.gateway.emitJobStatusChanged(jobId, 'PICKED_UP', { jobId });
    return updated;
  }

  async partnerCompleteDelivery(
    partnerUserId: string,
    jobId: string,
    dto: CompleteDeliveryDto,
  ): Promise<any> {
    const { partner, job } = await this.jobRepo.verifyPartnerJobAccess(partnerUserId, jobId);

    if (job.status !== 'IN_TRANSIT' && job.status !== 'ARRIVED_AT_DESTINATION') {
      throw new BadRequestException(`Cannot complete delivery from status: ${job.status}`);
    }

    if (dto.deliveryPin) {
      if (dto.deliveryPin.trim() !== job.delivery_pin) {
        throw new BadRequestException('Invalid delivery PIN provided');
      }
    }

    const updated = await this.jobRepo.updateJobDelivered(jobId);

    await this.proofRepo.insertProof(
      jobId,
      dto.proofType || 'PIN',
      dto.deliveryPin || null,
      dto.photoStorageKey || null,
      partner.id,
    );

    const baseAmount = Number(job.courier_fee_inr);
    const surgeAmount = Number(job.surge_fee_inr);
    const totalEarned = baseAmount + surgeAmount;

    await this.proofRepo.insertPartnerEarnings(
      partner.id,
      jobId,
      'DELIVERY_PAY',
      baseAmount,
      surgeAmount,
      totalEarned,
      'Completed standard food/grocery delivery job',
    );

    await this.db.query(
      `UPDATE partner_availability_sessions SET status = 'ONLINE' WHERE partner_id = $1 AND status = 'BUSY';`,
      [partner.id],
    );

    await this.eventRepo.recordEvent({
      deliveryJobId: jobId,
      fromStatus: job.status,
      toStatus: 'DELIVERED',
      actorId: partnerUserId,
      actorRole: 'PARTNER',
      reason: 'Delivery completed successfully with proof verification',
    });

    this.gateway.emitJobStatusChanged(jobId, 'DELIVERED', {
      jobId,
      partnerId: partner.id,
      totalEarnedInr: totalEarned,
      completedAt: new Date().toISOString(),
    });

    return {
      ...updated,
      partnerEarningsInr: totalEarned,
    };
  }
}
