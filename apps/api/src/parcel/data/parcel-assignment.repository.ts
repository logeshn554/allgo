import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

@Injectable()
export class ParcelAssignmentRepository {
  constructor(private readonly db: DatabaseService) {}

  async findExistingActiveOffer(parcelId: string): Promise<any | null> {
    const res = await this.db.query(
      `SELECT * FROM parcel_assignments WHERE parcel_id = $1 AND status = 'OFFERED' AND offer_expires_at > NOW() LIMIT 1;`,
      [parcelId]
    );
    return res.rows[0] ?? null;
  }

  async findSpatialCandidatePartnerIds(
    pickupLon: number,
    pickupLat: number,
    radiusMeters: number
  ): Promise<string[]> {
    const res = await this.db.query(
      `SELECT s.partner_id
       FROM partner_availability_sessions s
       JOIN partners p ON p.id = s.partner_id
       WHERE s.status = 'ONLINE'
         AND s.last_heartbeat_at >= NOW() - INTERVAL '180 seconds'
         AND ST_DWithin(s.last_known_location, ST_SetSRID(ST_MakePoint($1, $2), 4326), $3)
       ORDER BY ST_Distance(s.last_known_location, ST_SetSRID(ST_MakePoint($1, $2), 4326)) ASC
       LIMIT 25;`,
      [pickupLon, pickupLat, radiusMeters / 111320]
    );
    return res.rows.map((r: any) => r.partner_id);
  }

  async findPastRejectedPartnerIds(parcelId: string): Promise<string[]> {
    const res = await this.db.query(
      `SELECT partner_id FROM parcel_assignments
       WHERE parcel_id = $1 AND status IN ('REJECTED', 'EXPIRED');`,
      [parcelId]
    );
    return res.rows.map((r: any) => r.partner_id);
  }

  async isPartnerActiveOnParcel(partnerId: string): Promise<boolean> {
    const res = await this.db.query(
      `SELECT id FROM parcels
       WHERE partner_id = $1
         AND status IN ('ACCEPTED', 'PARTNER_ASSIGNED', 'PARTNER_ACCEPTED', 'ARRIVING_AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVING_AT_DESTINATION')
       LIMIT 1;`,
      [partnerId]
    );
    return res.rows.length > 0;
  }

  async createAttempt(parcelId: string, partnerId: string, expiresAt: Date): Promise<any> {
    const res = await this.db.query(
      `INSERT INTO parcel_assignments (
         parcel_id, attempt_number, partner_id, status, offer_sent_at, offer_expires_at
       ) VALUES (
         $1, (SELECT COALESCE(MAX(attempt_number), 0) + 1 FROM parcel_assignments WHERE parcel_id = $1),
         $2, 'OFFERED', NOW(), $3
       ) RETURNING *;`,
      [parcelId, partnerId, expiresAt]
    );
    return res.rows[0];
  }

  async findAttemptForUpdate(client: any, attemptId: string): Promise<any | null> {
    const res = await client.query(
      `SELECT * FROM parcel_assignments WHERE id = $1 FOR UPDATE;`,
      [attemptId]
    );
    return res.rows[0] ?? null;
  }

  async findAttemptById(attemptId: string): Promise<any | null> {
    const res = await this.db.query(
      `SELECT * FROM parcel_assignments WHERE id = $1;`,
      [attemptId]
    );
    return res.rows[0] ?? null;
  }

  async updateAttemptStatus(
    attemptId: string,
    status: string,
    reason?: string,
    client?: any
  ): Promise<void> {
    const runner = client || this.db;
    if (reason) {
      await runner.query(
        `UPDATE parcel_assignments SET status = $1, responded_at = NOW(), rejection_reason = $2 WHERE id = $3;`,
        [status, reason, attemptId]
      );
    } else {
      await runner.query(
        `UPDATE parcel_assignments SET status = $1, responded_at = NOW() WHERE id = $2;`,
        [status, attemptId]
      );
    }
  }

  async cancelOtherOffers(parcelId: string, exceptAttemptId: string, client?: any): Promise<void> {
    const runner = client || this.db;
    await runner.query(
      `UPDATE parcel_assignments SET status = 'CANCELLED' WHERE parcel_id = $1 AND id != $2 AND status = 'OFFERED';`,
      [parcelId, exceptAttemptId]
    );
  }

  async getPartnerOffers(partnerId: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT a.*, p.parcel_number, p.service_type, p.package_category,
              p.estimated_weight_kg, p.pickup_address, p.drop_address, p.partner_payout_inr
       FROM parcel_assignments a
       JOIN parcels p ON p.id = a.parcel_id
       WHERE a.partner_id = $1
         AND a.status = 'OFFERED'
         AND a.offer_expires_at > NOW()
       ORDER BY a.created_at DESC;`,
      [partnerId]
    );
    return res.rows;
  }
}
