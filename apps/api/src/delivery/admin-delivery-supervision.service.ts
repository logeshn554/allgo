import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { DeliveryJobRepository } from './data/delivery-job.repository.js';
import { DeliveryEventRepository } from './data/delivery-event.repository.js';
import { DeliveryProofRepository } from './data/delivery-proof.repository.js';
import { DeliveryExceptionRepository } from './data/delivery-exception.repository.js';
import { DispatchAttemptRepository } from './data/dispatch-attempt.repository.js';

@Injectable()
export class AdminDeliverySupervisionService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jobRepo: DeliveryJobRepository,
    private readonly eventRepo: DeliveryEventRepository,
    private readonly proofRepo: DeliveryProofRepository,
    private readonly exceptionRepo: DeliveryExceptionRepository,
    private readonly attemptRepo: DispatchAttemptRepository
  ) {}

  async getJobTrackingDetails(_userId: string, userRole: string, jobId: string): Promise<any> {
    const j = await this.jobRepo.getJobWithDetails(jobId);
    if (!j) throw new NotFoundException('Delivery job not found');

    let partnerLiveLocation: any = null;
    if (j.assigned_partner_id) {
      partnerLiveLocation = await this.jobRepo.getPartnerLatestLiveLocation(j.assigned_partner_id);
    }

    const isCustomer = userRole === 'CUSTOMER';
    const isPartner = userRole === 'PARTNER';

    return {
      id: j.id,
      jobNumber: j.job_number,
      verticalType: j.vertical_type,
      status: j.status,
      outletName: j.outlet_name,
      pickupAddress: j.pickup_address,
      pickupLocation: { latitude: Number(j.pickup_lat), longitude: Number(j.pickup_lon) },
      dropoffAddress: j.dropoff_address,
      dropoffLocation: { latitude: Number(j.dropoff_lat), longitude: Number(j.dropoff_lon) },
      handoverOtp: isCustomer ? null : j.handover_otp,
      deliveryPin: isPartner ? null : j.delivery_pin,
      customerName: isPartner ? j.customer_name : undefined,
      assignedPartner: j.assigned_partner_id
        ? {
            id: j.assigned_partner_id,
            name: j.partner_name || 'Delivery Partner',
            phone: isCustomer ? j.partner_phone : undefined,
            liveLocation: partnerLiveLocation,
          }
        : null,
      courierFeeInr: Number(j.courier_fee_inr),
      estimatedPrepTimeMinutes: j.estimated_prep_time_minutes,
      createdAt: j.created_at,
      completedAt: j.completed_at,
    };
  }

  async listAdminJobs(filters: {
    status?: string;
    verticalType?: string;
    outletId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: any[]; total: number }> {
    return this.jobRepo.listAdminJobs(filters);
  }

  async getAdminJobDetails(jobId: string): Promise<any> {
    const job = await this.jobRepo.getJobWithDetails(jobId);
    if (!job) throw new NotFoundException('Delivery job not found');

    const events = await this.eventRepo.listEventsByJobId(jobId);
    const dispatch_attempts = await this.attemptRepo.listAttemptsByJobId(jobId);
    const proofs = await this.proofRepo.listProofsByJobId(jobId);
    const exceptions = await this.exceptionRepo.listExceptionsByJobId(jobId);
    const cancellation = await this.exceptionRepo.getCancellationByJobId(jobId);

    return {
      ...job,
      pickup_location: { latitude: Number(job.pickup_lat), longitude: Number(job.pickup_lon) },
      dropoff_location: { latitude: Number(job.dropoff_lat), longitude: Number(job.dropoff_lon) },
      events,
      dispatch_attempts,
      proofs,
      exceptions,
      cancellation,
    };
  }

  async listOnlinePartners(): Promise<any[]> {
    const res = await this.db.query(
      `SELECT p.id, u.full_name, u.phone, p.status as account_status,
              s.status as session_status, s.last_heartbeat_at,
              ST_X(s.last_known_location::geometry) as current_lon,
              ST_Y(s.last_known_location::geometry) as current_lat
       FROM partner_availability_sessions s
       JOIN partners p ON p.id = s.partner_id
       JOIN users u ON u.id = p.user_id
       WHERE s.ended_at IS NULL AND s.last_heartbeat_at >= NOW() - INTERVAL '3 minutes'
       ORDER BY s.last_heartbeat_at DESC;`
    );
    return res.rows.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      phone: row.phone,
      accountStatus: row.account_status,
      sessionStatus: row.session_status,
      lastHeartbeatAt: row.last_heartbeat_at,
      currentLocation:
        row.current_lat && row.current_lon
          ? {
              latitude: Number(row.current_lat),
              longitude: Number(row.current_lon),
            }
          : null,
    }));
  }

  async getDispatchStats(): Promise<any> {
    return this.jobRepo.getDispatchStats();
  }
}
