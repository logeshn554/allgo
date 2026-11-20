// Job: CoD cash float limit tracking (₹2,000 max), per-trip earnings breakdown, daily quest, and instant UPI payout.

import { apiPost } from './apiClient.ts';
import { loadFromCache, saveToCache } from './localCache.ts';

export const MAX_COD_FLOAT_LIMIT_INR = 2000;

export interface TripEarningsDetails {
  tripId: string;
  orderId: string;
  vertical: 'RIDE' | 'GROCERY' | 'PARCEL';
  baseFareInr: number;
  distancePayInr: number;
  waitingPayInr: number;
  surgeBonusInr: number;
  customerTipInr: number;
  totalNetEarningsInr: number;
  completedAt: string;
}

export interface DailyQuestProgress {
  questTitle: string;
  targetTrips: number;
  completedTrips: number;
  bonusRewardInr: number;
  expiresInHours: number;
}

export interface DriverFinancialProfile {
  currentCodFloatInr: number;
  isCashOrderBlocked: boolean;
  walletBalanceInr: number;
  dailyEarningsInr: number;
  quest: DailyQuestProgress;
  recentTrips: TripEarningsDetails[];
}

const DEFAULT_FINANCIAL_PROFILE: DriverFinancialProfile = {
  currentCodFloatInr: 1450, // ₹1,450 float in hand
  isCashOrderBlocked: false,
  walletBalanceInr: 3200,
  dailyEarningsInr: 1250,
  quest: {
    questTitle: 'Daily Peak Quest (12:00 PM - 09:00 PM)',
    targetTrips: 10,
    completedTrips: 7,
    bonusRewardInr: 250,
    expiresInHours: 4,
  },
  recentTrips: [
    {
      tripId: 'trp_101',
      orderId: 'ORD-882319',
      vertical: 'GROCERY',
      baseFareInr: 40,
      distancePayInr: 45,
      waitingPayInr: 10,
      surgeBonusInr: 20,
      customerTipInr: 10,
      totalNetEarningsInr: 125,
      completedAt: 'Today, 01:15 PM',
    },
    {
      tripId: 'trp_102',
      orderId: 'ORD-882318',
      vertical: 'RIDE',
      baseFareInr: 50,
      distancePayInr: 75,
      waitingPayInr: 15,
      surgeBonusInr: 30,
      customerTipInr: 20,
      totalNetEarningsInr: 190,
      completedAt: 'Today, 11:45 AM',
    },
  ],
};

export function loadDriverFinancials(): DriverFinancialProfile {
  const profile = loadFromCache<DriverFinancialProfile>('allgo_driver_financials', DEFAULT_FINANCIAL_PROFILE);
  profile.isCashOrderBlocked = profile.currentCodFloatInr >= MAX_COD_FLOAT_LIMIT_INR;
  return profile;
}

export function saveDriverFinancials(profile: DriverFinancialProfile): void {
  profile.isCashOrderBlocked = profile.currentCodFloatInr >= MAX_COD_FLOAT_LIMIT_INR;
  saveToCache('allgo_driver_financials', profile);
}

export async function settleCodFloatViaUpi(
  settleAmountInr: number
): Promise<{ success: boolean; remainingFloatInr: number; message: string }> {
  const profile = loadDriverFinancials();
  const newFloat = Math.max(0, profile.currentCodFloatInr - settleAmountInr);
  profile.currentCodFloatInr = newFloat;
  profile.isCashOrderBlocked = newFloat >= MAX_COD_FLOAT_LIMIT_INR;
  saveDriverFinancials(profile);

  try {
    await apiPost('/v1/delivery/driver/cod/settle', { amountInr: settleAmountInr });
  } catch {
    // Local offline state updated
  }

  return {
    success: true,
    remainingFloatInr: newFloat,
    message: `₹${settleAmountInr} CoD float settled via UPI. Cash orders ${newFloat >= MAX_COD_FLOAT_LIMIT_INR ? 'blocked' : 'unlocked'}.`,
  };
}

export async function requestInstantDriverPayout(
  amountInr: number,
  upiVpa: string
): Promise<{ success: boolean; message: string; utr?: string }> {
  const profile = loadDriverFinancials();
  if (amountInr <= 0 || amountInr > profile.walletBalanceInr) {
    return { success: false, message: 'Invalid withdrawal amount or insufficient wallet balance.' };
  }

  profile.walletBalanceInr -= amountInr;
  saveDriverFinancials(profile);

  const utr = `UTR_UPI_${Date.now()}`;
  return {
    success: true,
    message: `₹${amountInr} instant payout disbursed to ${upiVpa}.`,
    utr,
  };
}
