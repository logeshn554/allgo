import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { EncryptionModule } from '../common/encryption/encryption.module.js';
import { PartnerRepository } from './data/partner.repository.js';
import { PartnerProfileService } from './partner-profile.service.js';
import { PartnerServiceApplicationService } from './partner-service-application.service.js';
import { AdminPartnerReviewService } from './admin-partner-review.service.js';
import { PartnerService } from './partner.service.js';
import { PartnerController } from './partner.controller.js';
import { AdminPartnerController } from './admin-partner.controller.js';

@Module({
  imports: [DatabaseModule, StorageModule, EncryptionModule],
  controllers: [PartnerController, AdminPartnerController],
  providers: [
    PartnerRepository,
    PartnerProfileService,
    PartnerServiceApplicationService,
    AdminPartnerReviewService,
    PartnerService,
  ],
  exports: [PartnerService, PartnerRepository],
})
export class PartnerModule {}
