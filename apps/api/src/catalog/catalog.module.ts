import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { CatalogRepository } from './data/catalog.repository.js';
import { CategoryRepository } from './data/category.repository.js';
import { ProductRepository } from './data/product.repository.js';
import { VariantRepository } from './data/variant.repository.js';
import { OptionRepository } from './data/option.repository.js';
import { OverrideRepository } from './data/override.repository.js';
import { OperatingHoursRepository } from './data/operating-hours.repository.js';
import { CatalogCategoryService } from './catalog-category.service.js';
import { CatalogProductService } from './catalog-product.service.js';
import { CatalogVariantService } from './catalog-variant.service.js';
import { CatalogOptionService } from './catalog-option.service.js';
import { CatalogOverrideService } from './catalog-override.service.js';
import { AdminCatalogService } from './admin-catalog.service.js';
import { WeeklyScheduleService } from './weekly-schedule.service.js';
import { SpecialClosuresService } from './special-closures.service.js';
import { StoreOpenCalculatorService } from './store-open-calculator.service.js';
import { CatalogMediaService } from './catalog-media.service.js';
import { CatalogService } from './catalog.service.js';
import { OperatingHoursService } from './operating-hours.service.js';
import { MerchantCategoryController } from './merchant-category.controller.js';
import { MerchantProductController } from './merchant-product.controller.js';
import { MerchantVariantController } from './merchant-variant.controller.js';
import { MerchantStockController } from './merchant-stock.controller.js';
import { CustomerCatalogController } from './customer-catalog.controller.js';
import { AdminCatalogController } from './admin-catalog.controller.js';

@Module({
  imports: [DatabaseModule],
  controllers: [
    MerchantCategoryController,
    MerchantProductController,
    MerchantVariantController,
    MerchantStockController,
    CustomerCatalogController,
    AdminCatalogController,
  ],
  providers: [
    CatalogRepository,
    CategoryRepository,
    ProductRepository,
    VariantRepository,
    OptionRepository,
    OverrideRepository,
    OperatingHoursRepository,
    CatalogCategoryService,
    CatalogProductService,
    CatalogVariantService,
    CatalogOptionService,
    CatalogOverrideService,
    AdminCatalogService,
    WeeklyScheduleService,
    SpecialClosuresService,
    StoreOpenCalculatorService,
    CatalogMediaService,
    CatalogService,
    OperatingHoursService,
  ],
  exports: [
    CatalogRepository,
    CategoryRepository,
    ProductRepository,
    VariantRepository,
    OptionRepository,
    OverrideRepository,
    OperatingHoursRepository,
    CatalogCategoryService,
    CatalogProductService,
    CatalogVariantService,
    CatalogOptionService,
    CatalogOverrideService,
    AdminCatalogService,
    WeeklyScheduleService,
    SpecialClosuresService,
    StoreOpenCalculatorService,
    CatalogMediaService,
    CatalogService,
    OperatingHoursService,
  ],
})
export class CatalogModule {}
