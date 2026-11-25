import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { PartnerContinuityService } from '../mobility/partner-continuity.service.js';
import { ParcelEventRepository } from './data/parcel-event.repository.js';
import { ParcelRepository } from './data/parcel.repository.js';
import { ReassignParcelDto } from './dto/parcel.dto.js';
import { ParcelDispatchService } from './parcel-dispatch.service.js';

@Injectable()
export class AdminParcelService {
  constructor(
    private readonly db: DatabaseService,
    private readonly parcelRepo: ParcelRepository,
    private readonly eventRepo: ParcelEventRepository,
    private readonly dispatchService: ParcelDispatchService,
    private readonly continuityService: PartnerContinuityService,
  ) {}

  async adminListParcels(filters: any): Promise<any> {
    return this.parcelRepo.adminList(filters);
  }

  async adminReassign(adminUserId: string, parcelId: string, dto: ReassignParcelDto): Promise<any> {
    const parcel = await this.parcelRepo.findByIdWithDetails(parcelId);

    const oldPartnerId = parcel.partner_id;
    const targetPartnerId = dto.partnerId;

    if (targetPartnerId) {
      const el = await this.dispatchService.checkPartnerEligibility(targetPartnerId);
      if (!el.isEligible) {
        throw new BadRequestException(`Selected partner is not eligible: ${el.reason}`);
      }
    }

    await this.db.transaction(async (client) => {
      await this.parcelRepo.updateParcelStatus(
        parcelId,
        targetPartnerId ? 'PARTNER_ASSIGNED' : 'SEARCHING_FOR_PARTNER',
        { partner_id: targetPartnerId || null },
        client,
      );

      await this.eventRepo.recordEvent(
        {
          parcelId,
          eventType: 'PARTNER_REASSIGNED',
          fromStatus: parcel.status,
          toStatus: targetPartnerId ? 'PARTNER_ASSIGNED' : 'SEARCHING_FOR_PARTNER',
          actorId: adminUserId,
          actorRole: 'ADMIN',
          reason: dto.reason,
          metadata: { previousPartnerId: oldPartnerId, newPartnerId: targetPartnerId },
        },
        client,
      );
    });

    if (oldPartnerId) {
      await this.continuityService.releaseVerticalLock(oldPartnerId);
    }
    if (targetPartnerId) {
      await this.continuityService.acquireVerticalLock(targetPartnerId, 'PARCEL');
    }

    if (!targetPartnerId) {
      setImmediate(async () => {
        try {
          await this.dispatchService.requestDispatch(parcelId);
        } catch (_) {}
      });
    }

    return this.parcelRepo.findByIdWithDetails(parcelId);
  }

  async adminStats(): Promise<any> {
    return this.parcelRepo.adminStats();
  }
}
