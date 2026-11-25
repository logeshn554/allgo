import { BadRequestException, Injectable } from '@nestjs/common';
import { CatalogRepository } from './data/catalog.repository.js';
import { VariantRepository } from './data/variant.repository.js';
import { CreateVariantDto, UpdateVariantDto } from './dto/variant.dto.js';

@Injectable()
export class CatalogVariantService {
  constructor(
    private readonly catalogRepo: CatalogRepository,
    private readonly variantRepo: VariantRepository,
  ) {}

  async createVariant(userId: string, productId: string, dto: CreateVariantDto): Promise<any> {
    await this.catalogRepo.verifyProductOwnership(userId, productId);

    if (dto.additionalPriceInr < 0) {
      throw new BadRequestException('Variant additional price must be non-negative');
    }

    const row = await this.variantRepo.insertVariant(productId, dto);
    return {
      ...row,
      additionalPriceInr: Number.parseFloat(row.additional_price_inr),
    };
  }

  async getVariants(productId: string): Promise<any[]> {
    const rows = await this.variantRepo.findVariantsByProduct(productId);
    return rows.map((r: any) => ({
      id: r.id,
      itemId: r.item_id,
      variantName: r.variant_name,
      additionalPriceInr: Number.parseFloat(r.additional_price_inr),
      salePriceInr: r.sale_price_inr ? Number.parseFloat(r.sale_price_inr) : null,
      sku: r.sku,
      variantType: r.variant_type,
      displayOrder: r.display_order,
      isAvailable: Boolean(r.is_available),
    }));
  }

  async updateVariant(userId: string, variantId: string, dto: UpdateVariantDto): Promise<any> {
    const itemId = await this.variantRepo.findVariantItemId(variantId);
    await this.catalogRepo.verifyProductOwnership(userId, itemId);

    const updates: Record<string, any> = {};
    if (dto.variantName !== undefined) updates['variant_name'] = dto.variantName.trim();
    if (dto.additionalPriceInr !== undefined) {
      if (dto.additionalPriceInr < 0)
        throw new BadRequestException('Additional price cannot be negative');
      updates['additional_price_inr'] = dto.additionalPriceInr;
    }
    if (dto.salePriceInr !== undefined) updates['sale_price_inr'] = dto.salePriceInr || null;
    if (dto.sku !== undefined) updates['sku'] = dto.sku || null;
    if (dto.variantType !== undefined) updates['variant_type'] = dto.variantType;
    if (dto.displayOrder !== undefined) updates['display_order'] = dto.displayOrder;
    if (dto.isAvailable !== undefined) updates['is_available'] = dto.isAvailable;

    const row = await this.variantRepo.updateVariant(variantId, updates);
    return {
      ...row,
      additionalPriceInr: row.additional_price_inr
        ? Number.parseFloat(row.additional_price_inr)
        : undefined,
    };
  }

  async deleteVariant(userId: string, variantId: string): Promise<{ success: boolean }> {
    const itemId = await this.variantRepo.findVariantItemId(variantId);
    await this.catalogRepo.verifyProductOwnership(userId, itemId);
    await this.variantRepo.softDeleteVariant(variantId);
    return { success: true };
  }
}
