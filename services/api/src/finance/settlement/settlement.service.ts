import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { SettlementRepository } from '../data/settlement.repository.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { MerchantSettlementService } from './merchant-settlement.service.js';
import { PartnerSettlementService } from './partner-settlement.service.js';

@Injectable()
export class SettlementService {
  private readonly settlementRepo: SettlementRepository;
  private readonly partnerSettlement: PartnerSettlementService;
  private readonly merchantSettlement: MerchantSettlementService;

  constructor(
    private readonly db: DatabaseService,
    private readonly ledger: LedgerService,
    partnerSettlement?: PartnerSettlementService,
    merchantSettlement?: MerchantSettlementService,
    settlementRepo?: SettlementRepository,
  ) {
    if (partnerSettlement && merchantSettlement && settlementRepo) {
      this.partnerSettlement = partnerSettlement;
      this.merchantSettlement = merchantSettlement;
      this.settlementRepo = settlementRepo;
    } else {
      this.settlementRepo = new SettlementRepository(this.db);
      this.partnerSettlement = new PartnerSettlementService(this.settlementRepo, this.ledger);
      this.merchantSettlement = new MerchantSettlementService(this.settlementRepo, this.ledger);
    }
  }

  async generatePartnerSettlement(partnerId: string, periodStart: Date, periodEnd: Date) {
    return this.partnerSettlement.generatePartnerSettlement(partnerId, periodStart, periodEnd);
  }

  async approvePartnerSettlement(settlementId: string, adminId: string) {
    return this.partnerSettlement.approvePartnerSettlement(settlementId, adminId);
  }

  async generateMerchantSettlement(
    merchantId: string,
    outletId?: string,
    periodStart?: Date,
    periodEnd?: Date,
  ) {
    return this.merchantSettlement.generateMerchantSettlement(
      merchantId,
      outletId,
      periodStart,
      periodEnd,
    );
  }

  async approveMerchantSettlement(settlementId: string, adminId: string) {
    return this.merchantSettlement.approveMerchantSettlement(settlementId, adminId);
  }

  async getPartnerSettlements(partnerId: string) {
    return this.partnerSettlement.getPartnerSettlements(partnerId);
  }

  async getMerchantSettlements(merchantId: string) {
    return this.merchantSettlement.getMerchantSettlements(merchantId);
  }
}
