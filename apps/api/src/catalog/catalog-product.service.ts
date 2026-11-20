import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { CatalogRepository } from './data/catalog.repository.js';
import { ProductRepository } from './data/product.repository.js';
import { OverrideRepository } from './data/override.repository.js';
import { VariantRepository } from './data/variant.repository.js';
import { OptionRepository } from './data/option.repository.js';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto/product.dto.js';

@Injectable()
export class CatalogProductService {
  constructor(
    private readonly catalogRepo: CatalogRepository,
    private readonly productRepo: ProductRepository,
    private readonly overrideRepo: OverrideRepository,
    private readonly variantRepo: VariantRepository,
    private readonly optionRepo: OptionRepository
  ) {}

  async createProduct(userId: string, outletId: string, dto: CreateProductDto): Promise<any> {
    await this.catalogRepo.verifyOutletOwnership(userId, outletId);

    const statusRow = await this.productRepo.getOutletAndMerchantStatus(outletId);
    if (!statusRow) throw new BadRequestException(`Outlet ${outletId} not found`);
    const { outlet_status, merchant_status } = statusRow;
    if (merchant_status !== 'APPROVED' && merchant_status !== 'LIVE') {
      throw new BadRequestException('Unapproved merchants cannot publish catalog products');
    }
    if (outlet_status !== 'ACTIVE') {
      throw new BadRequestException('Inactive or pending outlets cannot publish active products');
    }

    if (dto.basePriceInr < 0) throw new BadRequestException('Product base price must be non-negative');
    if (dto.salePriceInr !== undefined && dto.salePriceInr !== null) {
      if (dto.salePriceInr < 0) throw new BadRequestException('Sale price must be non-negative');
      if (dto.salePriceInr > dto.basePriceInr) {
        throw new BadRequestException(`Sale price (${dto.salePriceInr}) cannot exceed base price (${dto.basePriceInr})`);
      }
    }

    const belongs = await this.productRepo.verifyCategoryBelongsToOutlet(dto.categoryId, outletId);
    if (!belongs) throw new BadRequestException(`Category ${dto.categoryId} does not belong to outlet ${outletId}`);

    const productStatus = dto.productStatus || 'ACTIVE';
    const imagesJson = JSON.stringify(dto.images || (dto.imageUrl ? [dto.imageUrl] : []));
    const dietaryJson = JSON.stringify(dto.dietaryFlags || {});

    const item = await this.productRepo.insertProduct(dto, productStatus, imagesJson, dietaryJson);

    const stockQty = Math.max(0, dto.stockQuantity ?? 50);
    const lowStock = Math.max(0, dto.lowStockThreshold ?? 5);
    await this.overrideRepo.upsertStock(outletId, item.id, stockQty, lowStock);

    return {
      ...item,
      basePriceInr: parseFloat(item.base_price_inr),
      salePriceInr: item.sale_price_inr ? parseFloat(item.sale_price_inr) : null,
      isVeg: Boolean(item.is_veg),
      isPerishable: Boolean(item.is_perishable),
      preparationTimeMinutes: item.preparation_time_minutes,
      stockQuantity: stockQty,
      isInStock: stockQty > 0,
    };
  }

  async getProducts(outletId: string, query: ProductQueryDto = {}, isCustomerView = false): Promise<any> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 50));
    const offset = (page - 1) * limit;

    let baseSql = `
      FROM items i
      JOIN categories c ON c.id = i.category_id
      JOIN catalogs cat ON cat.id = c.catalog_id
      LEFT JOIN inventory inv ON inv.item_id = i.id AND inv.outlet_id = cat.outlet_id
      LEFT JOIN outlet_item_overrides oio ON oio.item_id = i.id AND oio.outlet_id = cat.outlet_id
      WHERE cat.outlet_id = $1 AND i.deleted_at IS NULL
    `;
    const params: any[] = [outletId];

    if (isCustomerView) {
      baseSql += ` AND i.is_active = TRUE AND i.product_status = 'ACTIVE' AND i.admin_status = 'APPROVED'`;
      baseSql += ` AND (oio.is_available IS NULL OR oio.is_available = TRUE)`;
    } else if (query.productStatus) {
      params.push(query.productStatus);
      baseSql += ` AND i.product_status = $${params.length}`;
    }

    if (query.categoryId) {
      params.push(query.categoryId);
      baseSql += ` AND i.category_id = $${params.length}`;
    }
    if (query.isVeg !== undefined) {
      params.push(query.isVeg);
      baseSql += ` AND i.is_veg = $${params.length}`;
    }
    if (query.search && query.search.trim().length > 0) {
      params.push(`%${query.search.trim().toLowerCase()}%`);
      baseSql += ` AND (LOWER(i.name) LIKE $${params.length} OR LOWER(i.description) LIKE $${params.length} OR LOWER(i.sku) LIKE $${params.length})`;
    }
    if (query.minPrice !== undefined) {
      params.push(query.minPrice);
      baseSql += ` AND COALESCE(oio.custom_price_inr, i.sale_price_inr, i.base_price_inr) >= $${params.length}`;
    }
    if (query.maxPrice !== undefined) {
      params.push(query.maxPrice);
      baseSql += ` AND COALESCE(oio.custom_price_inr, i.sale_price_inr, i.base_price_inr) <= $${params.length}`;
    }

    let orderClause = 'ORDER BY i.display_order ASC, i.name ASC';
    if (query.sortBy === 'price_asc') {
      orderClause = 'ORDER BY COALESCE(oio.custom_price_inr, i.sale_price_inr, i.base_price_inr) ASC';
    } else if (query.sortBy === 'price_desc') {
      orderClause = 'ORDER BY COALESCE(oio.custom_price_inr, i.sale_price_inr, i.base_price_inr) DESC';
    } else if (query.sortBy === 'created_at') {
      orderClause = 'ORDER BY i.created_at DESC';
    }

    const total = await this.productRepo.countProducts(baseSql, params);

    const dataParams = [...params, limit, offset];
    const dataSql = `
      SELECT i.*, c.name as category_name,
             inv.stock_quantity, inv.is_in_stock, inv.low_stock_threshold,
             oio.custom_price_inr as outlet_custom_price,
             COALESCE(oio.is_available, TRUE) as outlet_is_available
      ${baseSql}
      ${orderClause}
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length};
    `;
    const rows = await this.productRepo.queryProducts(dataSql, dataParams);

    const items = rows.map((r: any) => ({
      id: r.id, categoryId: r.category_id, categoryName: r.category_name,
      name: r.name, description: r.description, sku: r.sku, barcode: r.barcode,
      basePriceInr: parseFloat(r.base_price_inr),
      salePriceInr: r.sale_price_inr ? parseFloat(r.sale_price_inr) : null,
      effectivePriceInr: r.outlet_custom_price
        ? parseFloat(r.outlet_custom_price)
        : r.sale_price_inr ? parseFloat(r.sale_price_inr) : parseFloat(r.base_price_inr),
      isVeg: r.is_veg, isPerishable: r.is_perishable, preparationTimeMinutes: r.preparation_time_minutes,
      imageUrl: r.image_url, images: typeof r.images === 'string' ? JSON.parse(r.images) : r.images || [],
      hsnSacCode: r.hsn_sac_code, gstRatePercentage: parseFloat(r.gst_rate_percentage || 5.0),
      displayOrder: r.display_order, productStatus: r.product_status, adminStatus: r.admin_status,
      dietaryFlags: typeof r.dietary_flags === 'string' ? JSON.parse(r.dietary_flags) : r.dietary_flags || {},
      stockQuantity: r.stock_quantity ?? 0, isInStock: r.is_in_stock ?? true, outletIsAvailable: r.outlet_is_available,
    }));

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getProductById(productId: string, outletId?: string): Promise<any> {
    const p = await this.productRepo.findProductRaw(productId);
    if (!p) throw new NotFoundException(`Product ${productId} not found`);
    const targetOutletId = outletId || p.outlet_id;

    const [inv, override, rawVariants, rawGroups, rawOptions] = await Promise.all([
      this.overrideRepo.findInventory(productId, targetOutletId),
      this.overrideRepo.findOutletOverride(productId, targetOutletId),
      this.variantRepo.findVariantsByProduct(productId),
      this.optionRepo.findGroupsByProduct(productId),
      this.optionRepo.findOptionsByProduct(productId),
    ]);

    const variants = rawVariants.map((r: any) => ({
      id: r.id, itemId: r.item_id, variantName: r.variant_name,
      additionalPriceInr: parseFloat(r.additional_price_inr),
      salePriceInr: r.sale_price_inr ? parseFloat(r.sale_price_inr) : null,
      sku: r.sku, variantType: r.variant_type, displayOrder: r.display_order,
      isAvailable: Boolean(r.is_available),
    }));

    const optionsByGroup = new Map<string, any[]>();
    for (const opt of rawOptions) {
      const list = optionsByGroup.get(opt.option_group_id) || [];
      list.push({
        id: opt.id, optionGroupId: opt.option_group_id, name: opt.name,
        priceInr: parseFloat(opt.price_inr), isAvailable: Boolean(opt.is_available),
        displayOrder: opt.display_order,
      });
      optionsByGroup.set(opt.option_group_id, list);
    }
    const optionGroups = rawGroups.map((g: any) => ({
      id: g.id, itemId: g.item_id, name: g.name,
      minSelections: g.min_selections, maxSelections: g.max_selections,
      isRequired: Boolean(g.is_required), displayOrder: g.display_order,
      options: optionsByGroup.get(g.id) || [],
    }));
    return {
      id: p.id, outletId: targetOutletId, categoryId: p.category_id,
      categoryName: p.category_name, name: p.name, description: p.description,
      sku: p.sku, barcode: p.barcode, basePriceInr: parseFloat(p.base_price_inr),
      salePriceInr: p.sale_price_inr ? parseFloat(p.sale_price_inr) : null,
      effectivePriceInr: override?.custom_price_inr
        ? parseFloat(override.custom_price_inr)
        : p.sale_price_inr ? parseFloat(p.sale_price_inr) : parseFloat(p.base_price_inr),
      isVeg: p.is_veg, isPerishable: p.is_perishable, preparationTimeMinutes: p.preparation_time_minutes,
      imageUrl: p.image_url, images: typeof p.images === 'string' ? JSON.parse(p.images) : p.images || [],
      hsnSacCode: p.hsn_sac_code, gstRatePercentage: parseFloat(p.gst_rate_percentage || 5.0),
      displayOrder: p.display_order, productStatus: p.product_status, adminStatus: p.admin_status,
      rejectionReason: p.rejection_reason,
      dietaryFlags: typeof p.dietary_flags === 'string' ? JSON.parse(p.dietary_flags) : p.dietary_flags || {},
      stockQuantity: inv?.stock_quantity ?? 0, isInStock: inv?.is_in_stock ?? true,
      outletIsAvailable: override ? Boolean(override.is_available) : true,
      variants, optionGroups,
    };
  }
  async updateProduct(userId: string, productId: string, dto: UpdateProductDto): Promise<any> {
    await this.catalogRepo.verifyProductOwnership(userId, productId);
    const cur = await this.productRepo.findProductBasePrices(productId);
    if (!cur) throw new NotFoundException('Product not found');
    const targetBase = dto.basePriceInr !== undefined ? dto.basePriceInr : parseFloat(cur.base_price_inr);
    const targetSale = dto.salePriceInr !== undefined ? dto.salePriceInr : cur.sale_price_inr ? parseFloat(cur.sale_price_inr) : null;
    if (targetBase < 0) throw new BadRequestException('Base price must be non-negative');
    if (targetSale !== null && targetSale !== undefined) {
      if (targetSale < 0) throw new BadRequestException('Sale price must be non-negative');
      if (targetSale > targetBase) {
        throw new BadRequestException(`Sale price (${targetSale}) cannot exceed base price (${targetBase})`);
      }
    }
    const updates: Record<string, any> = {};
    const fieldMap: Record<string, string> = {
      name: 'name', categoryId: 'category_id', description: 'description',
      basePriceInr: 'base_price_inr', salePriceInr: 'sale_price_inr', sku: 'sku', barcode: 'barcode',
      isVeg: 'is_veg', isPerishable: 'is_perishable', preparationTimeMinutes: 'preparation_time_minutes',
      imageUrl: 'image_url', hsnSacCode: 'hsn_sac_code', gstRatePercentage: 'gst_rate_percentage',
      displayOrder: 'display_order', productStatus: 'product_status', isActive: 'is_active',
    };
    for (const [key, col] of Object.entries(fieldMap)) {
      if ((dto as any)[key] !== undefined) updates[col] = (dto as any)[key];
    }
    if (dto.name !== undefined) updates['name'] = dto.name.trim();
    if (dto.images !== undefined) updates['images'] = JSON.stringify(dto.images);
    if (dto.dietaryFlags !== undefined) updates['dietary_flags'] = JSON.stringify(dto.dietaryFlags);
    return this.productRepo.updateProduct(productId, updates);
  }
  async archiveProduct(userId: string, productId: string): Promise<any> {
    await this.catalogRepo.verifyProductOwnership(userId, productId);
    return this.productRepo.archiveProduct(productId);
  }
  async deleteProduct(userId: string, productId: string): Promise<{ success: boolean }> {
    await this.catalogRepo.verifyProductOwnership(userId, productId);
    await this.productRepo.softDeleteProduct(productId);
    return { success: true };
  }
}