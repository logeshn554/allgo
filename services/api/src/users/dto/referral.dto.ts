export interface ReferralProfile {
  referralCode: string;
  totalReferrals: number;
  totalEarnedInr: number;
  successfulRedemptions: number;
}

export interface ReferralValidationResult {
  valid: boolean;
  code?: string;
  referrerUserId?: string;
  discountInr: number;
  message?: string;
}

export interface ApplyReferralDto {
  code: string;
  deviceId?: string;
}
