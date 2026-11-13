import {
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { MerchantRepository } from './data/merchant.repository.js';
import { MerchantOutletRepository } from './data/merchant-outlet.repository.js';
import { MerchantOrderRepository } from './data/merchant-order.repository.js';

@Injectable()
export class MerchantFinanceService {
  constructor(
    private readonly merchantRepo: MerchantRepository,
    private readonly outletRepo: MerchantOutletRepository,
    private readonly orderRepo: MerchantOrderRepository
  ) {}

  async getEarnings(userId: string): Promise<any> {
    const merchant = await this.merchantRepo.findMerchantByOwnerId(userId);
    if (!merchant) throw new ForbiddenException('Merchant account required');
    const outlet = await this.outletRepo.findPrimaryOutlet(merchant.id);
    if (!outlet) {
      return {
        grossSalesInr: 0,
        packagingFeeInr: 0,
        platformCommissionInr: 0,
        taxInr: 0,
        netPayoutInr: 0,
        totalPaidOutInr: 0,
        pendingSettlementInr: 0,
      };
    }

    const row = await this.orderRepo.getEarningsSummary(outlet.id);
    const totalPaid = await this.orderRepo.getPayoutsSummary(merchant.id);
    const netPayout = parseFloat(row.net_payout || '0');
    const pendingSettlement = Math.max(0, netPayout - totalPaid);

    return {
      grossSalesInr: parseFloat(row.gross_sales || '0'),
      packagingFeeInr: parseFloat(row.packaging_fee || '0'),
      platformCommissionInr: parseFloat(row.commission || '0'),
      taxInr: parseFloat(row.tax || '0'),
      netPayoutInr: netPayout,
      totalPaidOutInr: totalPaid,
      pendingSettlementInr: pendingSettlement,
    };
  }

  async getPayouts(userId: string): Promise<any[]> {
    const merchant = await this.merchantRepo.findMerchantByOwnerId(userId);
    if (!merchant) throw new ForbiddenException('Merchant account required');

    const rows = await this.orderRepo.listPayouts(merchant.id);
    return rows.map((p: any) => ({
      id: p.id,
      grossAmountInr: parseFloat(p.gross_amount_inr),
      netAmountInr: parseFloat(p.net_amount_inr),
      payoutChannel: p.payout_channel,
      razorpayxPayoutId: p.razorpayx_payout_id || `PO_ALLGO_${p.id.slice(0, 8).toUpperCase()}`,
      status: p.status,
      failureReason: p.failure_reason,
      processedAt: p.processed_at,
      createdAt: p.created_at,
    }));
  }
}
