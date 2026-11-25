import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MerchantCatalogDataRepository } from './data/merchant-catalog-data.repository.js';
import { MerchantOutletRepository } from './data/merchant-outlet.repository.js';
import { MerchantRepository } from './data/merchant.repository.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateInventoryDto } from './dto/update-inventory.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';

@Injectable()
export class MerchantProductService {
  constructor(
    private readonly merchantRepo: MerchantRepository,
    private readonly outletRepo: MerchantOutletRepository,
    private readonly catDataRepo: MerchantCatalogDataRepository,
  ) {}

  async getCategories(userId: string): Promise<any[]> {
    const merchant = await this.merchantRepo.findMerchantByOwnerId(userId);
    if (!merchant) throw new ForbiddenException('Merchant account required');
    const outlet = await this.outletRepo.findPrimaryOutlet(merchant.id);
    if (!outlet) return [];

    return this.catDataRepo.findCategories(outlet.id);
  }

  async getProducts(userId: string, categoryId?: string, search?: string): Promise<any[]> {
    const merchant = await this.merchantRepo.findMerchantByOwnerId(userId);
    if (!merchant) throw new ForbiddenException('Merchant account required');
    const outlet = await this.outletRepo.findPrimaryOutlet(merchant.id);
    if (!outlet) return [];

    const rows = await this.catDataRepo.listProducts(outlet.id, categoryId, search);
    return rows.map((r: any) => ({
      id: r.id,
      categoryId: r.category_id,
      categoryName: r.category_name,
      name: r.name,
      description: r.description,
      basePriceInr: Number.parseFloat(r.base_price_inr),
      isVeg: r.is_veg,
      isPerishable: r.is_perishable,
      preparationTimeMinutes: r.preparation_time_minutes,
      imageUrl: r.image_url,
      stockQuantity: r.stock_quantity ?? 0,
      isInStock: r.is_in_stock ?? true,
      lowStockThreshold: r.low_stock_threshold ?? 5,
    }));
  }

  async createProduct(userId: string, dto: CreateProductDto): Promise<any> {
    const merchant = await this.merchantRepo.findMerchantByOwnerId(userId);
    if (!merchant) throw new ForbiddenException('Merchant account required');
    const outlet = await this.outletRepo.findPrimaryOutlet(merchant.id);
    if (!outlet) throw new NotFoundException('Outlet not found');

    const catalogId = await this.catDataRepo.findOrCreateCatalog(
      outlet.id,
      outlet.outlet_name,
      'FOOD',
    );
    const categoryId = await this.catDataRepo.findOrCreateCategory(catalogId, dto.categoryName);
    const item = await this.catDataRepo.insertItem(categoryId, dto);
    await this.catDataRepo.upsertInventory(
      outlet.id,
      item.id,
      dto.stockQuantity,
      dto.stockQuantity > 0,
    );

    return {
      ...item,
      basePriceInr: Number.parseFloat(item.base_price_inr),
      stockQuantity: dto.stockQuantity,
      isInStock: dto.stockQuantity > 0,
    };
  }

  async updateProduct(userId: string, productId: string, dto: UpdateProductDto): Promise<any> {
    const merchant = await this.merchantRepo.findMerchantByOwnerId(userId);
    if (!merchant) throw new ForbiddenException('Merchant account required');
    const outlet = await this.outletRepo.findPrimaryOutlet(merchant.id);
    if (!outlet) throw new NotFoundException('Outlet not found');

    const belongs = await this.catDataRepo.checkProductBelongsToOutlet(productId, outlet.id);
    if (!belongs) {
      throw new NotFoundException('Product not found or cross-merchant access forbidden');
    }

    const updates: Record<string, any> = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.basePriceInr !== undefined) updates.base_price_inr = dto.basePriceInr;
    if (dto.isVeg !== undefined) updates.is_veg = dto.isVeg;
    if (dto.isActive !== undefined) updates.is_active = dto.isActive;

    const item = await this.catDataRepo.updateItem(productId, updates);
    return {
      ...item,
      basePriceInr: Number.parseFloat(item.base_price_inr),
    };
  }

  async deleteProduct(userId: string, productId: string): Promise<{ success: boolean }> {
    const merchant = await this.merchantRepo.findMerchantByOwnerId(userId);
    if (!merchant) throw new ForbiddenException('Merchant account required');
    const outlet = await this.outletRepo.findPrimaryOutlet(merchant.id);
    if (!outlet) throw new NotFoundException('Outlet not found');

    const belongs = await this.catDataRepo.checkProductBelongsToOutlet(productId, outlet.id);
    if (!belongs) {
      throw new NotFoundException('Product not found or cross-merchant access forbidden');
    }

    await this.catDataRepo.softDeleteItem(productId);
    return { success: true };
  }

  async updateInventory(userId: string, itemId: string, dto: UpdateInventoryDto): Promise<any> {
    const merchant = await this.merchantRepo.findMerchantByOwnerId(userId);
    if (!merchant) throw new ForbiddenException('Merchant account required');
    const outlet = await this.outletRepo.findPrimaryOutlet(merchant.id);
    if (!outlet) throw new NotFoundException('Outlet not found');

    if (dto.stockQuantity !== undefined && dto.stockQuantity < 0) {
      throw new BadRequestException('Stock quantity cannot be negative');
    }

    const updates: Record<string, any> = {};
    if (dto.stockQuantity !== undefined) {
      updates.stock_quantity = dto.stockQuantity;
      if (dto.isInStock === undefined) {
        updates.is_in_stock = dto.stockQuantity > 0;
      }
    }
    if (dto.isInStock !== undefined) {
      updates.is_in_stock = dto.isInStock;
    }
    if (dto.lowStockThreshold !== undefined) {
      updates.low_stock_threshold = dto.lowStockThreshold;
    }

    return this.catDataRepo.updateInventoryFields(outlet.id, itemId, updates);
  }
}
