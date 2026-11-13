import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UpdateOutletStatusDto } from './dto/update-outlet-status.dto.js';
import { CreateOutletDto } from './dto/create-outlet.dto.js';
import { MerchantRepository } from './data/merchant.repository.js';
import { MerchantOutletRepository } from './data/merchant-outlet.repository.js';

@Injectable()
export class MerchantOutletService {
  constructor(
    private readonly merchantRepo: MerchantRepository,
    private readonly outletRepo: MerchantOutletRepository
  ) {}

  async updateOutletStatus(userId: string, outletId: string, dto: UpdateOutletStatusDto): Promise<any> {
    const merchant = await this.merchantRepo.findMerchantByOwnerId(userId);
    if (!merchant) {
      throw new ForbiddenException('Merchant account required');
    }

    if (!['APPROVED', 'LIVE', 'ACTIVE'].includes(merchant.status)) {
      throw new ForbiddenException(
        `Outlet operations locked. Administrative approval required (current status: ${merchant.status})`
      );
    }

    const outlet = await this.outletRepo.findOutletById(outletId);
    if (!outlet) {
      throw new NotFoundException('Outlet not found');
    }
    if (outlet.merchant_id !== merchant.id) {
      throw new ForbiddenException('Cross-merchant outlet access rejected');
    }

    return this.outletRepo.updateOutletAvailability(outletId, dto.isOpen, dto.defaultPrepTimeMinutes);
  }

  async createOutlet(userId: string, dto: CreateOutletDto, inMemoryOutlets?: Map<string, any[]>): Promise<any> {
    const merchant = await this.merchantRepo.findMerchantByOwnerId(userId);
    if (!merchant) {
      throw new NotFoundException('Merchant business profile must be registered before creating outlets');
    }

    if (['SUSPENDED', 'BLOCKED'].includes(merchant.status)) {
      throw new ForbiddenException(`Merchant account is ${merchant.status}. Outlet creation prohibited.`);
    }

    const zoneId = await this.merchantRepo.findActiveZoneId();
    const outletId = crypto.randomUUID();
    const outletData = {
      id: outletId,
      merchant_id: merchant.id,
      zone_id: zoneId,
      outlet_name: dto.outletName.trim(),
      address_line1: dto.addressLine1.trim(),
      address_line2: dto.addressLine2 ? dto.addressLine2.trim() : null,
      postal_code: dto.postalCode.trim(),
      latitude: dto.latitude,
      longitude: dto.longitude,
      phone: dto.phone.trim(),
      is_open: false,
      outlet_status: 'PENDING_APPROVAL',
      default_prep_time_minutes: dto.defaultPrepTimeMinutes || 15,
      packaging_fee_inr: dto.packagingFeeInr || 10.0,
      created_at: new Date(),
    };

    await this.outletRepo.insertBranchOutlet(outletId, merchant.id, zoneId, dto);

    if (inMemoryOutlets) {
      const outlets = inMemoryOutlets.get(merchant.id) || [];
      outlets.push(outletData);
      inMemoryOutlets.set(merchant.id, outlets);
    }

    return outletData;
  }

  async getOutlets(userId: string, inMemoryOutlets?: Map<string, any[]>): Promise<any[]> {
    const merchant = await this.merchantRepo.findMerchantByOwnerId(userId);
    if (!merchant) {
      throw new NotFoundException('Merchant profile not found');
    }

    if (inMemoryOutlets) {
      const inMem = inMemoryOutlets.get(merchant.id);
      if (inMem && inMem.length > 0) {
        return inMem;
      }
    }

    return this.outletRepo.listOutletsByMerchantId(merchant.id);
  }
}
