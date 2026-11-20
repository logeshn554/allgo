import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

@Injectable()
export class DeliveryJobRepository {
  constructor(private readonly db: DatabaseService) {}

  async findOutletById(outletId: string): Promise<any | null> {
    const res = await this.db.query(
      `SELECT o.id, o.outlet_name, o.outlet_status, m.id as merchant_id, m.status as merchant_status
       FROM outlets o
       JOIN merchants m ON m.id = o.merchant_id
       WHERE o.id = $1;`,
      [outletId]
    );
    return res.rows[0] ?? null;
  }

  async createJob(data: any): Promise<any> {
    const res = await this.db.query(
      `INSERT INTO delivery_jobs (
         job_number, vertical_type, status, outlet_id, customer_id, customer_name,
         pickup_location, pickup_address, pickup_contact_phone,
         dropoff_location, dropoff_address, dropoff_contact_phone,
         items_snapshot, estimated_prep_time_minutes, handover_otp, delivery_pin,
         courier_fee_inr, surge_fee_inr
       ) VALUES (
         $1, $2, 'CREATED', $3, $4, $5,
         ST_SetSRID(ST_MakePoint($6, $7), 4326), $8, $9,
         ST_SetSRID(ST_MakePoint($10, $11), 4326), $12, $13,
         $14, $15, $16, $17, $18, $19
       ) RETURNING *;`,
      [
        data.jobNumber, data.verticalType, data.outletId, data.customerId, data.customerName,
        data.pickupLon, data.pickupLat, data.pickupAddress, data.pickupContactPhone,
        data.dropoffLon, data.dropoffLat, data.dropoffAddress, data.dropoffContactPhone,
        data.itemsSnapshot, data.estimatedPrepTimeMinutes, data.handoverOtp, data.deliveryPin,
        data.courierFee, data.surgeFee,
      ]
    );
    return res.rows[0];
  }

  async findById(jobId: string): Promise<any | null> {
    const res = await this.db.query('SELECT * FROM delivery_jobs WHERE id = $1;', [jobId]);
    return res.rows[0] ?? null;
  }

  async updateJobStatus(jobId: string, status: string): Promise<any> {
    const res = await this.db.query(
      `UPDATE delivery_jobs SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *;`,
      [status, jobId]
    );
    return res.rows[0];
  }

  async updateJobPickedUp(jobId: string): Promise<any> {
    const res = await this.db.query(
      `UPDATE delivery_jobs
       SET status = 'PICKED_UP', handover_verified_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *;`,
      [jobId]
    );
    return res.rows[0];
  }

  async updateJobDelivered(jobId: string): Promise<any> {
    const res = await this.db.query(
      `UPDATE delivery_jobs
       SET status = 'DELIVERED', delivery_verified_at = NOW(), completed_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *;`,
      [jobId]
    );
    return res.rows[0];
  }

  async updateJobCancelled(jobId: string, reason: string, userId: string): Promise<any> {
    const res = await this.db.query(
      `UPDATE delivery_jobs
       SET status = 'CANCELLED', cancellation_reason = $1, cancelled_by_user_id = $2,
           cancelled_at = NOW(), updated_at = NOW()
       WHERE id = $3 RETURNING *;`,
      [reason, userId, jobId]
    );
    return res.rows[0];
  }

  async verifyMerchantJobAccess(userId: string, jobId: string): Promise<any> {
    const res = await this.db.query(
      `SELECT j.*, m.owner_id
       FROM delivery_jobs j
       JOIN outlets o ON o.id = j.outlet_id
       JOIN merchants m ON m.id = o.merchant_id
       WHERE j.id = $1;`,
      [jobId]
    );
    if (res.rows.length === 0) throw new NotFoundException('Delivery job not found');
    if (res.rows[0].owner_id !== userId) {
      throw new ForbiddenException('You do not own the merchant outlet for this delivery job');
    }
    return res.rows[0];
  }

  async verifyPartnerJobAccess(userId: string, jobId: string): Promise<{ partner: any; job: any }> {
    const pRes = await this.db.query('SELECT * FROM partners WHERE user_id = $1;', [userId]);
    if (pRes.rows.length === 0) throw new ForbiddenException('Partner profile not found');
    const partner = pRes.rows[0];

    const jRes = await this.db.query('SELECT * FROM delivery_jobs WHERE id = $1;', [jobId]);
    if (jRes.rows.length === 0) throw new NotFoundException('Delivery job not found');
    const job = jRes.rows[0];

    if (job.assigned_partner_id !== partner.id) {
      throw new ForbiddenException('You are not the assigned partner for this delivery job');
    }

    return { partner, job };
  }

  async getJobWithDetails(jobId: string): Promise<any | null> {
    const res = await this.db.query(
      `SELECT j.*, o.outlet_name, o.address_line1 as outlet_address,
              up.full_name as partner_name, up.phone as partner_phone,
              ST_X(j.pickup_location::geometry) as pickup_lon,
              ST_Y(j.pickup_location::geometry) as pickup_lat,
              ST_X(j.dropoff_location::geometry) as dropoff_lon,
              ST_Y(j.dropoff_location::geometry) as dropoff_lat
       FROM delivery_jobs j
       JOIN outlets o ON o.id = j.outlet_id
       LEFT JOIN partners p ON p.id = j.assigned_partner_id
       LEFT JOIN users up ON up.id = p.user_id
       WHERE j.id = $1;`,
      [jobId]
    );
    return res.rows[0] ?? null;
  }

  async getPartnerLatestLiveLocation(partnerId: string): Promise<any | null> {
    const res = await this.db.query(
      `SELECT ST_X(location::geometry) as lon, ST_Y(location::geometry) as lat,
              heading, speed_meters_per_second, recorded_at
       FROM partner_location_history
       WHERE partner_id = $1
       ORDER BY recorded_at DESC LIMIT 1;`,
      [partnerId]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      latitude: Number(r.lat),
      longitude: Number(r.lon),
      heading: r.heading ? Number(r.heading) : null,
      speedMps: r.speed_meters_per_second ? Number(r.speed_meters_per_second) : null,
      recordedAt: r.recorded_at,
    };
  }
  async listAdminJobs(filters: {
    status?: string;
    verticalType?: string;
    outletId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: any[]; total: number }> {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let pIdx = 1;
    if (filters.status) {
      conditions.push(`j.status = $${pIdx++}`);
      params.push(filters.status);
    }
    if (filters.verticalType) {
      conditions.push(`j.vertical_type = $${pIdx++}`);
      params.push(filters.verticalType);
    }
    if (filters.outletId) {
      conditions.push(`j.outlet_id = $${pIdx++}`);
      params.push(filters.outletId);
    }
    const whereClause = conditions.join(' AND ');
    const countRes = await this.db.query(
      `SELECT COUNT(*)::int as count FROM delivery_jobs j WHERE ${whereClause};`,
      params
    );
    const total = countRes.rows[0]?.count || 0;
    const limit = Math.min(filters.limit || 50, 100);
    const offset = filters.offset || 0;
    const query = `
      SELECT j.*, o.outlet_name, up.full_name as partner_name, up.phone as partner_phone,
             ST_X(j.pickup_location::geometry) as pickup_lon, ST_Y(j.pickup_location::geometry) as pickup_lat,
             ST_X(j.dropoff_location::geometry) as dropoff_lon, ST_Y(j.dropoff_location::geometry) as dropoff_lat
      FROM delivery_jobs j
      JOIN outlets o ON o.id = j.outlet_id
      LEFT JOIN partners p ON p.id = j.assigned_partner_id
      LEFT JOIN users up ON up.id = p.user_id
      WHERE ${whereClause}
      ORDER BY j.created_at DESC
      LIMIT $${pIdx++} OFFSET $${pIdx++};
    `;
    params.push(limit, offset);
    const res = await this.db.query(query, params);
    return {
      items: res.rows.map((row) => ({
        ...row,
        pickup_location: { latitude: Number(row.pickup_lat), longitude: Number(row.pickup_lon) },
        dropoff_location: { latitude: Number(row.dropoff_lat), longitude: Number(row.dropoff_lon) },
      })),
      total,
    };
  }
  async getDispatchStats(): Promise<any> {
    const statsRes = await this.db.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'ASSIGNMENT_PENDING' OR status = 'READY_FOR_PICKUP') as pending_count,
         COUNT(*) FILTER (WHERE status = 'PARTNER_ASSIGNED' OR status = 'PARTNER_ARRIVED_PICKUP') as assigned_count,
         COUNT(*) FILTER (WHERE status = 'IN_TRANSIT' OR status = 'ARRIVED_AT_DESTINATION') as in_transit_count,
         COUNT(*) FILTER (WHERE status = 'DELIVERED' AND created_at >= CURRENT_DATE) as delivered_today_count,
         COUNT(*) FILTER (WHERE status = 'CANCELLED' AND created_at >= CURRENT_DATE) as cancelled_today_count
       FROM delivery_jobs;`
    );
    const onlineRes = await this.db.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'ONLINE') as online_partners,
         COUNT(*) FILTER (WHERE status = 'BUSY') as busy_partners
       FROM partner_availability_sessions
       WHERE ended_at IS NULL AND last_heartbeat_at >= NOW() - INTERVAL '3 minutes';`
    );
    const exceptionsRes = await this.db.query(
      `SELECT COUNT(*)::int as open_exceptions FROM delivery_exception_records WHERE status = 'OPEN';`
    );
    return {
      pendingJobs: Number(statsRes.rows[0]?.pending_count || 0),
      assignedJobs: Number(statsRes.rows[0]?.assigned_count || 0),
      inTransitJobs: Number(statsRes.rows[0]?.in_transit_count || 0),
      deliveredToday: Number(statsRes.rows[0]?.delivered_today_count || 0),
      cancelledToday: Number(statsRes.rows[0]?.cancelled_today_count || 0),
      onlinePartners: Number(onlineRes.rows[0]?.online_partners || 0),
      busyPartners: Number(onlineRes.rows[0]?.busy_partners || 0),
      openExceptions: Number(exceptionsRes.rows[0]?.open_exceptions || 0),
    };
  }
}