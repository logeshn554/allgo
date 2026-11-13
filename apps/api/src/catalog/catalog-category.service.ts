import { Injectable } from '@nestjs/common';
import { CatalogRepository } from './data/catalog.repository.js';
import { CategoryRepository } from './data/category.repository.js';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto.js';

@Injectable()
export class CatalogCategoryService {
  constructor(
    private readonly catalogRepo: CatalogRepository,
    private readonly categoryRepo: CategoryRepository
  ) {}

  async createCategory(userId: string, outletId: string, dto: CreateCategoryDto): Promise<any> {
    await this.catalogRepo.verifyOutletOwnership(userId, outletId);
    let catalogId = await this.catalogRepo.findCatalogByOutletId(outletId);
    if (!catalogId) {
      const { outletName, merchantType } = await this.catalogRepo.getOutletMerchantType(outletId);
      const vertical = merchantType === 'GROCERY_STORE' || merchantType === 'DARK_STORE' ? 'GROCERY' : 'FOOD';
      const name = `${outletName} Catalog`;
      catalogId = await this.catalogRepo.createCatalog(outletId, name, vertical);
    }

    return this.categoryRepo.insertCategory(catalogId, dto);
  }

  async getCategories(outletId: string, includeInactive = false): Promise<any[]> {
    return this.categoryRepo.findCategoriesByOutlet(outletId, includeInactive);
  }

  async updateCategory(userId: string, categoryId: string, dto: UpdateCategoryDto): Promise<any> {
    await this.categoryRepo.verifyCategoryOwnership(categoryId, userId);

    const updates: Record<string, any> = {};
    if (dto.name !== undefined) updates['name'] = dto.name.trim();
    if (dto.parentId !== undefined) updates['parent_id'] = dto.parentId || null;
    if (dto.displayOrder !== undefined) updates['display_order'] = dto.displayOrder;
    if (dto.imageUrl !== undefined) updates['image_url'] = dto.imageUrl || null;
    if (dto.description !== undefined) updates['description'] = dto.description || null;
    if (dto.isActive !== undefined) updates['is_active'] = dto.isActive;

    return this.categoryRepo.updateCategory(categoryId, updates);
  }

  async deleteCategory(userId: string, categoryId: string): Promise<{ success: boolean }> {
    await this.categoryRepo.verifyCategoryOwnership(categoryId, userId);
    await this.categoryRepo.softDeleteCategory(categoryId);
    return { success: true };
  }
}
