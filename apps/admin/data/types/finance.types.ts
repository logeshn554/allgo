export interface FinancialDashboardMetrics {
  grossTransactionVolumeInr?: number;
  completedTransactionsCount?: number;
  platformCommissionInr?: number;
  refundTotalsInr?: number;
  refundCount?: number;
  partnerEarningsInr?: number;
  outstandingCodInr?: number;
  pendingSettlementsInr?: number;
}

export interface LedgerEntry {
  id: string;
  transaction_reference: string;
  account_type: string;
  entry_type: 'DEBIT' | 'CREDIT';
  amount_inr: number;
  balance_after_inr?: number;
  description?: string;
  created_at: string;
}

export interface ProcessRefundDto {
  paymentId: string;
  amountInr: number;
  destination: 'WALLET' | 'ORIGINAL_METHOD';
  reason: string;
  subOrderId?: string;
}
