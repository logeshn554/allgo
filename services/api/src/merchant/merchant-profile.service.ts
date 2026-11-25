import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { MerchantCatalogDataRepository } from './data/merchant-catalog-data.repository.js';
import { MerchantOutletRepository } from './data/merchant-outlet.repository.js';
import { MerchantRepository } from './data/merchant.repository.js';
import { RegisterMerchantDto } from './dto/register-merchant.dto.js';

@Injectable()
export class MerchantProfileService {
  constructor(
    private readonly merchantRepo: MerchantRepository,
    private readonly outletRepo: MerchantOutletRepository,
    private readonly catalogDataRepo: MerchantCatalogDataRepository,
  ) {}

  async getMerchantByOwnerId(userId: string): Promise<any> {
    return this.merchantRepo.findMerchantByOwnerId(userId);
  }

  async getPrimaryOutlet(merchantId: string): Promise<any> {
    return this.outletRepo.findPrimaryOutlet(merchantId);
  }

  async registerOrUpdate(
    userId: string,
    dto: RegisterMerchantDto,
    inMemoryOutlets?: Map<string, any[]>,
  ): Promise<any> {
    try {
      const user = await this.merchantRepo.findUserById(userId);
      if (!user) {
        throw new NotFoundException('User identity not found');
      }

      const zoneId = await this.merchantRepo.findActiveZoneId();
      const existingMerchant = await this.getMerchantByOwnerId(userId);
      let merchant: any;

      if (existingMerchant) {
        if (existingMerchant.status === 'SUSPENDED') {
          throw new ForbiddenException(
            'Merchant account is suspended by platform administration. Re-registration prohibited.',
          );
        }

        const newStatus = ['APPROVED', 'LIVE', 'ACTIVE'].includes(existingMerchant.status)
          ? existingMerchant.status
          : 'SUBMITTED';

        merchant = await this.merchantRepo.updateMerchant(existingMerchant.id, dto, newStatus);
      } else {
        merchant = await this.merchantRepo.insertMerchant(userId, dto);
      }

      await this.merchantRepo.ensureMerchantAdminRole(userId);

      const existingOutlet = await this.getPrimaryOutlet(merchant.id);
      let outlet: any;

      if (existingOutlet) {
        outlet = await this.outletRepo.updateOutlet(existingOutlet.id, dto);
      } else {
        outlet = await this.outletRepo.insertOutlet(merchant.id, zoneId, dto);
      }

      if (inMemoryOutlets) {
        inMemoryOutlets.set(merchant.id, [outlet]);
      }

      const vertical =
        dto.merchantType === 'GROCERY_STORE' || dto.merchantType === 'DARK_STORE'
          ? 'GROCERY'
          : 'FOOD';
      await this.catalogDataRepo.findOrCreateCatalog(outlet.id, dto.outletName, vertical);

      return {
        merchant,
        outlet,
        status: merchant.status,
      };
    } catch (err: any) {
      if (
        err instanceof NotFoundException ||
        err instanceof BadRequestException ||
        err instanceof ForbiddenException
      )
        throw err;
      throw new ServiceUnavailableException(`Failed to register merchant: ${err?.message || err}`);
    }
  }

  async getProfile(userId: string): Promise<any> {
    const merchant = await this.getMerchantByOwnerId(userId);
    if (!merchant) {
      return { status: 'NOT_REGISTERED', merchant: null, outlet: null };
    }
    const outlet = await this.getPrimaryOutlet(merchant.id);
    return {
      status: merchant.status,
      merchant,
      outlet,
    };
  }

  async submitForReview(userId: string): Promise<any> {
    const merchant = await this.getMerchantByOwnerId(userId);
    if (!merchant) {
      throw new NotFoundException('Merchant profile not found');
    }

    if (merchant.status === 'BLOCKED') {
      throw new ForbiddenException('Blocked merchant cannot submit for review');
    }

    merchant.status = 'SUBMITTED';
    merchant.updated_at = new Date();

    try {
      await this.merchantRepo.setMerchantStatusSubmitted(merchant.id);
      await this.merchantRepo.recordAuditLog(
        userId,
        'MERCHANT_SUBMITTED_FOR_REVIEW',
        'merchant',
        merchant.id,
        JSON.stringify({ status: 'SUBMITTED' }),
        'Submitted onboarding dossier',
      );
    } catch {
      // offline
    }

    return {
      merchantId: merchant.id,
      status: 'SUBMITTED',
      message: 'Merchant application submitted for administrative review',
    };
  }
}
