import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { LedgerService } from '../ledger/ledger.service.js';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly ledger: LedgerService
  ) {}

  /**
   * Get or create wallet for a user
   */
  async getOrCreateWallet(userId: string) {
    let res = await this.db.query(
      `SELECT * FROM wallets WHERE user_id = $1;`,
      [userId]
    );

    if (res.rows.length === 0) {
      res = await this.db.query(
        `INSERT INTO wallets (user_id, balance_inr, promotional_balance_inr, refundable_balance_inr)
         VALUES ($1, 0.00, 0.00, 0.00)
         RETURNING *;`,
        [userId]
      );
    }

    const wallet = res.rows[0];

    // Reconcile and verify against authoritative ledger entries
    const ledgerSumRes = await this.db.query(
      `SELECT 
         COALESCE(SUM(CASE WHEN direction = 'CREDIT' THEN amount_inr ELSE -amount_inr END), 0.00) as ledger_balance
       FROM ledger_entries
       WHERE wallet_id = $1;`,
      [wallet.id]
    );

    const calculatedBalance = parseFloat(ledgerSumRes.rows[0]?.ledger_balance || '0.00');
    const storedBalance = parseFloat(wallet.balance_inr);

    // If drift is detected, align with authoritative ledger
    if (Math.abs(calculatedBalance - storedBalance) > 0.009) {
      this.logger.warn(`Wallet drift detected for user ${userId}. Stored: ₹${storedBalance}, Ledger: ₹${calculatedBalance}. Reconciling.`);
      await this.db.query(
        `UPDATE wallets SET balance_inr = $1, updated_at = NOW() WHERE id = $2;`,
        [calculatedBalance, wallet.id]
      );
      wallet.balance_inr = calculatedBalance.toFixed(2);
    }

    return {
      id: wallet.id,
      userId: wallet.user_id,
      balanceInr: parseFloat(wallet.balance_inr),
      promotionalBalanceInr: parseFloat(wallet.promotional_balance_inr || '0.00'),
      refundableBalanceInr: parseFloat(wallet.refundable_balance_inr || '0.00'),
      currency: wallet.currency || 'INR',
      isLocked: Boolean(wallet.is_locked),
    };
  }

  /**
   * Credit customer wallet with double-entry balancing
   */
  async creditWallet(
    userId: string,
    amountInr: number,
    reason: string,
    reference?: string,
    isPromotional = false
  ) {
    if (amountInr <= 0) {
      throw new BadRequestException('Credit amount must be positive');
    }

    const wallet = await this.getOrCreateWallet(userId);
    if (wallet.isLocked) {
      throw new BadRequestException('Wallet is locked. Cannot process credit.');
    }

    const txRef = reference || `WAL-CR-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const sourceAccount = isPromotional ? 'PLATFORM_COMMISSION' : 'GATEWAY_ESCROW';

    await this.ledger.postTransaction({
      transactionReference: txRef,
      description: `Wallet Credit: ${reason}`,
      entries: [
        {
          accountType: sourceAccount,
          direction: 'DEBIT',
          amountInr,
          description: `Transfer to user wallet for ${reason}`,
          metadata: { userId, isPromotional },
        },
        {
          walletId: wallet.id,
          accountType: 'CUSTOMER_WALLET',
          direction: 'CREDIT',
          amountInr,
          description: reason,
          metadata: { userId, isPromotional },
        },
      ],
      metadata: { userId, isPromotional, reason },
    });

    if (isPromotional) {
      await this.db.query(
        `UPDATE wallets SET promotional_balance_inr = promotional_balance_inr + $1 WHERE id = $2;`,
        [amountInr, wallet.id]
      );
    } else {
      await this.db.query(
        `UPDATE wallets SET refundable_balance_inr = refundable_balance_inr + $1 WHERE id = $2;`,
        [amountInr, wallet.id]
      );
    }

    return this.getOrCreateWallet(userId);
  }

  /**
   * Debit customer wallet with double-entry balancing
   */
  async debitWallet(
    userId: string,
    amountInr: number,
    reason: string,
    reference?: string,
    targetAccount: 'GATEWAY_ESCROW' | 'MERCHANT_SETTLEMENT' | 'PARTNER_EARNINGS' = 'GATEWAY_ESCROW'
  ) {
    if (amountInr <= 0) {
      throw new BadRequestException('Debit amount must be positive');
    }

    const wallet = await this.getOrCreateWallet(userId);
    if (wallet.isLocked) {
      throw new BadRequestException('Wallet is locked. Cannot process debit.');
    }

    if (wallet.balanceInr < amountInr) {
      throw new BadRequestException(`Insufficient wallet balance. Available: ₹${wallet.balanceInr}, Requested: ₹${amountInr}`);
    }

    const txRef = reference || `WAL-DR-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    await this.ledger.postTransaction({
      transactionReference: txRef,
      description: `Wallet Debit: ${reason}`,
      entries: [
        {
          walletId: wallet.id,
          accountType: 'CUSTOMER_WALLET',
          direction: 'DEBIT',
          amountInr,
          description: reason,
          metadata: { userId },
        },
        {
          accountType: targetAccount,
          direction: 'CREDIT',
          amountInr,
          description: `Transfer from user wallet for ${reason}`,
          metadata: { userId },
        },
      ],
      metadata: { userId, reason },
    });

    // Synchronize promotional and refundable sub-balances
    const promoAvailable = wallet.promotionalBalanceInr || 0;
    const promoDeduct = Math.round(Math.min(promoAvailable, amountInr) * 100) / 100;
    const refundableDeduct = Math.round((amountInr - promoDeduct) * 100) / 100;

    await this.db.query(
      `UPDATE wallets 
       SET promotional_balance_inr = GREATEST(0.00, promotional_balance_inr - $1),
           refundable_balance_inr = GREATEST(0.00, refundable_balance_inr - $2),
           updated_at = NOW()
       WHERE id = $3;`,
      [promoDeduct, refundableDeduct, wallet.id]
    );

    return this.getOrCreateWallet(userId);
  }

  /**
   * Get transaction history for user's wallet
   */
  async getWalletTransactions(userId: string, limit = 50, offset = 0) {
    const wallet = await this.getOrCreateWallet(userId);
    return this.ledger.getEntries({
      walletId: wallet.id,
      limit,
      offset,
    });
  }
}
