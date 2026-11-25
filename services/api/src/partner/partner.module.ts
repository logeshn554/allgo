import { Module } from '@nestjs/common';
import { EncryptionModule } from '../common/encryption/encryption.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { AdminPartnerReviewService } from './admin-partner-review.service.js';
import { AdminPartnerController } from './admin-partner.controller.js';
import { PartnerRepository } from './data/partner.repository.js';
import {
  ExternalBackgroundCheckProvider,
  RekognitionLivenessProvider,
} from './interfaces/mock-liveness-and-bgc.provider.js';
import { PartnerProfileService } from './partner-profile.service.js';
import { PartnerServiceApplicationService } from './partner-service-application.service.js';
import { PartnerVerificationOnboardingService } from './partner-verification-onboarding.service.js';
import { PartnerController } from './partner.controller.js';
import { PartnerService } from './partner.service.js';

@Module({
  imports: [DatabaseModule, StorageModule, EncryptionModule],
  controllers: [PartnerController, AdminPartnerController],
  providers: [
    PartnerRepository,
    PartnerProfileService,
    PartnerServiceApplicationService,
    AdminPartnerReviewService,
    PartnerService,
    PartnerVerificationOnboardingService,
    RekognitionLivenessProvider,
    ExternalBackgroundCheckProvider,
  ],
  exports: [PartnerService, PartnerRepository, PartnerVerificationOnboardingService],
})
export class PartnerModule {}
