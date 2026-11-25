import { Injectable } from '@nestjs/common';
import { PartnerContinuityService } from '../mobility/partner-continuity.service.js';
import { ParcelAssignmentRepository } from './data/parcel-assignment.repository.js';
import { ParcelRepository } from './data/parcel.repository.js';
import { formatCustomerParcel } from './parcel-formatting.helper.js';

@Injectable()
export class PartnerParcelService {
  constructor(
    private readonly parcelRepo: ParcelRepository,
    private readonly continuityService: PartnerContinuityService,
    private readonly assignmentRepo: ParcelAssignmentRepository,
  ) {}

  async getPartnerActiveParcel(partnerUserId: string): Promise<any> {
    const partner = await this.continuityService.getPartnerByUserId(partnerUserId);
    const active = await this.parcelRepo.findActiveByPartnerId(partner.id);
    if (!active) return null;
    return formatCustomerParcel(active, partnerUserId, 'PARTNER');
  }

  async getPartnerOffers(partnerUserId: string): Promise<any[]> {
    const partner = await this.continuityService.getPartnerByUserId(partnerUserId);
    const rows = await this.assignmentRepo.getPartnerOffers(partner.id);

    return rows.map((r: any) => ({
      attemptId: r.id,
      parcelId: r.parcel_id,
      parcelNumber: r.parcel_number,
      serviceType: r.service_type,
      packageCategory: r.package_category,
      weightKg: Number(r.estimated_weight_kg),
      pickupAddress: r.pickup_address,
      dropoffAddress: r.drop_address,
      totalPayoutInr: Number(r.partner_payout_inr),
      offerSentAt: r.offer_sent_at,
      offerExpiresAt: r.offer_expires_at,
    }));
  }

  async getPartnerHistory(partnerUserId: string, limit = 20, offset = 0): Promise<any[]> {
    const partner = await this.continuityService.getPartnerByUserId(partnerUserId);
    const rows = await this.parcelRepo.listByPartnerId(partner.id, limit, offset);
    return rows.map((r: any) => formatCustomerParcel(r, partnerUserId, 'PARTNER'));
  }
}
