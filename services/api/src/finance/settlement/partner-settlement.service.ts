import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SettlementRepository } from '../data/settlement.repository.js';
import { LedgerService } from '../ledger/ledger.service.js';

@Injectable()
export class PartnerSettlementService {
  constructor(
    private readonly repo: SettlementRepository,
    private readonly ledger: LedgerService,
  ) {}

  async generatePartnerSettlement(partnerId: string, periodStart: Date, periodEnd: Date) {
    const partner = await this.repo.findPartnerById(partnerId);
    if (!partner) {
      throw new NotFoundException(`Partner not found: ${partnerId}`);
    }

    const deliveryRes = await this.repo.getPartnerDeliveryLegsStats(
      partnerId,
      periodStart,
      periodEnd,
    );
    const rideRes = await this.repo.getPartnerRidesStats(partnerId, periodStart, periodEnd);
    const parcelRes = await this.repo.getPartnerParcelsStats(partnerId, periodStart, periodEnd);
    const hireDriverRes = await this.repo.getPartnerHireDriverStats(
      partnerId,
      periodStart,
      periodEnd,
    );
    const codSum = await this.repo.getPartnerCodSum(partnerId, periodStart, periodEnd);

    const totalDeliveries =
      Number.parseInt(deliveryRes.leg_count, 10) +
      Number.parseInt(rideRes.ride_count, 10) +
      Number.parseInt(parcelRes.parcel_count, 10) +
      Number.parseInt(hireDriverRes.hire_count, 10);

    const grossEarnings =
      Number.parseFloat(deliveryRes.payout_sum) +
      Number.parseFloat(rideRes.payout_sum) +
      Number.parseFloat(parcelRes.payout_sum) +
      Number.parseFloat(hireDriverRes.payout_sum);

    const codCollected = Number.parseFloat(codSum);
    const platformCommission = Math.round(grossEarnings * 0.1 * 100) / 100;
    const adjustments = 0.0;
    const netPayable = Math.max(
      0,
      Math.round((grossEarnings - codCollected + adjustments) * 100) / 100,
    );

    return this.repo.insertPartnerSettlement({
      partnerId,
      periodStart,
      periodEnd,
      totalDeliveries,
      grossEarnings,
      platformCommission,
      codCollected,
      adjustments,
      netPayable,
    });
  }

  async approvePartnerSettlement(settlementId: string, adminId: string) {
    const settlement = await this.repo.findPartnerSettlementById(settlementId);
    if (!settlement) {
      throw new NotFoundException(`Partner settlement not found: ${settlementId}`);
    }

    if (settlement.status !== 'PENDING') {
      throw new BadRequestException(`Cannot approve settlement with status: ${settlement.status}`);
    }

    const netPayable = Number.parseFloat(settlement.net_payable_inr);

    const payout = await this.repo.createPartnerPayout({
      partnerId: settlement.partner_id,
      grossAmount: Number.parseFloat(settlement.gross_earnings_inr),
      netPayable,
      settlementId,
      adminId,
    });

    const updated = await this.repo.updatePartnerSettlementApproved(settlementId, payout.id);

    if (netPayable > 0) {
      const txRef = `SETTLE-PARTNER-${settlementId}`;
      await this.ledger.postTransaction({
        transactionReference: txRef,
        description: `Partner Settlement Approval #${settlementId}`,
        entries: [
          {
            partnerId: settlement.partner_id,
            accountType: 'PLATFORM_COMMISSION',
            direction: 'DEBIT',
            amountInr: netPayable,
            description: `Settlement disbursement liability`,
            metadata: { settlementId },
          },
          {
            partnerId: settlement.partner_id,
            accountType: 'PARTNER_EARNINGS',
            direction: 'CREDIT',
            amountInr: netPayable,
            description: `Settlement payable approved`,
            metadata: { settlementId },
          },
        ],
        metadata: { settlementId, adminId },
      });
    }

    return updated;
  }

  async getPartnerSettlements(partnerId: string) {
    return this.repo.getPartnerSettlements(partnerId);
  }
}
