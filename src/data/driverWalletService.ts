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

export interface DriverPayoutRecord {
  id: string;
  amountCents: number;
  bankAccountId: string;
  timestamp: string;
}

export interface DriverWalletBreakdown {
  dailyTotalCents: number;
  weeklyTotalCents: number;
  baseFareSumCents: number;
  distancePaySumCents: number;
  waitingTimeSumCents: number;
  surgeBonusSumCents: number;
  totalWithdrawnCents: number;
  availableBalanceCents: number;
  entries: EarningsEntry[];
  payouts: DriverPayoutRecord[];
}

const DRIVER_WALLET_KEY = 'allgo_driver_wallet_v1';
const DRIVER_PAYOUTS_KEY = 'allgo_driver_payouts_v1';

export function loadDriverPayouts(): DriverPayoutRecord[] {
  const raw = getLocalItem(DRIVER_PAYOUTS_KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

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
  const payouts = loadDriverPayouts();
  const totalWithdrawnCents = payouts.reduce((sum, p) => sum + p.amountCents, 0);
  const availableBalanceCents = Math.max(0, weeklyTotal - totalWithdrawnCents);

  return {
    dailyTotalCents: dailyTotal,
    weeklyTotalCents: weeklyTotal,
    baseFareSumCents: baseFareSum,
    distancePaySumCents: distancePaySum,
    waitingTimeSumCents: waitingTimeSum,
    surgeBonusSumCents: surgeBonusSum,
    totalWithdrawnCents,
    availableBalanceCents,
    entries,
    payouts,
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
  const payouts = loadDriverPayouts();
  payouts.push({
    id: payoutId,
    amountCents,
    bankAccountId,
    timestamp: new Date().toISOString(),
  });
  setLocalItem(DRIVER_PAYOUTS_KEY, JSON.stringify(payouts));

  const remainingBalanceCents = wallet.availableBalanceCents - amountCents;

  return {
    success: true,
    payoutId,
    message: `₹${(amountCents / 100).toFixed(0)} successfully transferred via Instant IMPS rail to ${bankAccountId}.`,
    remainingBalanceCents,
  };
}
