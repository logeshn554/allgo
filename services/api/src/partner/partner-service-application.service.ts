import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { StorageService } from '../storage/storage.service.js';
import { PartnerRepository } from './data/partner.repository.js';
import { SubmitPartnerDocumentDto } from './dto/submit-document.dto.js';

interface ServiceEligibilityConfig {
  requiredDocuments: string[];
  allowedVehicleTypes: string[];
  backgroundCheckRequired: boolean;
  minimumAge: number;
  isPermittedNationwide: boolean;
  permittedStates?: string[];
  legalReviewNotes: string;
}

@Injectable()
export class PartnerServiceApplicationService {
  private readonly logger = new Logger(PartnerServiceApplicationService.name);
  private eligibilityRules: Record<string, ServiceEligibilityConfig> = {};

  constructor(
    private readonly partnerRepo: PartnerRepository,
    private readonly storage: StorageService,
  ) {
    this.loadEligibilityRules();
  }

  public loadEligibilityRules() {
    try {
      const configPath = path.resolve(process.cwd(), 'config/partner-service-eligibility.json');
      if (fs.existsSync(configPath)) {
        this.eligibilityRules = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
    } catch (e) {
      this.logger.warn(`Could not load partner service eligibility rules: ${e}`);
    }
  }

  async applyForService(userId: string, serviceType: string): Promise<any> {
    const partner = await this.partnerRepo.findPartnerByUserId(userId);
    if (!partner) {
      throw new NotFoundException(
        'Partner profile must be registered before applying for service categories',
      );
    }

    if (['SUSPENDED', 'BLOCKED'].includes(partner.status)) {
      throw new ForbiddenException(
        `Partner account is ${partner.status}. Cannot apply for services.`,
      );
    }

    const vehicle = this.partnerRepo.findVehicleByPartnerId(partner.id);
    const rule = this.eligibilityRules[serviceType];

    if (rule && vehicle) {
      if (!rule.allowedVehicleTypes.includes(vehicle.vehicle_type)) {
        throw new BadRequestException(
          `Vehicle type '${vehicle.vehicle_type}' is not eligible for '${serviceType}'. Allowed: ${rule.allowedVehicleTypes.join(', ')}`,
        );
      }
    }

    const appId = crypto.randomUUID();
    const appData = {
      id: appId,
      partner_id: partner.id,
      service_type: serviceType,
      status: 'PENDING',
      rejection_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await this.partnerRepo.saveServiceApplication(`${partner.id}:${serviceType}`, appData);
    return appData;
  }

  async submitDocument(userId: string, dto: SubmitPartnerDocumentDto): Promise<any> {
    const partner = await this.partnerRepo.findPartnerByUserId(userId);
    if (!partner) {
      throw new NotFoundException('Partner profile not found');
    }

    const ticket = await this.storage.linkTicket(dto.ticketId, userId, 'partner', partner.id);
    const existingDoc = await this.partnerRepo.findCurrentDocument(partner.id, dto.documentType);

    const newDocId = crypto.randomUUID();
    const newVersion = existingDoc ? (existingDoc.version || 1) + 1 : 1;

    if (existingDoc) {
      await this.partnerRepo.supersedeDocument(existingDoc, newDocId);
    }

    const docData = {
      id: newDocId,
      partner_id: partner.id,
      document_type: dto.documentType,
      document_number: dto.documentNumber || null,
      storage_key: ticket.storage_key,
      file_url: `/v1/documents/download/${ticket.storage_key}`,
      mime_type: ticket.mime_type,
      file_size_bytes: ticket.file_size_bytes,
      version: newVersion,
      is_current: true,
      verification_status: 'PENDING',
      created_at: new Date(),
    };

    await this.partnerRepo.insertDocument(docData);
    return docData;
  }

  async submitForReview(userId: string): Promise<any> {
    const partner = await this.partnerRepo.findPartnerByUserId(userId);
    if (!partner) {
      throw new NotFoundException('Partner profile not found');
    }

    if (partner.status === 'BLOCKED') {
      throw new ForbiddenException('Blocked partner account cannot submit for review');
    }

    let serviceCount = 0;
    for (const k of this.partnerRepo.inMemoryServices.keys()) {
      if (k.startsWith(`${partner.id}:`)) serviceCount++;
    }

    let docCount = 0;
    for (const d of this.partnerRepo.inMemoryDocuments.values()) {
      if (d.partner_id === partner.id && d.is_current) docCount++;
    }

    if (serviceCount === 0) {
      throw new BadRequestException(
        'At least one service category must be selected before submitting',
      );
    }

    if (docCount === 0) {
      throw new BadRequestException(
        'At least one identity document must be uploaded before submitting',
      );
    }

    await this.partnerRepo.updatePartnerStatus(
      partner.id,
      userId,
      'DOCS_SUBMITTED',
      'Submitted onboarding dossier',
    );

    return {
      partnerId: partner.id,
      status: 'DOCS_SUBMITTED',
      message: 'Onboarding application successfully submitted for administrative review',
    };
  }
}
