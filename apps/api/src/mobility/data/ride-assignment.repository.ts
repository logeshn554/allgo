import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

@Injectable()
export class RideAssignmentRepository {
  constructor(private readonly db: DatabaseService) {}

  async findEligiblePartners(rideId: string): Promise<any[]> {
    const partnersRes = await this.db.query(
      `SELECT p.id, p.user_id, pm.current_mode
       FROM partners p
       JOIN partner_modes pm ON pm.partner_id = p.id
       WHERE p.status = 'APPROVED'
         AND pm.is_online = true
         AND (pm.active_vertical_lock IS NULL OR pm.active_vertical_lock = 'RIDE')
         AND p.id NOT IN (
           SELECT partner_id FROM ride_assignments WHERE ride_id = $1 AND status IN ('REJECTED', 'EXPIRED')
         )
       LIMIT 5;`,
      [rideId]
    );
    return partnersRes.rows;
  }

  async createAssignment(rideId: string, partnerId: string, expiresAt: Date): Promise<any> {
    const res = await this.db.query(
      `INSERT INTO ride_assignments (
         ride_id, partner_id, driver_id, attempt_number, status, offer_sent_at, offer_expires_at
       ) VALUES (
         $1, $2, $2,
         (SELECT COALESCE(MAX(attempt_number), 0) + 1 FROM ride_assignments WHERE ride_id = $1),
         'OFFERED', NOW(), $3
       ) RETURNING *;`,
      [rideId, partnerId, expiresAt]
    );
    return res.rows[0];
  }

  async getPartnerOffers(partnerId: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT ra.*, r.ride_number, r.ride_type, r.service_type, r.pickup_address,
              r.drop_address, r.total_fare_inr, r.partner_payout_inr, r.estimated_distance_km
       FROM ride_assignments ra
       JOIN rides r ON r.id = ra.ride_id
       WHERE ra.partner_id = $1
         AND ra.status = 'OFFERED'
         AND ra.offer_expires_at > NOW()
       ORDER BY ra.created_at DESC;`,
      [partnerId]
    );
    return res.rows;
  }

  async findAssignmentById(attemptId: string): Promise<any> {
    const res = await this.db.query(
      `SELECT * FROM ride_assignments WHERE id = $1;`,
      [attemptId]
    );
    if (res.rows.length === 0) throw new NotFoundException('Ride offer not found');
    return res.rows[0];
  }

  async expireAssignment(attemptId: string): Promise<void> {
    await this.db.query(`UPDATE ride_assignments SET status = 'EXPIRED' WHERE id = $1;`, [attemptId]);
  }

  async updateAssignmentAccepted(attemptId: string): Promise<void> {
    await this.db.query(
      `UPDATE ride_assignments SET status = 'ACCEPTED', responded_at = NOW(), updated_at = NOW() WHERE id = $1;`,
      [attemptId]
    );
  }

  async updateAssignmentRejected(attemptId: string, reason?: string): Promise<void> {
    await this.db.query(
      `UPDATE ride_assignments
       SET status = 'REJECTED', responded_at = NOW(), rejection_reason = $1, updated_at = NOW()
       WHERE id = $2;`,
      [reason || 'Rejected by driver', attemptId]
    );
  }
}
