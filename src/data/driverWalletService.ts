// Job: Driver transparent earnings breakdown (base fare, distance, wait, surge) and instant withdrawal.

import { getLocalItem, setLocalItem } from './localCache.ts';

export interface EarningsEntry {
  id: string;
  orderId: string;
  date: string; // YYYY-MM-DD
  baseFareCents: number;
  distancePayCents: number;
  waitingTimePayCents: number;
  surgeBonusCents: number;
  totalCents: number;
}

export interface DriverWalletBreakdown {
  dailyTotalCents: number;
  weeklyTotalCents: number;
  baseFareSumCents: number;
  distancePaySumCents: number;
  waitingTimeSumCents: number;
  surgeBonusSumCents: number;
  availableBalanceCents: number;
  entries: EarningsEntry[];
}

const DRIVER_WALLET_KEY = 'allgo_driver_wallet_v1';

const DEFAULT_ENTRIES: EarningsEntry[] = [
  {
    id: 'earn_1',
    orderId: 'ORD-55441',
    date: new Date().toISOString().split('T')[0] ?? '2026-11-14',
    baseFareCents: 4000,
    distancePayCents: 3500,
    waitingTimePayCents: 1000,
    surgeBonusCents: 2000,
    totalCents: 10500, // ₹105
  },
  {
    id: 'earn_2',
    orderId: 'ORD-55442',
    date: new Date().toISOString().split('T')[0] ?? '2026-11-14',
    baseFareCents: 4000,
    distancePayCents: 2800,
    waitingTimePayCents: 500,
    surgeBonusCents: 1500,
    totalCents: 8800, // ₹88
  },
];

export function loadDriverEarnings(): DriverWalletBreakdown {
  const raw = getLocalItem(DRIVER_WALLET_KEY);
  const entries: EarningsEntry[] = raw ? JSON.parse(raw) : DEFAULT_ENTRIES;

  let baseFareSum = 0;
  let distancePaySum = 0;
  let waitingTimeSum = 0;
  let surgeBonusSum = 0;
  let dailyTotal = 0;

  const today = new Date().toISOString().split('T')[0];

  for (const e of entries) {
    baseFareSum += e.baseFareCents;
    distancePaySum += e.distancePayCents;
    waitingTimeSum += e.waitingTimePayCents;
    surgeBonusSum += e.surgeBonusCents;
    if (e.date === today) {
      dailyTotal += e.totalCents;
    }
  }

  const weeklyTotal = baseFareSum + distancePaySum + waitingTimeSum + surgeBonusSum;

  return {
    dailyTotalCents: dailyTotal,
    weeklyTotalCents: weeklyTotal,
    baseFareSumCents: baseFareSum,
    distancePaySumCents: distancePaySum,
    waitingTimeSumCents: waitingTimeSum,
    surgeBonusSumCents: surgeBonusSum,
    availableBalanceCents: weeklyTotal,
    entries,
  };
}

export function requestInstantPayout(
  amountCents: number,
  bankAccountId: string = 'bank_verified_1'
): { success: boolean; payoutId: string; message: string; remainingBalanceCents: number } {
  const wallet = loadDriverEarnings();
  if (amountCents <= 0 || amountCents > wallet.availableBalanceCents) {
    return {
      success: false,
      payoutId: '',
      message: 'Withdrawal amount exceeds available wallet earnings.',
      remainingBalanceCents: wallet.availableBalanceCents,
    };
  }

  const payoutId = `PAYOUT-IMPS-${Math.floor(100000 + Math.random() * 900000)}`;
  setLocalItem(DRIVER_WALLET_KEY, JSON.stringify([]));

  return {
    success: true,
    payoutId,
    message: `₹${(amountCents / 100).toFixed(0)} successfully transferred via Instant IMPS rail to ${bankAccountId}.`,
    remainingBalanceCents: 0,
  };
}
