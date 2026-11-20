import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { PartnerContinuityService } from './partner-continuity.service.js';
import { PartnerUnifiedEarnings, NextJobProximityMatch } from './dto/continuity.dto.js';

@Injectable()
export class PartnerContinuityExtensionService {
  private readonly logger = new Logger(PartnerContinuityExtensionService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly continuityService: PartnerContinuityService
  ) {}

  async getUnifiedEarnings(partnerUserId: string): Promise<PartnerUnifiedEarnings> {
    const partner = await this.continuityService.getPartnerByUserId(partnerUserId);
    const mode = await this.continuityService.getPartnerMode(partner.id);

    // Sum deliveries
    const delRes = await this.db.query(
      `SELECT COALESCE(SUM(courier_fee_inr + surge_fee_inr), 0)::numeric as earnings, COUNT(*)::int as count
       FROM delivery_jobs WHERE assigned_partner_id = $1 AND status = 'DELIVERED';`,
      [partner.id]
    );

    // Sum rides
    const rideRes = await this.db.query(
      `SELECT COALESCE(SUM(partner_payout_inr), 0)::numeric as earnings, COUNT(*)::int as count
       FROM rides WHERE driver_id = $1 AND status = 'COMPLETED';`,
      [partner.id]
    );

    // Sum hire-driver bookings
    const hireRes = await this.db.query(
      `SELECT COALESCE(SUM(partner_payout_inr), 0)::numeric as earnings, COUNT(*)::int as count
       FROM hire_driver_bookings WHERE partner_id = $1 AND status = 'COMPLETED';`,
      [partner.id]
    );

    const delEarn = Number(delRes.rows[0]?.earnings || 0);
    const rideEarn = Number(rideRes.rows[0]?.earnings || 0);
    const hireEarn = Number(hireRes.rows[0]?.earnings || 0);

    return {
      partnerId: partner.id,
      totalEarningsInr: delEarn + rideEarn + hireEarn,
      deliveryEarningsInr: delEarn,
      rideEarningsInr: rideEarn,
      hireDriverEarningsInr: hireEarn,
      completedJobsCount:
        Number(delRes.rows[0]?.count || 0) +
        Number(rideRes.rows[0]?.count || 0) +
        Number(hireRes.rows[0]?.count || 0),
      activeMode: mode.preferredMode,
    };
  }

  async findNextJobNearLastDrop(
    partnerId: string,
    lastDropLat: number,
    lastDropLon: number,
    radiusKm: number = 3.0
  ): Promise<NextJobProximityMatch[]> {
    this.logger.debug(`Searching jobs for partner ${partnerId} near last drop: ${lastDropLat}, ${lastDropLon}`);
    const res = await this.db.query(
      `SELECT id, vertical_type, pickup_address, courier_fee_inr + surge_fee_inr as payout,
              ST_Distance(pickup_location, ST_SetSRID(ST_MakePoint($1, $2), 4326)) * 111.32 as dist_km
       FROM delivery_jobs
       WHERE status = 'ASSIGNMENT_PENDING'
         AND ST_DWithin(pickup_location, ST_SetSRID(ST_MakePoint($1, $2), 4326), $3 / 111.32)
       ORDER BY dist_km ASC LIMIT 5;`,
      [lastDropLon, lastDropLat, radiusKm]
    );

    return res.rows.map((r: any) => ({
      jobId: r.id,
      vertical: r.vertical_type,
      pickupAddress: r.pickup_address,
      distanceFromLastDropKm: Number(Number(r.dist_km).toFixed(2)),
      payoutInr: Number(r.payout),
    }));
  }
}
