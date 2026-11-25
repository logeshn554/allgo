import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SettlementRepository } from '../data/settlement.repository.js';
import { LedgerService } from '../ledger/ledger.service.js';

@Injectable()
export class MerchantSettlementService {
  constructor(
    private readonly repo: SettlementRepository,
    private readonly ledger: LedgerService,
  ) {}

  async generateMerchantSettlement(
    merchantId: string,
    outletId?: string,
    periodStart = new Date(Date.now() - 7 * 86400000),
    periodEnd = new Date(),
  ) {
    const merchant = await this.repo.findMerchantById(merchantId);
    if (!merchant) {
      throw new NotFoundException(`Merchant not found: ${merchantId}`);
    }

    const ordersRes = await this.repo.getMerchantSubOrdersStats(
      merchantId,
      periodStart,
      periodEnd,
      outletId,
    );

    const totalOrders = Number.parseInt(ordersRes.order_count, 10);
    const grossSales = Number.parseFloat(ordersRes.gross_sales);
    const commission = Math.round(grossSales * 0.15 * 100) / 100;
    const tcs = Math.round(grossSales * 0.01 * 100) / 100;
    const refunds = 0.0;
    const netPayable = Math.max(
      0,
      Math.round((grossSales - commission - tcs - refunds) * 100) / 100,
    );

    return this.repo.insertMerchantSettlement({
      merchantId,
      outletId,
      periodStart,
      periodEnd,
      totalOrders,
      grossSales,
      commission,
      tcs,
      refunds,
      netPayable,
    });
  }

  async approveMerchantSettlement(settlementId: string, adminId: string) {
    const settlement = await this.repo.findMerchantSettlementById(settlementId);
    if (!settlement) {
      throw new NotFoundException(`Merchant settlement not found: ${settlementId}`);
    }

    if (settlement.status !== 'PENDING') {
      throw new BadRequestException(`Cannot approve settlement with status: ${settlement.status}`);
    }

    const netPayable = Number.parseFloat(settlement.net_payable_inr);

    const payout = await this.repo.createMerchantPayout({
      merchantId: settlement.merchant_id,
      grossSales: Number.parseFloat(settlement.gross_sales_inr),
      netPayable,
      tcs: Number.parseFloat(settlement.tax_withheld_tcs_inr),
      settlementId,
      adminId,
    });

    const updated = await this.repo.updateMerchantSettlementApproved(settlementId, payout.id);

    if (netPayable > 0) {
      const txRef = `SETTLE-MERCHANT-${settlementId}`;
      await this.ledger.postTransaction({
        transactionReference: txRef,
        description: `Merchant Settlement Approval #${settlementId}`,
        entries: [
          {
            merchantId: settlement.merchant_id,
            accountType: 'PLATFORM_COMMISSION',
            direction: 'DEBIT',
            amountInr: netPayable,
            description: `Merchant settlement payable liability`,
            metadata: { settlementId },
          },
          {
            merchantId: settlement.merchant_id,
            accountType: 'MERCHANT_SETTLEMENT',
            direction: 'CREDIT',
            amountInr: netPayable,
            description: `Merchant settlement payable approved`,
            metadata: { settlementId },
          },
        ],
        metadata: { settlementId, adminId },
      });
    }

    return updated;
  }

  async getMerchantSettlements(merchantId: string) {
    return this.repo.getMerchantSettlements(merchantId);
  }
}
