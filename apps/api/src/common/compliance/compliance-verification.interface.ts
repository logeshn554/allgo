export interface PennyDropRequest {
  bankAccountNumber: string;
  bankIfsc: string;
  beneficiaryName: string;
}

export interface PennyDropResult {
  verified: boolean;
  registeredName: string;
  nameMatchScore: number;
  utrNumber: string;
  bankResponseCode: string;
  remarks?: string;
}

export interface ComplianceValidationResult {
  isValid: boolean;
  type: 'FSSAI' | 'GSTIN' | 'PAN';
  identifier: string;
  errorMessage?: string;
  details?: {
    stateCode?: string;
    entityType?: string;
    checkDigitValid?: boolean;
  };
}

export interface AdminVerificationAction {
  entityType: 'MERCHANT' | 'PARTNER';
  entityId: string;
  adminUserId: string;
  verificationType: 'FSSAI' | 'GSTIN' | 'PAN' | 'BANK_PENNY_DROP' | 'KYC_DOCUMENTS';
  status: 'VERIFIED' | 'REJECTED';
  notes?: string;
}
