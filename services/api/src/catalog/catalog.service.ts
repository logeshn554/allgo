import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { AdminCatalogService } from './admin-catalog.service.js';
import { CatalogCategoryService } from './catalog-category.service.js';
import { CatalogOptionService } from './catalog-option.service.js';
import { CatalogOverrideService } from './catalog-override.service.js';
import { CatalogProductService } from './catalog-product.service.js';
import { CatalogVariantService } from './catalog-variant.service.js';
import { CatalogRepository } from './data/catalog.repository.js';
import { CategoryRepository } from './data/category.repository.js';
import { OptionRepository } from './data/option.repository.js';
import { OverrideRepository } from './data/override.repository.js';
import { ProductRepository } from './data/product.repository.js';
import { VariantRepository } from './data/variant.repository.js';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto.js';
import {
  CreateOptionDto,
  CreateOptionGroupDto,
  UpdateOptionDto,
  UpdateOptionGroupDto,
} from './dto/option-group.dto.js';
import {
  BulkAssignOutletsDto,
  SetOutletOverrideDto,
  UpdateStockDto,
} from './dto/outlet-override.dto.js';
import {
  CreateProductDto,
  ModerateProductDto,
  ProductQueryDto,
  UpdateProductDto,
} from './dto/product.dto.js';
import { CreateVariantDto, UpdateVariantDto } from './dto/variant.dto.js';

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);
  private readonly catalogRepo: CatalogRepository;
  private readonly categoryService: CatalogCategoryService;
  private readonly productService: CatalogProductService;
  private readonly variantService: CatalogVariantService;
  private readonly optionService: CatalogOptionService;
  private readonly overrideService: CatalogOverrideService;
  private readonly adminCatalogService: AdminCatalogService;

  constructor(
    private readonly db: DatabaseService,
    categoryService?: CatalogCategoryService,
    productService?: CatalogProductService,
    variantService?: CatalogVariantService,
    optionService?: CatalogOptionService,
    overrideService?: CatalogOverrideService,
    adminCatalogService?: AdminCatalogService,
    catalogRepo?: CatalogRepository,
  ) {
    if (
      categoryService &&
      productService &&
      variantService &&
      optionService &&
      overrideService &&
      adminCatalogService &&
      catalogRepo
    ) {
      this.catalogRepo = catalogRepo;
      this.categoryService = categoryService;
      this.productService = productService;
      this.variantService = variantService;
      this.optionService = optionService;
      this.overrideService = overrideService;
      this.adminCatalogService = adminCatalogService;
    } else {
      const cRepo = catalogRepo || new CatalogRepository(db);
      const catRepo = new CategoryRepository(db);
      const pRepo = new ProductRepository(db);
      const oRepo = new OverrideRepository(db);
      const vRepo = new VariantRepository(db);
      const optRepo = new OptionRepository(db);

      this.catalogRepo = cRepo;
      this.categoryService = categoryService || new CatalogCategoryService(cRepo, catRepo);
      this.variantService = variantService || new CatalogVariantService(cRepo, vRepo);
      this.optionService = optionService || new CatalogOptionService(cRepo, optRepo);
      this.overrideService = overrideService || new CatalogOverrideService(cRepo, oRepo);
      this.productService =
        productService || new CatalogProductService(cRepo, pRepo, oRepo, vRepo, optRepo);
      this.adminCatalogService =
        adminCatalogService || new AdminCatalogService(cRepo, pRepo, catRepo);
    }
  }

  // Helper delegates
  async verifyOutletOwnership(userId: string, outletId: string) {
    return this.catalogRepo.verifyOutletOwnership(userId, outletId);
  }
  async verifyProductOwnership(userId: string, productId: string) {
    return this.catalogRepo.verifyProductOwnership(userId, productId);
  }
  async getOrCreateOutletCatalog(outletId: string) {
    return this.catalogRepo.getOrCreateOutletCatalog(outletId);
  }

  // Category delegates
  async createCategory(userId: string, outletId: string, dto: CreateCategoryDto) {
    return this.categoryService.createCategory(userId, outletId, dto);
  }
  async getCategories(outletId: string, includeInactive = false) {
    return this.categoryService.getCategories(outletId, includeInactive);
  }
  async updateCategory(userId: string, categoryId: string, dto: UpdateCategoryDto) {
    return this.categoryService.updateCategory(userId, categoryId, dto);
  }
  async deleteCategory(userId: string, categoryId: string) {
    return this.categoryService.deleteCategory(userId, categoryId);
  }

  // Product delegates
  async createProduct(userId: string, outletId: string, dto: CreateProductDto) {
    return this.productService.createProduct(userId, outletId, dto);
  }
  async getProducts(outletId: string, query: ProductQueryDto = {}, isCustomerView = false) {
    return this.productService.getProducts(outletId, query, isCustomerView);
  }
  async getProductById(productId: string, outletId?: string) {
    return this.productService.getProductById(productId, outletId);
  }
  async updateProduct(userId: string, productId: string, dto: UpdateProductDto) {
    return this.productService.updateProduct(userId, productId, dto);
  }
  async archiveProduct(userId: string, productId: string) {
    return this.productService.archiveProduct(userId, productId);
  }
  async deleteProduct(userId: string, productId: string) {
    return this.productService.deleteProduct(userId, productId);
  }

  // Variant delegates
  async createVariant(userId: string, productId: string, dto: CreateVariantDto) {
    return this.variantService.createVariant(userId, productId, dto);
  }
  async getVariants(productId: string) {
    return this.variantService.getVariants(productId);
  }
  async updateVariant(userId: string, variantId: string, dto: UpdateVariantDto) {
    return this.variantService.updateVariant(userId, variantId, dto);
  }
  async deleteVariant(userId: string, variantId: string) {
    return this.variantService.deleteVariant(userId, variantId);
  }

  // Option delegates
  async createOptionGroup(userId: string, productId: string, dto: CreateOptionGroupDto) {
    return this.optionService.createOptionGroup(userId, productId, dto);
  }
  async getOptionGroups(productId: string) {
    return this.optionService.getOptionGroups(productId);
  }
  async updateOptionGroup(userId: string, groupId: string, dto: UpdateOptionGroupDto) {
    return this.optionService.updateOptionGroup(userId, groupId, dto);
  }
  async deleteOptionGroup(userId: string, groupId: string) {
    return this.optionService.deleteOptionGroup(userId, groupId);
  }
  async createOption(userId: string, groupId: string, dto: CreateOptionDto) {
    return this.optionService.createOption(userId, groupId, dto);
  }
  async updateOption(userId: string, optionId: string, dto: UpdateOptionDto) {
    return this.optionService.updateOption(userId, optionId, dto);
  }
  async deleteOption(userId: string, optionId: string) {
    return this.optionService.deleteOption(userId, optionId);
  }

  // Override & Stock delegates
  async setOutletOverride(
    userId: string,
    outletId: string,
    productId: string,
    dto: SetOutletOverrideDto,
  ) {
    return this.overrideService.setOutletOverride(userId, outletId, productId, dto);
  }
  async getOutletOverrides(outletId: string) {
    return this.overrideService.getOutletOverrides(outletId);
  }
  async removeOutletOverride(userId: string, outletId: string, productId: string) {
    return this.overrideService.removeOutletOverride(userId, outletId, productId);
  }
  async bulkAssignOutlets(userId: string, productId: string, dto: BulkAssignOutletsDto) {
    return this.overrideService.bulkAssignOutlets(userId, productId, dto);
  }
  async updateStock(userId: string, outletId: string, productId: string, dto: UpdateStockDto) {
    return this.overrideService.updateStock(userId, outletId, productId, dto);
  }
  async getStockHistory(userId: string, outletId: string, productId: string) {
    return this.overrideService.getStockHistory(userId, outletId, productId);
  }

  // Admin Catalog delegates
  async moderateProduct(adminId: string, productId: string, dto: ModerateProductDto) {
    return this.adminCatalogService.moderateProduct(adminId, productId, dto);
  }
  async getAdminProducts(status?: string, page = 1, limit = 50) {
    return this.adminCatalogService.getAdminProducts(status, page, limit);
  }
  async getAdminCategories(verticalType?: string) {
    return this.adminCatalogService.getAdminCategories(verticalType);
  }
  async createAdminCategory(adminId: string, dto: CreateCategoryDto & { catalogId?: string }) {
    return this.adminCatalogService.createAdminCategory(adminId, dto);
  }
  async updateAdminCategory(adminId: string, categoryId: string, dto: UpdateCategoryDto) {
    return this.adminCatalogService.updateAdminCategory(adminId, categoryId, dto);
  }
  async deleteAdminCategory(adminId: string, categoryId: string) {
    return this.adminCatalogService.deleteAdminCategory(adminId, categoryId);
  }
}
