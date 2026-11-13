import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { RedisService } from '../redis/redis.service.js';
import { DeliveryGateway } from './delivery.gateway.js';
import {
  LocationCoordinatesDto,
  PartnerLocationUpdateDto,
} from './dto/delivery.dto.js';

export const REDIS_ONLINE_PARTNERS_GEO_KEY = 'dispatch:partners:online:geo';
export const HEARTBEAT_TTL_SECONDS = 120;

@Injectable()
export class PartnerAvailabilityService {
  private readonly logger = new Logger(PartnerAvailabilityService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly gateway: DeliveryGateway
  ) {}

  /**
   * Helper: Resolve partner record from user ID
   */
  async getPartnerByUserId(userId: string): Promise<any> {
    const res = await this.db.query(
      `SELECT p.*, u.full_name, u.phone
       FROM partners p
       JOIN users u ON u.id = p.user_id
       WHERE p.user_id = $1;`,
      [userId]
    );
    if (res.rows.length === 0) {
      throw new NotFoundException('Partner profile not found for user');
    }
    return res.rows[0];
  }

  /**
   * Server-authoritative partner eligibility check:
   * 1. Account status must be APPROVED.
   * 2. Must have at least one approved KYC document.
   * 3. Must have an approved vehicle.
   * 4. Must have an approved delivery service application.
   */
  async checkEligibility(partnerId: string): Promise<{ isEligible: boolean; reason?: string }> {
    const pRes = await this.db.query('SELECT id, status FROM partners WHERE id = $1;', [partnerId]);
    if (pRes.rows.length === 0 || pRes.rows[0].status !== 'APPROVED') {
      return { isEligible: false, reason: 'Partner account is not approved' };
    }

    // 2. KYC verification check
    const docRes = await this.db.query(
      `SELECT COUNT(*)::int as count FROM partner_documents
       WHERE partner_id = $1 AND verification_status = 'VERIFIED';`,
      [partnerId]
    );
    if ((docRes.rows[0]?.count || 0) < 1) {
      return { isEligible: false, reason: 'Required KYC documents are not verified' };
    }

    // 3. Vehicle check
    const vehRes = await this.db.query(
      `SELECT COUNT(*)::int as count FROM vehicles
       WHERE partner_id = $1;`,
      [partnerId]
    );
    if ((vehRes.rows[0]?.count || 0) < 1) {
      return { isEligible: false, reason: 'Approved vehicle registration required' };
    }

    // 4. Service category check
    const srvRes = await this.db.query(
      `SELECT COUNT(*)::int as count FROM partner_service_applications
       WHERE partner_id = $1 AND status = 'APPROVED';`,
      [partnerId]
    );
    if ((srvRes.rows[0]?.count || 0) < 1) {
      return { isEligible: false, reason: 'Approved delivery service category required' };
    }

    return { isEligible: true };
  }

  /**
   * Go Online
   */
  async setOnline(userId: string, coords: LocationCoordinatesDto, batteryPercentage: number = 100): Promise<any> {
    const partner = await this.getPartnerByUserId(userId);

    // Enforce eligibility
    const eligibility = await this.checkEligibility(partner.id);
    if (!eligibility.isEligible) {
      throw new ForbiddenException(`Cannot go online: ${eligibility.reason}`);
    }

    // Insert or update session
    const res = await this.db.query(
      `INSERT INTO partner_availability_sessions (
         partner_id, status, started_at, last_heartbeat_at, last_known_location, battery_percentage
       ) VALUES (
         $1, 'ONLINE', NOW(), NOW(), ST_SetSRID(ST_MakePoint($2, $3), 4326), $4
       ) RETURNING *;`,
      [partner.id, coords.longitude, coords.latitude, batteryPercentage]
    );

    // Update Redis GEO and TTL
    try {
      await this.redis.geoadd(REDIS_ONLINE_PARTNERS_GEO_KEY, coords.longitude, coords.latitude, partner.id);
      await this.redis.setex(`dispatch:partner:${partner.id}:heartbeat`, HEARTBEAT_TTL_SECONDS, 'ONLINE');
    } catch (err: any) {
      this.logger.warn(`Redis GEO update failed during setOnline: ${err.message}`);
    }

    return {
      status: 'ONLINE',
      partnerId: partner.id,
      sessionId: res.rows[0].id,
      location: coords,
    };
  }

  /**
   * Go Offline
   */
  async setOffline(userId: string): Promise<{ status: string }> {
    const partner = await this.getPartnerByUserId(userId);

    // End open session
    await this.db.query(
      `UPDATE partner_availability_sessions
       SET status = 'OFFLINE', ended_at = NOW()
       WHERE partner_id = $1 AND status IN ('ONLINE', 'BUSY');`,
      [partner.id]
    );

    // Remove from Redis GEO
    try {
      await this.redis.zrem(REDIS_ONLINE_PARTNERS_GEO_KEY, partner.id);
      await this.redis.del(`dispatch:partner:${partner.id}:heartbeat`);
    } catch {}

    return { status: 'OFFLINE' };
  }

  /**
   * Periodic Heartbeat
   */
  async heartbeat(userId: string, coords: LocationCoordinatesDto, batteryPercentage: number = 100): Promise<any> {
    const partner = await this.getPartnerByUserId(userId);

    // Update session timestamp and location
    await this.db.query(
      `UPDATE partner_availability_sessions
       SET last_heartbeat_at = NOW(),
           last_known_location = ST_SetSRID(ST_MakePoint($1, $2), 4326),
           battery_percentage = $3
       WHERE partner_id = $4 AND status IN ('ONLINE', 'BUSY');`,
      [coords.longitude, coords.latitude, batteryPercentage, partner.id]
    );

    // Update Redis GEO
    try {
      await this.redis.geoadd(REDIS_ONLINE_PARTNERS_GEO_KEY, coords.longitude, coords.latitude, partner.id);
      await this.redis.setex(`dispatch:partner:${partner.id}:heartbeat`, HEARTBEAT_TTL_SECONDS, 'ONLINE');
    } catch {}

    return { success: true, timestamp: new Date().toISOString() };
  }

  /**
   * Ingest GPS Point with anti-spoofing and impossible speed verification
   */
  async recordLocation(userId: string, dto: PartnerLocationUpdateDto): Promise<{ success: boolean; id: string }> {
    const partner = await this.getPartnerByUserId(userId);

    // 1. Fetch active delivery job for partner
    const activeJobRes = await this.db.query(
      `SELECT id FROM delivery_jobs
       WHERE assigned_partner_id = $1
         AND status IN ('PARTNER_ASSIGNED', 'PARTNER_ARRIVING', 'PARTNER_ARRIVED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_AT_DESTINATION')
       LIMIT 1;`,
      [partner.id]
    );
    const activeJobId = activeJobRes.rows.length > 0 ? activeJobRes.rows[0].id : null;

    // 2. Anti-spoofing / Impossible speed check
    const lastLocRes = await this.db.query(
      `SELECT ST_X(location::geometry) as lon, ST_Y(location::geometry) as lat, recorded_at
       FROM partner_location_history
       WHERE partner_id = $1
       ORDER BY recorded_at DESC LIMIT 1;`,
      [partner.id]
    );

    const now = dto.recordedAt ? new Date(dto.recordedAt) : new Date();

    let prevPoint: { lat: number; lon: number; recorded_at: any } | null = null;
    if (lastLocRes.rows.length > 0) {
      prevPoint = lastLocRes.rows[0];
    } else {
      const sessRes = await this.db.query(
        `SELECT ST_X(last_known_location::geometry) as lon, ST_Y(last_known_location::geometry) as lat, last_heartbeat_at as recorded_at
         FROM partner_availability_sessions
         WHERE partner_id = $1 AND last_known_location IS NOT NULL
         ORDER BY last_heartbeat_at DESC LIMIT 1;`,
        [partner.id]
      );
      if (sessRes.rows.length > 0 && sessRes.rows[0].lon !== null) {
        prevPoint = sessRes.rows[0];
      }
    }

    if (prevPoint) {
      const timeDiffSec = (now.getTime() - new Date(prevPoint.recorded_at).getTime()) / 1000;

      if (timeDiffSec >= 0 && timeDiffSec < 3600) {
        // Compute approximate distance in meters via Haversine
        const distMeters = this.calculateDistanceMeters(
          Number(prevPoint.lat),
          Number(prevPoint.lon),
          dto.latitude,
          dto.longitude
        );
        const effectiveTime = Math.max(timeDiffSec, 1);
        const speedMps = distMeters / effectiveTime;

        // If speed > 45 m/s (~162 km/h) in city delivery, reject as impossible speed
        if (speedMps > 45) {
          this.logger.warn(`Suspicious GPS teleportation detected for partner ${partner.id}: ${speedMps.toFixed(1)} m/s`);
          throw new BadRequestException(`Impossible speed detected: ${speedMps.toFixed(1)} m/s exceeds threshold`);
        }
      }
    }

    // 3. Insert location record
    const ins = await this.db.query(
      `INSERT INTO partner_location_history (
         partner_id, active_job_id, location, heading, speed_meters_per_second, accuracy_meters, recorded_at
       ) VALUES (
         $1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, $6, $7, $8
       ) RETURNING id;`,
      [
        partner.id,
        activeJobId,
        dto.longitude,
        dto.latitude,
        dto.heading ?? null,
        dto.speedMps ?? null,
        dto.accuracyMeters ?? null,
        now,
      ]
    );

    // 4. Update Redis GEO
    try {
      await this.redis.geoadd(REDIS_ONLINE_PARTNERS_GEO_KEY, dto.longitude, dto.latitude, partner.id);
      await this.redis.setex(`dispatch:partner:${partner.id}:heartbeat`, HEARTBEAT_TTL_SECONDS, 'ONLINE');
    } catch {}

    // 5. Broadcast to active job tracking room via WebSocket
    if (activeJobId) {
      this.gateway.emitPartnerLocationUpdate(activeJobId, {
        jobId: activeJobId,
        partnerId: partner.id,
        latitude: dto.latitude,
        longitude: dto.longitude,
        heading: dto.heading,
        speedMps: dto.speedMps,
        recordedAt: now.toISOString(),
      });
    }

    return { success: true, id: ins.rows[0].id };
  }

  private calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
