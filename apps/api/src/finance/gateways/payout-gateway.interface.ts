export interface CreateGatewayPayoutParams {
  accountNumber: string;
  amountInr: number;
  currency?: string;
  mode?: 'NEFT' | 'RTGS' | 'IMPS' | 'UPI';
  purpose?: string;
  referenceId: string;
  narration?: string;
  fundAccountId?: string;
  notes?: Record<string, string>;
}

export interface GatewayPayoutResult {
  id: string;
  entity: string;
  fundAccountId?: string;
  amount: number;
  currency: string;
  status: 'queued' | 'pending' | 'processing' | 'processed' | 'reversed' | 'cancelled' | 'rejected';
  mode: string;
  referenceId: string;
  failureReason?: string;
}

export interface GatewayPayoutDetails {
  id: string;
  amount: number;
  status: 'queued' | 'pending' | 'processing' | 'processed' | 'reversed' | 'cancelled' | 'rejected';
  utr?: string;
  failureReason?: string;
  referenceId?: string;
}

export interface PayoutGateway {
  createPayout(params: CreateGatewayPayoutParams): Promise<GatewayPayoutResult>;
  fetchPayout(payoutId: string): Promise<GatewayPayoutDetails>;
  cancelPayout(payoutId: string): Promise<GatewayPayoutResult>;
}
