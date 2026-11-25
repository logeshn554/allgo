// Job: Detailed order-level merchant settlement ledger with platform commission, GST/TCS deductions, and T+1 payouts.

import { loadFromCache, saveToCache } from './localCache.ts';

export interface OrderSettlementRecord {
  orderId: string;
  orderTimestamp: string;
  customerName: string;
  grossSalesCents: number;
  packagingCents: number;
  commissionCents: number; // 15% platform fee
  gstDeductionCents: number; // 5% GST
  tcsDeductionCents: number; // 1% TCS under sec 52 CGST
  refundDeductionsCents: number;
  netPayoutCents: number;
  status: 'SETTLED' | 'PENDING_T1' | 'PROCESSING';
  settlementDate: string;
  bankAccountMasked: string;
  utrReference?: string;
}

export interface SettlementLedgerSummary {
  totalGrossSalesCents: number;
  totalPackagingCents: number;
  totalCommissionCents: number;
  totalGstCents: number;
  totalTcsCents: number;
  totalRefundsCents: number;
  netDisbursementCents: number;
  pendingT1Cents: number;
  settledCents: number;
}

const DEFAULT_SETTLEMENT_RECORDS: OrderSettlementRecord[] = [
  {
    orderId: 'ORD-901',
    orderTimestamp: '2026-11-18 11:32 AM',
    customerName: 'Priya R',
    grossSalesCents: 64000,
    packagingCents: 3000,
    commissionCents: 9600, // 15% of 64000
    gstDeductionCents: 3200, // 5% of 64000
    tcsDeductionCents: 640, // 1% TCS
    refundDeductionsCents: 0,
    netPayoutCents: 53560,
    status: 'PENDING_T1',
    settlementDate: 'Tomorrow, 08:00 AM',
    bankAccountMasked: 'HDFC Bank •••• 8821',
  },
  {
    orderId: 'ORD-902',
    orderTimestamp: '2026-11-18 12:15 PM',
    customerName: 'Anand S',
    grossSalesCents: 22000,
    packagingCents: 1500,
    commissionCents: 3300,
    gstDeductionCents: 1100,
    tcsDeductionCents: 220,
    refundDeductionsCents: 0,
    netPayoutCents: 18880,
    status: 'PENDING_T1',
    settlementDate: 'Tomorrow, 08:00 AM',
    bankAccountMasked: 'HDFC Bank •••• 8821',
  },
  {
    orderId: 'ORD-889',
    orderTimestamp: '2026-11-17 07:45 PM',
    customerName: 'Deepa V',
    grossSalesCents: 45000,
    packagingCents: 2000,
    commissionCents: 6750,
    gstDeductionCents: 2250,
    tcsDeductionCents: 450,
    refundDeductionsCents: 5000,
    netPayoutCents: 32550,
    status: 'SETTLED',
    settlementDate: 'Today, 08:30 AM',
    bankAccountMasked: 'HDFC Bank •••• 8821',
    utrReference: 'UTR_RZPX_981273910',
  },
];

export function loadSettlementLedger(): OrderSettlementRecord[] {
  return loadFromCache<OrderSettlementRecord[]>(
    'allgo_settlement_ledger',
    DEFAULT_SETTLEMENT_RECORDS,
  );
}

export function saveSettlementLedger(records: OrderSettlementRecord[]): void {
  saveToCache('allgo_settlement_ledger', records);
}

export function calculateLedgerSummary(records: OrderSettlementRecord[]): SettlementLedgerSummary {
  return records.reduce(
    (acc, r) => {
      acc.totalGrossSalesCents += r.grossSalesCents;
      acc.totalPackagingCents += r.packagingCents;
      acc.totalCommissionCents += r.commissionCents;
      acc.totalGstCents += r.gstDeductionCents;
      acc.totalTcsCents += r.tcsDeductionCents;
      acc.totalRefundsCents += r.refundDeductionsCents;
      acc.netDisbursementCents += r.netPayoutCents;
      if (r.status === 'PENDING_T1') {
        acc.pendingT1Cents += r.netPayoutCents;
      } else if (r.status === 'SETTLED') {
        acc.settledCents += r.netPayoutCents;
      }
      return acc;
    },
    {
      totalGrossSalesCents: 0,
      totalPackagingCents: 0,
      totalCommissionCents: 0,
      totalGstCents: 0,
      totalTcsCents: 0,
      totalRefundsCents: 0,
      netDisbursementCents: 0,
      pendingT1Cents: 0,
      settledCents: 0,
    },
  );
}
