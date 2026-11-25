import { BadRequestException, Injectable } from '@nestjs/common';
import { CatalogRepository } from './data/catalog.repository.js';
import { CategoryRepository } from './data/category.repository.js';
import { ProductRepository } from './data/product.repository.js';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto.js';
import { ModerateProductDto } from './dto/product.dto.js';

@Injectable()
export class AdminCatalogService {
  constructor(
    private readonly catalogRepo: CatalogRepository,
    private readonly productRepo: ProductRepository,
    private readonly categoryRepo: CategoryRepository,
  ) {}

  async moderateProduct(adminId: string, productId: string, dto: ModerateProductDto): Promise<any> {
    if (
      dto.adminStatus === 'REJECTED' &&
      (!dto.rejectionReason || dto.rejectionReason.trim().length === 0)
    ) {
      throw new BadRequestException('Rejection reason is required when rejecting a product');
    }

    const isActive = dto.adminStatus === 'APPROVED';
    const row = await this.productRepo.moderateProduct(
      productId,
      dto.adminStatus,
      dto.rejectionReason,
      isActive,
    );

    await this.productRepo.recordProductAuditLog(
      productId,
      adminId,
      `PRODUCT_${dto.adminStatus}`,
      JSON.stringify({ adminStatus: dto.adminStatus }),
      dto.rejectionReason || `Product ${dto.adminStatus} by administrator`,
    );

    return row;
  }

  async getAdminProducts(status?: string, page = 1, limit = 50): Promise<any> {
    const offset = (page - 1) * limit;
    let baseSql = `
      FROM items i
      JOIN categories c ON c.id = i.category_id
      JOIN catalogs cat ON cat.id = c.catalog_id
      JOIN outlets o ON o.id = cat.outlet_id
      JOIN merchants m ON m.id = o.merchant_id
      WHERE i.deleted_at IS NULL
    `;
    const params: any[] = [];
    if (status) {
      params.push(status);
      baseSql += ` AND i.admin_status = $${params.length}`;
    }

    const total = await this.productRepo.countProducts(baseSql, params);

    const dataParams = [...params, limit, offset];
    const dataSql = `
      SELECT i.*, c.name as category_name, o.outlet_name, m.business_name
      ${baseSql}
      ORDER BY i.created_at DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length};
    `;
    const items = await this.productRepo.queryProducts(dataSql, dataParams);

    return { items, total, page, limit };
  }

  async getAdminCategories(verticalType?: string): Promise<any[]> {
    return this.categoryRepo.findAdminCategories(verticalType);
  }

  async createAdminCategory(
    adminId: string,
    dto: CreateCategoryDto & { catalogId?: string },
  ): Promise<any> {
    let catalogId = dto.catalogId;
    if (!catalogId) {
      catalogId = (await this.catalogRepo.findFirstCatalogId()) ?? undefined;
      if (!catalogId) throw new BadRequestException('No catalogs exist');
    }

    const row = await this.categoryRepo.insertAdminCategory(catalogId, dto);
    await this.categoryRepo.recordCategoryAuditLog(
      row.id,
      adminId,
      'CREATE_CATEGORY',
      JSON.stringify({ name: dto.name }),
      'Administrator created platform category',
    );
    return row;
  }

  async updateAdminCategory(
    adminId: string,
    categoryId: string,
    dto: UpdateCategoryDto,
  ): Promise<any> {
    const updates: Record<string, any> = {};
    if (dto.name !== undefined) updates['name'] = dto.name.trim();
    if (dto.parentId !== undefined) updates['parent_id'] = dto.parentId || null;
    if (dto.displayOrder !== undefined) updates['display_order'] = dto.displayOrder;
    if (dto.imageUrl !== undefined) updates['image_url'] = dto.imageUrl || null;
    if (dto.description !== undefined) updates['description'] = dto.description || null;
    if (dto.isActive !== undefined) updates['is_active'] = dto.isActive;

    const row = await this.categoryRepo.updateAdminCategory(categoryId, updates);
    await this.categoryRepo.recordCategoryAuditLog(
      categoryId,
      adminId,
      'UPDATE_CATEGORY',
      JSON.stringify(dto),
      'Administrator updated platform category',
    );
    return row;
  }

  async deleteAdminCategory(adminId: string, categoryId: string): Promise<{ success: boolean }> {
    await this.categoryRepo.deactivateAdminCategory(categoryId);
    await this.categoryRepo.recordCategoryAuditLog(
      categoryId,
      adminId,
      'DEACTIVATE_CATEGORY',
      '{}',
      'Administrator archived platform category',
    );
    return { success: true };
  }
}
