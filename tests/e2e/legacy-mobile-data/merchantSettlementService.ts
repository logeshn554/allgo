// Job: Daily merchant reconciliation reports (Gross sales, 15% platform fee, GST, packaging, refund deductions).

export interface OrderSettlementItem {
  orderId: string;
  orderDate: string;
  grossSalesCents: number;
  packagingChargeCents: number;
  taxGstCents: number;
  commissionCents: number; // 15% platform commission
  refundDeductionsCents: number;
  netPayoutCents: number;
}

export interface DailySettlementSummary {
  reportDate: string;
  merchantId: string;
  orderCount: number;
  totalGrossSalesCents: number;
  totalPackagingCents: number;
  totalGstTaxCents: number;
  totalPlatformCommissionCents: number;
  totalRefundDeductionsCents: number;
  netDisbursementCents: number;
  orders: OrderSettlementItem[];
}

export function generateDailySettlementReport(
  merchantId: string,
  orders: {
    orderId: string;
    grossFoodCents: number;
    packagingCents: number;
    refundCents?: number;
    date?: string;
  }[],
): DailySettlementSummary {
  const reportDate = new Date().toISOString().split('T')[0] ?? '2026-11-14';

  let totalGross = 0;
  let totalPackaging = 0;
  let totalTax = 0;
  let totalCommission = 0;
  let totalRefunds = 0;
  let totalNet = 0;

  const items: OrderSettlementItem[] = [];

  for (const o of orders) {
    const gross = o.grossFoodCents;
    const packaging = o.packagingCents;
    const refunds = o.refundCents ?? 0;

    // GST on food at 5%
    const gst = Math.round(gross * 0.05);

    // Platform commission at 15% of food revenue
    const commission = Math.round(gross * 0.15);

    // Net payable to merchant = (gross + packaging) - commission - refunds
    const net = Math.max(0, gross + packaging - commission - refunds);

    totalGross += gross;
    totalPackaging += packaging;
    totalTax += gst;
    totalCommission += commission;
    totalRefunds += refunds;
    totalNet += net;

    items.push({
      orderId: o.orderId,
      orderDate: o.date ?? reportDate,
      grossSalesCents: gross,
      packagingChargeCents: packaging,
      taxGstCents: gst,
      commissionCents: commission,
      refundDeductionsCents: refunds,
      netPayoutCents: net,
    });
  }

  return {
    reportDate,
    merchantId,
    orderCount: orders.length,
    totalGrossSalesCents: totalGross,
    totalPackagingCents: totalPackaging,
    totalGstTaxCents: totalTax,
    totalPlatformCommissionCents: totalCommission,
    totalRefundDeductionsCents: totalRefunds,
    netDisbursementCents: totalNet,
    orders: items,
  };
}
