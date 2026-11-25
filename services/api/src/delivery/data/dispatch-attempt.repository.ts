import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

@Injectable()
export class DispatchAttemptRepository {
  constructor(private readonly db: DatabaseService) {}

  async getConfig(): Promise<any> {
    const res = await this.db.query('SELECT * FROM dispatch_configurations LIMIT 1;');
    return (
      res.rows[0] || {
        max_search_radius_meters: 5000,
        offer_timeout_seconds: 45,
        max_reassignment_attempts: 5,
      }
    );
  }

  async findSpatialCandidatePartnerIds(
    pickupLon: number,
    pickupLat: number,
    radiusMeters: number,
  ): Promise<string[]> {
    const res = await this.db.query(
      `SELECT s.partner_id
       FROM partner_availability_sessions s
       JOIN partners p ON p.id = s.partner_id
       WHERE s.status = 'ONLINE'
         AND s.last_heartbeat_at >= NOW() - INTERVAL '120 seconds'
         AND ST_DWithin(s.last_known_location, ST_SetSRID(ST_MakePoint($1, $2), 4326), $3)
       ORDER BY ST_Distance(s.last_known_location, ST_SetSRID(ST_MakePoint($1, $2), 4326)) ASC
       LIMIT 25;`,
      [pickupLon, pickupLat, radiusMeters / 111320],
    );
    return res.rows.map((r: any) => r.partner_id);
  }

  async findPastRejectedPartnerIds(jobId: string): Promise<string[]> {
    const res = await this.db.query(
      `SELECT partner_id FROM dispatch_attempts
       WHERE delivery_job_id = $1 AND status IN ('REJECTED', 'EXPIRED');`,
      [jobId],
    );
    return res.rows.map((r: any) => r.partner_id);
  }

  async isPartnerActiveOnJob(partnerId: string): Promise<boolean> {
    const res = await this.db.query(
      `SELECT id FROM delivery_jobs
       WHERE assigned_partner_id = $1
         AND status IN ('PARTNER_ASSIGNED', 'PARTNER_ARRIVING', 'PARTNER_ARRIVED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_AT_DESTINATION')
       LIMIT 1;`,
      [partnerId],
    );
    return res.rows.length > 0;
  }

  async recordException(jobId: string, exceptionType: string, details: string): Promise<void> {
    await this.db.query(
      `INSERT INTO delivery_exception_records (delivery_job_id, exception_type, details, status)
       VALUES ($1, $2, $3, 'OPEN');`,
      [jobId, exceptionType, details],
    );
  }

  async createAttempt(jobId: string, partnerId: string, expiresAt: Date): Promise<any> {
    const res = await this.db.query(
      `INSERT INTO dispatch_attempts (
         delivery_job_id, attempt_number, partner_id, status, offer_sent_at, offer_expires_at
       ) VALUES (
         $1, (SELECT COALESCE(MAX(attempt_number), 0) + 1 FROM dispatch_attempts WHERE delivery_job_id = $1),
         $2, 'OFFERED', NOW(), $3
       ) RETURNING *;`,
      [jobId, partnerId, expiresAt],
    );
    return res.rows[0];
  }

  async findAttemptById(attemptId: string, partnerId?: string): Promise<any | null> {
    const wherePartner = partnerId ? `AND partner_id = $2` : '';
    const params = partnerId ? [attemptId, partnerId] : [attemptId];
    const res = await this.db.query(
      `SELECT * FROM dispatch_attempts WHERE id = $1 ${wherePartner};`,
      params,
    );
    return res.rows[0] ?? null;
  }

  async updateAttemptStatus(attemptId: string, status: string, reason?: string): Promise<void> {
    if (reason) {
      await this.db.query(
        `UPDATE dispatch_attempts SET status = $1, responded_at = NOW(), rejection_reason = $2 WHERE id = $3;`,
        [status, reason, attemptId],
      );
    } else {
      await this.db.query(
        `UPDATE dispatch_attempts SET status = $1, responded_at = NOW() WHERE id = $2;`,
        [status, attemptId],
      );
    }
  }

  async cancelOtherOffers(jobId: string, exceptAttemptId?: string): Promise<void> {
    if (exceptAttemptId) {
      await this.db.query(
        `UPDATE dispatch_attempts SET status = 'CANCELLED' WHERE delivery_job_id = $1 AND id != $2 AND status = 'OFFERED';`,
        [jobId, exceptAttemptId],
      );
    } else {
      await this.db.query(
        `UPDATE dispatch_attempts SET status = 'CANCELLED' WHERE delivery_job_id = $1 AND status = 'OFFERED';`,
        [jobId],
      );
    }
  }

  async updatePartnerSessionBusy(partnerId: string): Promise<void> {
    await this.db.query(
      `UPDATE partner_availability_sessions SET status = 'BUSY' WHERE partner_id = $1 AND status = 'ONLINE';`,
      [partnerId],
    );
  }

  async listAttemptsByJobId(jobId: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT da.*, p.user_id, u.full_name as partner_name, u.phone as partner_phone
       FROM dispatch_attempts da
       JOIN partners p ON p.id = da.partner_id
       JOIN users u ON u.id = p.user_id
       WHERE da.delivery_job_id = $1
       ORDER BY da.attempt_number ASC;`,
      [jobId],
    );
    return res.rows;
  }

  async listOnlinePartnerSessions(): Promise<any[]> {
    const res = await this.db.query(
      `SELECT s.id, s.partner_id, s.status, s.last_heartbeat_at,
              ST_Y(s.last_known_location::geometry) as latitude,
              ST_X(s.last_known_location::geometry) as longitude,
              p.vehicle_type, p.rating, u.full_name, u.phone
       FROM partner_availability_sessions s
       JOIN partners p ON p.id = s.partner_id
       JOIN users u ON u.id = p.user_id
       WHERE s.last_heartbeat_at >= NOW() - INTERVAL '10 minutes'
       ORDER BY s.last_heartbeat_at DESC;`,
    );
    return res.rows;
  }

  async getOnlinePartnerStats(): Promise<any> {
    const res = await this.db.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'ONLINE' AND last_heartbeat_at >= NOW() - INTERVAL '2 minutes') as online_count,
         COUNT(*) FILTER (WHERE status = 'BUSY' AND last_heartbeat_at >= NOW() - INTERVAL '2 minutes') as busy_count
       FROM partner_availability_sessions;`,
    );
    return res.rows[0];
  }
}
