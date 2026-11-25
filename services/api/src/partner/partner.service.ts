import { Injectable } from '@nestjs/common';
import { EncryptionService } from '../common/encryption/encryption.service.js';
import { DatabaseService } from '../database/database.service.js';
import { StorageService } from '../storage/storage.service.js';
import { AdminPartnerReviewService } from './admin-partner-review.service.js';
import { PartnerRepository } from './data/partner.repository.js';
import { RegisterPartnerDto } from './dto/register-partner.dto.js';
import { SubmitPartnerDocumentDto } from './dto/submit-document.dto.js';
import { PartnerProfileService } from './partner-profile.service.js';
import { PartnerServiceApplicationService } from './partner-service-application.service.js';

@Injectable()
export class PartnerService {
  public inMemoryPartners: Map<string, any>;
  public inMemoryVehicles: Map<string, any>;
  public inMemoryServices: Map<string, any>;
  public inMemoryDocuments: Map<string, any>;

  private readonly partnerRepo: PartnerRepository;
  private readonly profileService: PartnerProfileService;
  private readonly serviceAppService: PartnerServiceApplicationService;
  private readonly adminReviewService: AdminPartnerReviewService;

  constructor(
    private readonly db: DatabaseService,
    private readonly encryption: EncryptionService,
    private readonly storage: StorageService,
    partnerRepo?: PartnerRepository,
    profileService?: PartnerProfileService,
    serviceAppService?: PartnerServiceApplicationService,
    adminReviewService?: AdminPartnerReviewService,
  ) {
    if (partnerRepo && profileService && serviceAppService && adminReviewService) {
      this.partnerRepo = partnerRepo;
      this.profileService = profileService;
      this.serviceAppService = serviceAppService;
      this.adminReviewService = adminReviewService;
    } else {
      this.partnerRepo = new PartnerRepository(this.db);
      this.profileService = new PartnerProfileService(this.partnerRepo, this.encryption);
      this.serviceAppService = new PartnerServiceApplicationService(this.partnerRepo, this.storage);
      this.adminReviewService = new AdminPartnerReviewService(this.partnerRepo);
    }

    this.inMemoryPartners = this.partnerRepo.inMemoryPartners;
    this.inMemoryVehicles = this.partnerRepo.inMemoryVehicles;
    this.inMemoryServices = this.partnerRepo.inMemoryServices;
    this.inMemoryDocuments = this.partnerRepo.inMemoryDocuments;
  }

  async getPartnerByUserId(userId: string): Promise<any> {
    return this.profileService.getPartnerByUserId(userId);
  }

  async registerOrUpdate(userId: string, dto: RegisterPartnerDto): Promise<any> {
    return this.profileService.registerOrUpdate(userId, dto);
  }

  async applyForService(userId: string, serviceType: string): Promise<any> {
    return this.serviceAppService.applyForService(userId, serviceType);
  }

  async submitDocument(userId: string, dto: SubmitPartnerDocumentDto): Promise<any> {
    return this.serviceAppService.submitDocument(userId, dto);
  }

  async submitForReview(userId: string): Promise<any> {
    return this.serviceAppService.submitForReview(userId);
  }

  async getProfile(userId: string): Promise<any> {
    return this.profileService.getProfile(userId);
  }

  async listAdminApplications(query: { status?: string }): Promise<any[]> {
    return this.adminReviewService.listAdminApplications(query);
  }

  async updateAdminPartnerStatus(
    partnerId: string,
    adminUserId: string,
    newStatus: string,
    reason?: string,
  ): Promise<any> {
    return this.adminReviewService.updateAdminPartnerStatus(
      partnerId,
      adminUserId,
      newStatus,
      reason,
    );
  }

  async updateAdminServiceStatus(
    partnerId: string,
    serviceType: string,
    adminUserId: string,
    newStatus: string,
    reason?: string,
  ): Promise<any> {
    return this.adminReviewService.updateAdminServiceStatus(
      partnerId,
      serviceType,
      adminUserId,
      newStatus,
      reason,
    );
  }
}
