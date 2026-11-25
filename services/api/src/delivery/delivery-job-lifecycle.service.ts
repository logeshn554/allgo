import crypto from 'node:crypto';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DeliveryEventRepository } from './data/delivery-event.repository.js';
import { DeliveryJobRepository } from './data/delivery-job.repository.js';
import { DeliveryGateway } from './delivery.gateway.js';
import { DispatchEngineService } from './dispatch-engine.service.js';
import { CreateDeliveryJobDto } from './dto/delivery.dto.js';

@Injectable()
export class DeliveryJobLifecycleService {
  private readonly logger = new Logger(DeliveryJobLifecycleService.name);

  constructor(
    private readonly jobRepo: DeliveryJobRepository,
    private readonly eventRepo: DeliveryEventRepository,
    private readonly gateway: DeliveryGateway,
    private readonly dispatchEngine: DispatchEngineService,
  ) {}

  private generateSecureCode(): string {
    return crypto.randomInt(1000, 10000).toString();
  }

  async createDeliveryJob(dto: CreateDeliveryJobDto): Promise<any> {
    const outlet = await this.jobRepo.findOutletById(dto.outletId);
    if (!outlet) {
      throw new NotFoundException(`Outlet ${dto.outletId} not found`);
    }

    const jobNumber = `DEL-${Date.now().toString(36).toUpperCase()}-${crypto.randomInt(100, 999)}`;
    const handoverOtp = this.generateSecureCode();
    const deliveryPin = this.generateSecureCode();

    const job = await this.jobRepo.createJob({
      jobNumber,
      verticalType: dto.verticalType || 'FOOD',
      outletId: dto.outletId,
      customerId: dto.customerId || null,
      customerName: dto.customerName || 'Customer',
      pickupLon: dto.pickupLocation.longitude,
      pickupLat: dto.pickupLocation.latitude,
      pickupAddress: dto.pickupAddress,
      pickupContactPhone: dto.pickupContactPhone,
      dropoffLon: dto.dropoffLocation.longitude,
      dropoffLat: dto.dropoffLocation.latitude,
      dropoffAddress: dto.dropoffAddress,
      dropoffContactPhone: dto.dropoffContactPhone,
      itemsSnapshot: JSON.stringify(dto.itemsSnapshot || []),
      estimatedPrepTimeMinutes: dto.estimatedPrepTimeMinutes || 15,
      handoverOtp,
      deliveryPin,
      courierFee: dto.courierFeeInr ?? 40.0,
      surgeFee: dto.surgeFeeInr ?? 0.0,
    });

    await this.eventRepo.recordEvent({
      deliveryJobId: job.id,
      toStatus: 'CREATED',
      actorRole: 'SYSTEM',
      reason: 'Delivery job intake initialized',
    });

    return job;
  }

  async merchantAcceptJob(userId: string, jobId: string): Promise<any> {
    const job = await this.jobRepo.verifyMerchantJobAccess(userId, jobId);
    if (job.status !== 'CREATED') {
      throw new BadRequestException(`Cannot accept job in status: ${job.status}`);
    }

    const updated = await this.jobRepo.updateJobStatus(jobId, 'MERCHANT_ACCEPTED');

    await this.eventRepo.recordEvent({
      deliveryJobId: jobId,
      fromStatus: 'CREATED',
      toStatus: 'MERCHANT_ACCEPTED',
      actorId: userId,
      actorRole: 'MERCHANT',
      reason: 'Merchant confirmed order readiness',
    });

    this.gateway.emitJobStatusChanged(jobId, 'MERCHANT_ACCEPTED', { jobId });
    return updated;
  }

  async merchantStartPreparing(userId: string, jobId: string): Promise<any> {
    const job = await this.jobRepo.verifyMerchantJobAccess(userId, jobId);
    if (job.status !== 'MERCHANT_ACCEPTED') {
      throw new BadRequestException(`Cannot start preparing job in status: ${job.status}`);
    }

    const updated = await this.jobRepo.updateJobStatus(jobId, 'PREPARING');

    await this.eventRepo.recordEvent({
      deliveryJobId: jobId,
      fromStatus: 'MERCHANT_ACCEPTED',
      toStatus: 'PREPARING',
      actorId: userId,
      actorRole: 'MERCHANT',
      reason: 'Food preparation started in kitchen',
    });

    this.gateway.emitJobStatusChanged(jobId, 'PREPARING', { jobId });
    return updated;
  }

  async merchantMarkReadyForPickup(userId: string, jobId: string): Promise<any> {
    const job = await this.jobRepo.verifyMerchantJobAccess(userId, jobId);
    if (job.status !== 'PREPARING' && job.status !== 'MERCHANT_ACCEPTED') {
      throw new BadRequestException(`Cannot mark ready for pickup from status: ${job.status}`);
    }

    const updated = await this.jobRepo.updateJobStatus(jobId, 'READY_FOR_PICKUP');

    await this.eventRepo.recordEvent({
      deliveryJobId: jobId,
      fromStatus: job.status,
      toStatus: 'READY_FOR_PICKUP',
      actorId: userId,
      actorRole: 'MERCHANT',
      reason: 'Packed and awaiting courier pickup',
    });

    this.gateway.emitJobStatusChanged(jobId, 'READY_FOR_PICKUP', { jobId });

    this.dispatchEngine.requestDispatch(jobId).catch((err) => {
      this.logger.error(`Dispatch request failed on ready: ${err.message}`);
    });

    return updated;
  }

  async partnerArrivedAtPickup(partnerUserId: string, jobId: string): Promise<any> {
    const { partner, job } = await this.jobRepo.verifyPartnerJobAccess(partnerUserId, jobId);
    if (job.status !== 'PARTNER_ASSIGNED' && job.status !== 'READY_FOR_PICKUP') {
      throw new BadRequestException(`Cannot mark arrived from status: ${job.status}`);
    }

    const updated = await this.jobRepo.updateJobStatus(jobId, 'PARTNER_ARRIVED');

    await this.eventRepo.recordEvent({
      deliveryJobId: jobId,
      fromStatus: job.status,
      toStatus: 'PARTNER_ARRIVED',
      actorId: partnerUserId,
      actorRole: 'PARTNER',
      reason: 'Partner arrived at outlet pickup location',
    });

    this.gateway.emitJobStatusChanged(jobId, 'PARTNER_ARRIVED', { jobId, partnerId: partner.id });
    return updated;
  }

  async partnerStartDelivery(partnerUserId: string, jobId: string): Promise<any> {
    const { partner, job } = await this.jobRepo.verifyPartnerJobAccess(partnerUserId, jobId);
    if (job.status !== 'PICKED_UP') {
      throw new BadRequestException(
        `Cannot start delivery in transit before pickup verification (status: ${job.status})`,
      );
    }

    const updated = await this.jobRepo.updateJobStatus(jobId, 'IN_TRANSIT');

    await this.eventRepo.recordEvent({
      deliveryJobId: jobId,
      fromStatus: 'PICKED_UP',
      toStatus: 'IN_TRANSIT',
      actorId: partnerUserId,
      actorRole: 'PARTNER',
      reason: 'Partner departed with order towards customer dropoff',
    });

    this.gateway.emitJobStatusChanged(jobId, 'IN_TRANSIT', { jobId, partnerId: partner.id });
    return updated;
  }

  async partnerArrivedAtDestination(partnerUserId: string, jobId: string): Promise<any> {
    const { partner, job } = await this.jobRepo.verifyPartnerJobAccess(partnerUserId, jobId);
    if (job.status !== 'IN_TRANSIT' && job.status !== 'PICKED_UP') {
      throw new BadRequestException(`Cannot mark arrived at destination in status: ${job.status}`);
    }

    const updated = await this.jobRepo.updateJobStatus(jobId, 'ARRIVED_AT_DESTINATION');

    await this.eventRepo.recordEvent({
      deliveryJobId: jobId,
      fromStatus: job.status,
      toStatus: 'ARRIVED_AT_DESTINATION',
      actorId: partnerUserId,
      actorRole: 'PARTNER',
      reason: 'Partner arrived at customer delivery location',
    });

    this.gateway.emitJobStatusChanged(jobId, 'ARRIVED_AT_DESTINATION', {
      jobId,
      partnerId: partner.id,
    });
    return updated;
  }
}
