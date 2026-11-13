import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { MerchantRepository } from './data/merchant.repository.js';
import { MerchantOutletRepository } from './data/merchant-outlet.repository.js';
import { MerchantDocumentRepository } from './data/merchant-document.repository.js';
import { MerchantDocumentService } from './merchant-document.service.js';

@Injectable()
export class AdminMerchantService {
  constructor(
    private readonly merchantRepo: MerchantRepository,
    private readonly outletRepo: MerchantOutletRepository,
    private readonly docRepo: MerchantDocumentRepository,
    private readonly docService: MerchantDocumentService
  ) {}

  async listAdminMerchantApplications(options: { status?: string; page?: number; limit?: number } = {}): Promise<any> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    return this.merchantRepo.listAdminMerchants(limit, offset, options.status);
  }

  async getAdminMerchantApplication(
    merchantId: string,
    inMemoryOutlets?: Map<string, any[]>,
    inMemoryDocs?: Map<string, any>
  ): Promise<any> {
    const base = await this.merchantRepo.findAdminMerchantById(merchantId);
    if (!base) {
      throw new NotFoundException(`Merchant ${merchantId} not found`);
    }

    const outlets = (inMemoryOutlets && inMemoryOutlets.get(merchantId)) || [];
    let documents: any[] = [];
    try {
      documents = await this.docService.getMerchantDocuments(merchantId, inMemoryDocs);
    } catch (_) {}

    return {
      ...base,
      outlets: outlets.length > 0 ? outlets : (base.outlet_id ? [{
        id: base.outlet_id,
        outlet_name: base.outlet_name,
        address_line1: base.address_line1,
        address_line2: base.address_line2,
        postal_code: base.postal_code,
        outlet_status: base.outlet_status || 'ACTIVE',
        is_open: base.is_open,
      }] : []),
      documents,
    };
  }

  async updateAdminMerchantStatus(merchantId: string, status: string, notes?: string): Promise<any> {
    const validStatuses = ['APPROVED', 'REJECTED', 'UNDER_REVIEW', 'DOCUMENTS_REQUIRED', 'LIVE', 'SUSPENDED'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid status ${status}. Valid: ${validStatuses.join(', ')}`);
    }

    const dbStatus = status;
    const auditNotes = status === 'DOCUMENTS_REQUIRED'
      ? `DOCUMENTS_REQUIRED: ${notes || 'Additional regulatory documents required'}`
      : (notes || `Status updated to ${status} by Platform Administrator`);

    const merchant = await this.merchantRepo.updateMerchantStatus(merchantId, dbStatus);
    if (!merchant) {
      throw new NotFoundException(`Merchant ${merchantId} not found`);
    }

    if (dbStatus === 'APPROVED' || dbStatus === 'LIVE') {
      await this.outletRepo.setOutletsOpenByMerchantId(merchantId, true, true);
    } else if (dbStatus === 'SUSPENDED' || dbStatus === 'REJECTED') {
      await this.outletRepo.setOutletsOpenByMerchantId(merchantId, false, false);
    }

    return {
      merchant: {
        ...merchant,
        status: status,
      },
      notes: auditNotes,
    };
  }

  async updateAdminOutletStatus(
    outletId: string,
    adminUserId: string,
    newStatus: string,
    reason?: string,
    inMemoryOutlets?: Map<string, any[]>
  ): Promise<any> {
    const validStatuses = ['PENDING_APPROVAL', 'ACTIVE', 'PAUSED', 'SUSPENDED', 'REJECTED', 'BLOCKED'];
    if (!validStatuses.includes(newStatus)) {
      throw new BadRequestException(`Invalid outlet status: ${newStatus}`);
    }

    const isOpen = newStatus === 'ACTIVE';

    await this.outletRepo.updateAdminOutletStatus(outletId, newStatus, isOpen);
    try {
      await this.merchantRepo.recordAuditLog(
        adminUserId,
        'ADMIN_OUTLET_STATUS_CHANGE',
        'outlet',
        outletId,
        JSON.stringify({ outlet_status: newStatus, is_open: isOpen }),
        reason || null
      );
    } catch {
      // offline
    }

    if (inMemoryOutlets) {
      for (const outlets of inMemoryOutlets.values()) {
        const o = outlets.find((x: any) => x.id === outletId);
        if (o) {
          o.outlet_status = newStatus;
          o.is_open = isOpen;
          break;
        }
      }
    }

    return {
      outletId,
      outletStatus: newStatus,
      isOpen,
      reason,
    };
  }
}
