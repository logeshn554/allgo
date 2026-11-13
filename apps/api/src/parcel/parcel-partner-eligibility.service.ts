import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { PartnerContinuityService } from '../mobility/partner-continuity.service.js';

@Injectable()
export class ParcelPartnerEligibilityService {
  constructor(
    private readonly db: DatabaseService,
    private readonly continuityService: PartnerContinuityService
  ) {}

  async checkEligibility(partnerId: string, _weightKg?: number): Promise<{ isEligible: boolean; reason?: string }> {
    return this.checkPartnerEligibility(partnerId);
  }

  /**
   * Server-authoritative check for parcel delivery partner eligibility
   */
  async checkPartnerEligibility(partnerId: string): Promise<{ isEligible: boolean; reason?: string }> {
    // 1. Account status
    const pRes = await this.db.query('SELECT id, status FROM partners WHERE id = $1;', [partnerId]);
    if (pRes.rows.length === 0 || pRes.rows[0].status !== 'APPROVED') {
      return { isEligible: false, reason: 'Partner account is not approved' };
    }

    // 2. KYC verification
    const docRes = await this.db.query(
      `SELECT COUNT(*)::int as count FROM partner_documents
       WHERE partner_id = $1 AND verification_status = 'VERIFIED';`,
      [partnerId]
    );
    if ((docRes.rows[0]?.count || 0) < 1) {
      return { isEligible: false, reason: 'Required KYC documents are not verified' };
    }

    // 3. Approved vehicle
    const vehRes = await this.db.query(
      `SELECT COUNT(*)::int as count FROM vehicles WHERE partner_id = $1;`,
      [partnerId]
    );
    if ((vehRes.rows[0]?.count || 0) < 1) {
      return { isEligible: false, reason: 'Approved vehicle registration required' };
    }

    // 4. Approved PARCEL service application
    const srvRes = await this.db.query(
      `SELECT COUNT(*)::int as count FROM partner_service_applications
       WHERE partner_id = $1 AND service_type = 'PARCEL' AND status = 'APPROVED';`,
      [partnerId]
    );
    if ((srvRes.rows[0]?.count || 0) < 1) {
      return { isEligible: false, reason: 'Approved PARCEL service category application required' };
    }

    // 5. Active mutual exclusion lock check
    const mode = await this.continuityService.getPartnerMode(partnerId);
    if (mode?.activeVerticalLock && mode.activeVerticalLock !== 'PARCEL') {
      return { isEligible: false, reason: `Partner is locked to another vertical: ${mode.activeVerticalLock}` };
    }

    return { isEligible: true };
  }
}
