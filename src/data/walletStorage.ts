// Job: Closed-loop digital wallet management, multi-tender split calculations, and instant refund credits.

import { getLocalItem, setLocalItem } from './localCache.ts';

export interface WalletTransaction {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amountCents: number;
  reason: string;
  orderId?: string;
  timestamp: string;
}

export interface WalletState {
  balanceCents: number;
  currency: string;
  transactions: WalletTransaction[];
}

const WALLET_KEY = 'allgo_digital_wallet_v1';

export function loadWalletState(): WalletState {
  const raw = getLocalItem(WALLET_KEY);
  if (!raw) {
    const initial: WalletState = {
      balanceCents: 25000, // ₹250 promotional opening balance
      currency: 'INR',
      transactions: [
        {
          id: 'tx_init_1',
          type: 'CREDIT',
          amountCents: 25000,
          reason: 'AllGo Welcome Credits',
          timestamp: new Date().toISOString(),
        },
      ],
    };
    setLocalItem(WALLET_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(raw);
  } catch (_e) {
    return { balanceCents: 0, currency: 'INR', transactions: [] };
  }
}

export function creditWallet(amountCents: number, reason: string, orderId?: string): WalletState {
  const state = loadWalletState();
  const tx: WalletTransaction = {
    id: `tx_${Date.now()}`,
    type: 'CREDIT',
    amountCents,
    reason,
    orderId,
    timestamp: new Date().toISOString(),
  };

  const updated: WalletState = {
    balanceCents: state.balanceCents + amountCents,
    currency: 'INR',
    transactions: [tx, ...state.transactions],
  };

  setLocalItem(WALLET_KEY, JSON.stringify(updated));
  return updated;
}

export function debitWallet(amountCents: number, reason: string, orderId?: string): { success: boolean; state: WalletState } {
  const state = loadWalletState();
  if (state.balanceCents < amountCents) {
    return { success: false, state };
  }

  const tx: WalletTransaction = {
    id: `tx_${Date.now()}`,
    type: 'DEBIT',
    amountCents,
    reason,
    orderId,
    timestamp: new Date().toISOString(),
  };

  const updated: WalletState = {
    balanceCents: state.balanceCents - amountCents,
    currency: 'INR',
    transactions: [tx, ...state.transactions],
  };

  setLocalItem(WALLET_KEY, JSON.stringify(updated));
  return { success: true, state: updated };
}

export interface MultiTenderSplit {
  totalCents: number;
  useWallet: boolean;
  walletDeductionCents: number;
  remainderCents: number;
  secondaryMethod: 'upi' | 'card' | 'cod';
}

export function calculatePaymentSplit(
  totalCents: number,
  useWallet: boolean,
  secondaryMethod: 'upi' | 'card' | 'cod'
): MultiTenderSplit {
  const wallet = loadWalletState();
  if (!useWallet || wallet.balanceCents <= 0) {
    return {
      totalCents,
      useWallet: false,
      walletDeductionCents: 0,
      remainderCents: totalCents,
      secondaryMethod,
    };
  }

  const deduction = Math.min(wallet.balanceCents, totalCents);
  const remainder = totalCents - deduction;

  return {
    totalCents,
    useWallet: true,
    walletDeductionCents: deduction,
    remainderCents: remainder,
    secondaryMethod,
  };
}
