import { Module } from '@nestjs/common';
import { EncryptionModule } from '../common/encryption/encryption.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { RedisModule } from '../redis/redis.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { AdminMerchantController } from './admin-merchant.controller.js';
import { AdminMerchantService } from './admin-merchant.service.js';
import { MerchantCatalogDataRepository } from './data/merchant-catalog-data.repository.js';
import { MerchantDocumentRepository } from './data/merchant-document.repository.js';
import { MerchantOrderRepository } from './data/merchant-order.repository.js';
import { MerchantOutletRepository } from './data/merchant-outlet.repository.js';
import { MerchantRepository } from './data/merchant.repository.js';
import { MerchantDocumentService } from './merchant-document.service.js';
import { MerchantFinanceService } from './merchant-finance.service.js';
import { MerchantOrderService } from './merchant-order.service.js';
import { MerchantOutletService } from './merchant-outlet.service.js';
import { MerchantProductService } from './merchant-product.service.js';
import { MerchantProfileService } from './merchant-profile.service.js';
import { MerchantController } from './merchant.controller.js';
import { MerchantService } from './merchant.service.js';

@Module({
  imports: [DatabaseModule, RedisModule, EncryptionModule, StorageModule],
  controllers: [MerchantController, AdminMerchantController],
  providers: [
    MerchantRepository,
    MerchantOutletRepository,
    MerchantOrderRepository,
    MerchantCatalogDataRepository,
    MerchantDocumentRepository,
    MerchantProfileService,
    MerchantOutletService,
    MerchantDocumentService,
    MerchantOrderService,
    MerchantProductService,
    MerchantFinanceService,
    AdminMerchantService,
    MerchantService,
  ],
  exports: [
    MerchantRepository,
    MerchantOutletRepository,
    MerchantOrderRepository,
    MerchantCatalogDataRepository,
    MerchantDocumentRepository,
    MerchantProfileService,
    MerchantOutletService,
    MerchantDocumentService,
    MerchantOrderService,
    MerchantProductService,
    MerchantFinanceService,
    AdminMerchantService,
    MerchantService,
  ],
})
export class MerchantModule {}
