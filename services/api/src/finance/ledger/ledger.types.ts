export type AccountType =
  | 'CUSTOMER_WALLET'
  | 'MERCHANT_SETTLEMENT'
  | 'PARTNER_EARNINGS'
  | 'PLATFORM_COMMISSION'
  | 'PLATFORM_DELIVERY_FEES'
  | 'GATEWAY_ESCROW'
  | 'TAX_PAYABLE_GST'
  | 'TAX_WITHHELD_TCS'
  | 'TAX_WITHHELD_TDS'
  | 'COD_COLLECTED'
  | 'COD_HOLDING';

export type LedgerDirection = 'DEBIT' | 'CREDIT';

export interface LedgerEntryInput {
  walletId?: string;
  partnerId?: string;
  merchantId?: string;
  subOrderId?: string;
  rideId?: string;
  parcelId?: string;
  hireDriverBookingId?: string;
  accountType: AccountType;
  direction: LedgerDirection;
  amountInr: number;
  description: string;
  metadata?: Record<string, any>;
  isReversal?: boolean;
  reversalReference?: string;
}

export interface PostTransactionDto {
  transactionReference: string;
  description: string;
  entries: LedgerEntryInput[];
  metadata?: Record<string, any>;
}
