import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { DeliveryGateway } from './delivery.gateway.js';
import { DispatchEngineService } from './dispatch-engine.service.js';
import {
  CreateDeliveryJobDto,
  CompleteDeliveryDto,
  CancelDeliveryDto,
  ReportExceptionDto,
} from './dto/delivery.dto.js';
import { DeliveryJobRepository } from './data/delivery-job.repository.js';
import { DeliveryEventRepository } from './data/delivery-event.repository.js';
import { DeliveryProofRepository } from './data/delivery-proof.repository.js';
import { DeliveryExceptionRepository } from './data/delivery-exception.repository.js';
import { DispatchAttemptRepository } from './data/dispatch-attempt.repository.js';
import { DeliveryJobLifecycleService } from './delivery-job-lifecycle.service.js';
import { DeliveryHandoverService } from './delivery-handover.service.js';
import { DeliveryExceptionService } from './delivery-exception.service.js';
import { AdminDeliverySupervisionService } from './admin-delivery-supervision.service.js';

@Injectable()
export class DeliveryJobService {
  private readonly lifecycle: DeliveryJobLifecycleService;
  private readonly handover: DeliveryHandoverService;
  private readonly exception: DeliveryExceptionService;
  private readonly admin: AdminDeliverySupervisionService;

  constructor(
    private readonly db: DatabaseService,
    private readonly gateway: DeliveryGateway,
    private readonly dispatchEngine: DispatchEngineService,
    lifecycleService?: DeliveryJobLifecycleService,
    handoverService?: DeliveryHandoverService,
    exceptionService?: DeliveryExceptionService,
    adminService?: AdminDeliverySupervisionService
  ) {
    if (lifecycleService && handoverService && exceptionService && adminService) {
      this.lifecycle = lifecycleService;
      this.handover = handoverService;
      this.exception = exceptionService;
      this.admin = adminService;
    } else {
      const jobRepo = new DeliveryJobRepository(db);
      const eventRepo = new DeliveryEventRepository(db);
      const proofRepo = new DeliveryProofRepository(db);
      const exceptionRepo = new DeliveryExceptionRepository(db);
      const attemptRepo = new DispatchAttemptRepository(db);
      this.lifecycle =
        lifecycleService ?? new DeliveryJobLifecycleService(jobRepo, eventRepo, gateway, dispatchEngine);
      this.handover =
        handoverService ?? new DeliveryHandoverService(db, jobRepo, eventRepo, proofRepo, gateway);
      this.exception =
        exceptionService ?? new DeliveryExceptionService(db, jobRepo, eventRepo, exceptionRepo, gateway);
      this.admin =
        adminService ??
        new AdminDeliverySupervisionService(db, jobRepo, eventRepo, proofRepo, exceptionRepo, attemptRepo);
    }
  }

  async createDeliveryJob(dto: CreateDeliveryJobDto): Promise<any> {
    return this.lifecycle.createDeliveryJob(dto);
  }

  async merchantAcceptJob(userId: string, jobId: string): Promise<any> {
    return this.lifecycle.merchantAcceptJob(userId, jobId);
  }

  async merchantStartPreparing(userId: string, jobId: string): Promise<any> {
    return this.lifecycle.merchantStartPreparing(userId, jobId);
  }

  async merchantMarkReadyForPickup(userId: string, jobId: string): Promise<any> {
    return this.lifecycle.merchantMarkReadyForPickup(userId, jobId);
  }

  async merchantVerifyHandover(
    userId: string,
    jobId: string,
    otpInput: string | { handoverOtp: string }
  ): Promise<any> {
    return this.handover.merchantVerifyHandover(userId, jobId, otpInput);
  }

  async partnerArrivedAtPickup(partnerUserId: string, jobId: string): Promise<any> {
    return this.lifecycle.partnerArrivedAtPickup(partnerUserId, jobId);
  }

  async partnerStartDelivery(partnerUserId: string, jobId: string): Promise<any> {
    return this.lifecycle.partnerStartDelivery(partnerUserId, jobId);
  }

  async partnerArrivedAtDestination(partnerUserId: string, jobId: string): Promise<any> {
    return this.lifecycle.partnerArrivedAtDestination(partnerUserId, jobId);
  }

  async partnerCompleteDelivery(partnerUserId: string, jobId: string, dto: CompleteDeliveryDto): Promise<any> {
    return this.handover.partnerCompleteDelivery(partnerUserId, jobId, dto);
  }

  async cancelDeliveryJob(
    userId: string,
    userRole: string,
    jobId: string,
    dto: CancelDeliveryDto
  ): Promise<any> {
    return this.exception.cancelDeliveryJob(userId, userRole, jobId, dto);
  }

  async reportException(
    userId: string,
    userRole: string,
    jobId: string,
    dto: ReportExceptionDto
  ): Promise<any> {
    return this.exception.reportException(userId, userRole, jobId, dto);
  }

  async getJobTrackingDetails(userId: string, userRole: string, jobId: string): Promise<any> {
    return this.admin.getJobTrackingDetails(userId, userRole, jobId);
  }

  async listAdminJobs(filters: {
    status?: string;
    verticalType?: string;
    outletId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: any[]; total: number }> {
    return this.admin.listAdminJobs(filters);
  }

  async getAdminJobDetails(jobId: string): Promise<any> {
    return this.admin.getAdminJobDetails(jobId);
  }

  async listOnlinePartners(): Promise<any[]> {
    return this.admin.listOnlinePartners();
  }

  async listExceptions(status?: string): Promise<any[]> {
    return this.exception.listExceptions(status);
  }

  async getDispatchStats(): Promise<any> {
    return this.admin.getDispatchStats();
  }
}
