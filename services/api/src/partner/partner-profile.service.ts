import crypto from 'node:crypto';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { EncryptionService } from '../common/encryption/encryption.service.js';
import { PartnerRepository } from './data/partner.repository.js';
import { RegisterPartnerDto } from './dto/register-partner.dto.js';

@Injectable()
export class PartnerProfileService {
  constructor(
    private readonly partnerRepo: PartnerRepository,
    private readonly encryption: EncryptionService,
  ) {}

  async getPartnerByUserId(userId: string): Promise<any> {
    return this.partnerRepo.findPartnerByUserId(userId);
  }

  async registerOrUpdate(userId: string, dto: RegisterPartnerDto): Promise<any> {
    const user = await this.partnerRepo.findUserById(userId);
    const existingPartner = await this.partnerRepo.findPartnerByUserId(userId);

    if (existingPartner && ['SUSPENDED', 'BLOCKED'].includes(existingPartner.status)) {
      throw new ForbiddenException(
        `Partner account is ${existingPartner.status}. Modification prohibited.`,
      );
    }

    const encryptedBank = this.encryption.encrypt(dto.bankAccountNumber);
    const bankHmac = this.encryption.computeHmac(dto.bankAccountNumber);

    const partnerId = existingPartner ? existingPartner.id : crypto.randomUUID();
    const partnerStatus = existingPartner ? existingPartner.status : 'REGISTERED';

    const partnerData = {
      id: partnerId,
      user_id: userId,
      status: partnerStatus,
      bank_account_number: encryptedBank,
      bank_account_hmac: bankHmac,
      bank_ifsc: dto.bankIfsc.toUpperCase().trim(),
      bank_beneficiary_name: dto.bankBeneficiaryName.trim(),
      background_checked: existingPartner ? existingPartner.background_checked : false,
      equipment_verified: existingPartner ? existingPartner.equipment_verified : false,
      created_at: existingPartner ? existingPartner.created_at : new Date(),
      updated_at: new Date(),
    };

    await this.partnerRepo.savePartner(partnerData, !!existingPartner);

    const vehicleId = crypto.randomUUID();
    const vehicleData = {
      id: vehicleId,
      partner_id: partnerId,
      vehicle_type: dto.vehicleType,
      registration_number: dto.registrationNumber.toUpperCase().trim(),
      make_model: dto.makeModel.trim(),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await this.partnerRepo.saveVehicle(partnerId, vehicleData);

    return {
      partnerId,
      status: partnerStatus,
      vehicle: vehicleData,
      bankAccountMasked: this.encryption.maskBankAccount(dto.bankAccountNumber),
    };
  }

  async getProfile(userId: string): Promise<any> {
    const partner = await this.partnerRepo.findPartnerByUserId(userId);
    if (!partner) {
      return { status: 'NOT_REGISTERED', partner: null };
    }

    let maskedBank = '';
    try {
      const plaintext = this.encryption.decrypt(partner.bank_account_number);
      maskedBank = this.encryption.maskBankAccount(plaintext);
    } catch {
      maskedBank = '**********';
    }

    const vehicle = this.partnerRepo.findVehicleByPartnerId(partner.id);

    const services: any[] = [];
    for (const [k, s] of this.partnerRepo.inMemoryServices.entries()) {
      if (k.startsWith(`${partner.id}:`)) {
        services.push(s);
      }
    }

    const documents: any[] = [];
    for (const d of this.partnerRepo.inMemoryDocuments.values()) {
      if (d.partner_id === partner.id && d.is_current) {
        documents.push(d);
      }
    }

    return {
      status: partner.status,
      partner: {
        id: partner.id,
        status: partner.status,
        bankAccountMasked: maskedBank,
        bankIfsc: partner.bank_ifsc,
        bankBeneficiaryName: partner.bank_beneficiary_name,
        backgroundChecked: partner.background_checked,
        equipmentVerified: partner.equipment_verified,
      },
      vehicle,
      services,
      documents,
    };
  }
}
