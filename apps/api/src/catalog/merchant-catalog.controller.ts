import { Controller } from '@nestjs/common';
import { MerchantCategoryController } from './merchant-category.controller.js';
import { MerchantProductController } from './merchant-product.controller.js';
import { MerchantVariantController } from './merchant-variant.controller.js';
import { MerchantStockController } from './merchant-stock.controller.js';

export {
  MerchantCategoryController,
  MerchantProductController,
  MerchantVariantController,
  MerchantStockController,
};

/**
 * Backward-compatible facade for MerchantCatalogController.
 * Actual endpoints are modularized across focused controllers:
 * - MerchantCategoryController
 * - MerchantProductController
 * - MerchantVariantController
 * - MerchantStockController
 */
@Controller('v1/merchants')
export class MerchantCatalogController extends MerchantProductController {}
