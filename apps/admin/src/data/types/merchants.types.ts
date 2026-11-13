export type MerchantApplicationStatus =
  | 'REGISTERED'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'LIVE'
  | 'PAUSED'
  | 'SUSPENDED';

export interface MerchantApplicationSummary {
  id: string;
  owner_id: string;
  business_name: string;
  trade_name?: string;
  merchant_type: string;
  pan_number: string;
  gstin?: string;
  fssai_license_number?: string;
  status: MerchantApplicationStatus;
  bank_account_number?: string;
  bank_ifsc?: string;
  bank_beneficiary_name?: string;
  commission_rate_percentage: number;
  created_at: string;
  owner_phone?: string;
  owner_name?: string;
  owner_email?: string;
  outlet_name?: string;
  address_line1?: string;
  postal_code?: string;
  is_open?: boolean;
}

export interface ListMerchantsOptions {
  status?: string;
  page?: number;
  limit?: number;
}

export interface ListMerchantsResponse {
  merchants: MerchantApplicationSummary[];
  total: number;
}

export interface UpdateMerchantStatusResponse {
  merchant: MerchantApplicationSummary;
  notes: string;
}

export interface MerchantDocument {
  id: string;
  merchant_id: string;
  document_type: string;
  document_url: string;
  verification_status: string;
  rejection_reason?: string;
  created_at: string;
}
