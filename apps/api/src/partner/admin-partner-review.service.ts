import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PartnerRepository } from './data/partner.repository.js';

@Injectable()
export class AdminPartnerReviewService {
  constructor(private readonly partnerRepo: PartnerRepository) {}

  async listAdminApplications(query: { status?: string }): Promise<any[]> {
    const list: any[] = [];
    for (const p of this.partnerRepo.inMemoryPartners.values()) {
      if (!query.status || p.status === query.status) {
        list.push({
          ...p,
          vehicle: this.partnerRepo.findVehicleByPartnerId(p.id),
        });
      }
    }
    return list;
  }

  async updateAdminPartnerStatus(
    partnerId: string,
    adminUserId: string,
    newStatus: string,
    reason?: string
  ): Promise<any> {
    const partner = this.partnerRepo.findPartnerById(partnerId);
    if (!partner) {
      throw new NotFoundException(`Partner application ${partnerId} not found`);
    }

    const { oldStatus } = await this.partnerRepo.updatePartnerStatus(
      partnerId,
      adminUserId,
      newStatus,
      reason
    );

    return {
      partnerId,
      oldStatus,
      newStatus,
      reason,
    };
  }

  async updateAdminServiceStatus(
    partnerId: string,
    serviceType: string,
    adminUserId: string,
    newStatus: string,
    reason?: string
  ): Promise<any> {
    const { oldStatus } = await this.partnerRepo.updateServiceStatus(
      partnerId,
      serviceType,
      adminUserId,
      newStatus,
      reason
    );

    return {
      partnerId,
      serviceType,
      oldStatus,
      newStatus,
      reason,
    };
  }
}
