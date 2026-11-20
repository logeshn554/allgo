export interface DpdpConsentDto {
  purpose: 'PROFILE_ORDERING' | 'LIVE_TRACKING' | 'MARKETING' | 'ANALYTICS';
  granted: boolean;
  policyVersion?: string;
}

export interface DpdpDeletionRequestDto {
  reason: string;
}

export interface DpdpExportResult {
  userId: string;
  phone: string;
  fullName?: string;
  email?: string;
  consents: any[];
  savedAddresses: any[];
  ordersSummary: { totalOrders: number; activeOrders: number };
  exportedAt: string;
}
