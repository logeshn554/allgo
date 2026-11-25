import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

@Injectable()
export class PartnerAvailabilityRepository {
  constructor(private readonly db: DatabaseService) {}

  async getPartnerByUserId(userId: string): Promise<any> {
    const res = await this.db.query(
      `SELECT p.*, u.full_name, u.phone
       FROM partners p
       JOIN users u ON u.id = p.user_id
       WHERE p.user_id = $1;`,
      [userId],
    );
    if (res.rows.length === 0) {
      throw new NotFoundException('Partner profile not found for user');
    }
    return res.rows[0];
  }

  async checkEligibility(partnerId: string): Promise<{ isEligible: boolean; reason?: string }> {
    const pRes = await this.db.query('SELECT id, status FROM partners WHERE id = $1;', [partnerId]);
    if (pRes.rows.length === 0 || pRes.rows[0].status !== 'APPROVED') {
      return { isEligible: false, reason: 'Partner account is not approved' };
    }

    const docRes = await this.db.query(
      `SELECT COUNT(*)::int as count FROM partner_documents
       WHERE partner_id = $1 AND verification_status = 'VERIFIED';`,
      [partnerId],
    );
    if ((docRes.rows[0]?.count || 0) < 1) {
      return { isEligible: false, reason: 'Required KYC documents are not verified' };
    }

    const vehRes = await this.db.query(
      `SELECT COUNT(*)::int as count FROM vehicles WHERE partner_id = $1;`,
      [partnerId],
    );
    if ((vehRes.rows[0]?.count || 0) < 1) {
      return { isEligible: false, reason: 'Approved vehicle registration required' };
    }

    const srvRes = await this.db.query(
      `SELECT COUNT(*)::int as count FROM partner_service_applications
       WHERE partner_id = $1 AND status = 'APPROVED';`,
      [partnerId],
    );
    if ((srvRes.rows[0]?.count || 0) < 1) {
      return { isEligible: false, reason: 'Approved delivery service category required' };
    }

    return { isEligible: true };
  }

  async createSession(
    partnerId: string,
    lon: number,
    lat: number,
    battery: number,
  ): Promise<string> {
    const res = await this.db.query(
      `INSERT INTO partner_availability_sessions (
         partner_id, status, started_at, last_heartbeat_at, last_known_location, battery_percentage
       ) VALUES (
         $1, 'ONLINE', NOW(), NOW(), ST_SetSRID(ST_MakePoint($2, $3), 4326), $4
       ) RETURNING id;`,
      [partnerId, lon, lat, battery],
    );
    return res.rows[0].id;
  }

  async endSession(partnerId: string): Promise<void> {
    await this.db.query(
      `UPDATE partner_availability_sessions
       SET status = 'OFFLINE', ended_at = NOW()
       WHERE partner_id = $1 AND status IN ('ONLINE', 'BUSY');`,
      [partnerId],
    );
  }

  async updateHeartbeat(
    partnerId: string,
    lon: number,
    lat: number,
    battery: number,
  ): Promise<void> {
    await this.db.query(
      `UPDATE partner_availability_sessions
       SET last_heartbeat_at = NOW(),
           last_known_location = ST_SetSRID(ST_MakePoint($1, $2), 4326),
           battery_percentage = $3
       WHERE partner_id = $4 AND status IN ('ONLINE', 'BUSY');`,
      [lon, lat, battery, partnerId],
    );
  }

  async getActiveJobId(partnerId: string): Promise<string | null> {
    const res = await this.db.query(
      `SELECT id FROM delivery_jobs
       WHERE assigned_partner_id = $1
         AND status IN ('PARTNER_ASSIGNED', 'PARTNER_ARRIVING', 'PARTNER_ARRIVED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_AT_DESTINATION')
       LIMIT 1;`,
      [partnerId],
    );
    return res.rows.length > 0 ? res.rows[0].id : null;
  }

  async getLastRecordedPoint(
    partnerId: string,
  ): Promise<{ lat: number; lon: number; recorded_at: any } | null> {
    const lastLocRes = await this.db.query(
      `SELECT ST_X(location::geometry) as lon, ST_Y(location::geometry) as lat, recorded_at
       FROM partner_location_history
       WHERE partner_id = $1
       ORDER BY recorded_at DESC LIMIT 1;`,
      [partnerId],
    );

    if (lastLocRes.rows.length > 0) {
      return lastLocRes.rows[0];
    }

    const sessRes = await this.db.query(
      `SELECT ST_X(last_known_location::geometry) as lon, ST_Y(last_known_location::geometry) as lat, last_heartbeat_at as recorded_at
       FROM partner_availability_sessions
       WHERE partner_id = $1 AND last_known_location IS NOT NULL
       ORDER BY last_heartbeat_at DESC LIMIT 1;`,
      [partnerId],
    );
    return sessRes.rows.length > 0 && sessRes.rows[0].lon !== null ? sessRes.rows[0] : null;
  }

  async insertLocation(
    partnerId: string,
    activeJobId: string | null,
    lon: number,
    lat: number,
    heading?: number | null,
    speedMps?: number | null,
    accuracy?: number | null,
    now?: Date,
  ): Promise<string> {
    const ins = await this.db.query(
      `INSERT INTO partner_location_history (
         partner_id, active_job_id, location, heading, speed_meters_per_second, accuracy_meters, recorded_at
       ) VALUES (
         $1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, $6, $7, $8
       ) RETURNING id;`,
      [
        partnerId,
        activeJobId,
        lon,
        lat,
        heading ?? null,
        speedMps ?? null,
        accuracy ?? null,
        now || new Date(),
      ],
    );
    return ins.rows[0].id;
  }

  async batchInsertLocations(
    locations: Array<{
      partnerId: string;
      activeJobId: string | null;
      lon: number;
      lat: number;
      heading?: number | null;
      speedMps?: number | null;
      accuracy?: number | null;
      recordedAt?: Date;
    }>,
  ): Promise<number> {
    if (locations.length === 0) return 0;
    const valueClauses: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    for (const loc of locations) {
      valueClauses.push(
        `($${pIdx++}, $${pIdx++}, ST_SetSRID(ST_MakePoint($${pIdx++}, $${pIdx++}), 4326), $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++})`,
      );
      params.push(
        loc.partnerId,
        loc.activeJobId,
        loc.lon,
        loc.lat,
        loc.heading ?? null,
        loc.speedMps ?? null,
        loc.accuracy ?? null,
        loc.recordedAt || new Date(),
      );
    }

    const query = `
      INSERT INTO partner_location_history (
        partner_id, active_job_id, location, heading, speed_meters_per_second, accuracy_meters, recorded_at
      ) VALUES ${valueClauses.join(', ')};
    `;
    const res = await this.db.query(query, params);
    return res.rowCount || locations.length;
  }
}
