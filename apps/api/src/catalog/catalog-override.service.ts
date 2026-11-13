import { Injectable, BadRequestException } from '@nestjs/common';
import { CatalogRepository } from './data/catalog.repository.js';
import { OverrideRepository } from './data/override.repository.js';
import { SetOutletOverrideDto, BulkAssignOutletsDto, UpdateStockDto } from './dto/outlet-override.dto.js';

@Injectable()
export class CatalogOverrideService {
  constructor(
    private readonly catalogRepo: CatalogRepository,
    private readonly overrideRepo: OverrideRepository
  ) {}

  async setOutletOverride(userId: string, outletId: string, productId: string, dto: SetOutletOverrideDto): Promise<any> {
    await this.catalogRepo.verifyOutletOwnership(userId, outletId);

    if (dto.customPriceInr !== undefined && dto.customPriceInr !== null && dto.customPriceInr < 0) {
      throw new BadRequestException('Custom price must be non-negative');
    }

    return this.overrideRepo.upsertOverride(outletId, productId, dto.customPriceInr ?? null, dto.isAvailable ?? true);
  }

  async getOutletOverrides(outletId: string): Promise<any[]> {
    const rows = await this.overrideRepo.findOverridesByOutlet(outletId);
    return rows.map((r: any) => ({
      id: r.id,
      outletId: r.outlet_id,
      itemId: r.item_id,
      productName: r.product_name,
      basePriceInr: parseFloat(r.base_price_inr),
      customPriceInr: r.custom_price_inr ? parseFloat(r.custom_price_inr) : null,
      isAvailable: Boolean(r.is_available),
    }));
  }

  async removeOutletOverride(userId: string, outletId: string, productId: string): Promise<{ success: boolean }> {
    await this.catalogRepo.verifyOutletOwnership(userId, outletId);
    await this.overrideRepo.deleteOverride(outletId, productId);
    return { success: true };
  }

  async bulkAssignOutlets(userId: string, productId: string, dto: BulkAssignOutletsDto): Promise<any[]> {
    await this.catalogRepo.verifyProductOwnership(userId, productId);

    if (dto.customPriceInr !== undefined && dto.customPriceInr !== null && dto.customPriceInr < 0) {
      throw new BadRequestException('Custom price must be non-negative');
    }

    for (const outId of dto.outletIds) {
      await this.catalogRepo.verifyOutletOwnership(userId, outId);
    }

    const results: any[] = [];
    for (const outId of dto.outletIds) {
      const row = await this.overrideRepo.upsertOverride(outId, productId, dto.customPriceInr ?? null, dto.isAvailable ?? true);
      results.push(row);
    }
    return results;
  }

  async updateStock(userId: string, outletId: string, productId: string, dto: UpdateStockDto): Promise<any> {
    await this.catalogRepo.verifyOutletOwnership(userId, outletId);

    if (dto.stockQuantity < 0) {
      throw new BadRequestException('Stock quantity cannot be negative');
    }

    const lowStock = dto.lowStockThreshold ?? 5;
    const row = await this.overrideRepo.upsertStock(outletId, productId, dto.stockQuantity, lowStock);
    await this.overrideRepo.recordStockAudit(productId, userId, outletId, dto.stockQuantity);
    return row;
  }

  async getStockHistory(userId: string, outletId: string, productId: string): Promise<any[]> {
    await this.catalogRepo.verifyOutletOwnership(userId, outletId);
    const rows = await this.overrideRepo.findStockHistory(productId);
    return rows.map((r: any) => ({
      id: r.id,
      productId: r.entity_id,
      actorId: r.actor_id,
      action: r.action,
      details: typeof r.new_state === 'string' ? JSON.parse(r.new_state) : r.new_state,
      reason: r.reason,
      createdAt: r.created_at,
    }));
  }
}
