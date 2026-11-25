import crypto from 'node:crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { LedgerService } from '../ledger/ledger.service.js';

export interface WalletTopupOrderResult {
  orderId: string;
  gatewayOrderId: string;
  amountInr: number;
  currency: string;
  keyId?: string;
  status: string;
}

export interface WebhookResult {
  handled: boolean;
  event: string;
  idempotentDuplicate?: boolean;
  creditedWallet?: any;
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  private readonly razorpayKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';

  constructor(
    private readonly db: DatabaseService,
    private readonly ledger: LedgerService,
  ) {}

  async getOrCreateWallet(userId: string, runnerClient?: any) {
    const runner = runnerClient || this.db;
    let res = await runner.query(`SELECT * FROM wallets WHERE user_id = $1;`, [userId]);

    if (res.rows.length === 0) {
      res = await runner.query(
        `INSERT INTO wallets (user_id, balance_inr, promotional_balance_inr, refundable_balance_inr)
         VALUES ($1, 0.00, 0.00, 0.00)
         RETURNING *;`,
        [userId],
      );
    }

    const wallet = res.rows[0];

    const ledgerSumRes = await runner.query(
      `SELECT 
         COALESCE(SUM(CASE WHEN direction = 'CREDIT' THEN amount_inr ELSE -amount_inr END), 0.00) as ledger_balance
       FROM ledger_entries
       WHERE wallet_id = $1;`,
      [wallet.id],
    );

    const calculatedBalance = Number.parseFloat(ledgerSumRes.rows[0]?.ledger_balance || '0.00');
    const storedBalance = Number.parseFloat(wallet.balance_inr);

    if (Math.abs(calculatedBalance - storedBalance) > 0.009) {
      this.logger.warn(
        `Wallet drift detected for user ${userId}. Stored: ₹${storedBalance}, Ledger: ₹${calculatedBalance}. Reconciling.`,
      );
      await runner.query(`UPDATE wallets SET balance_inr = $1, updated_at = NOW() WHERE id = $2;`, [
        calculatedBalance,
        wallet.id,
      ]);
      wallet.balance_inr = calculatedBalance.toFixed(2);
    }

    return {
      id: wallet.id,
      userId: wallet.user_id,
      balanceInr: Number.parseFloat(wallet.balance_inr),
      promotionalBalanceInr: Number.parseFloat(wallet.promotional_balance_inr || '0.00'),
      refundableBalanceInr: Number.parseFloat(wallet.refundable_balance_inr || '0.00'),
      currency: wallet.currency || 'INR',
      isLocked: Boolean(wallet.is_locked),
    };
  }

  async createTopupOrder(userId: string, amountInr: number): Promise<WalletTopupOrderResult> {
    if (typeof amountInr !== 'number' || isNaN(amountInr) || amountInr <= 0) {
      throw new BadRequestException('Topup amount must be a positive number');
    }

    const wallet = await this.getOrCreateWallet(userId);
    if (wallet.isLocked) {
      throw new BadRequestException('Wallet is locked. Cannot process topup.');
    }

    const gatewayOrderId = `order_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
    const idempotencyKey = `topup-${userId}-${gatewayOrderId}`;

    const res = await this.db.query(
      `INSERT INTO payment_transactions (
         customer_id, gateway_name, gateway_order_id, idempotency_key, payment_method, amount_inr, currency, status, metadata
       ) VALUES ($1, 'RAZORPAY', $2, $3, 'WALLET', $4, 'INR', 'PENDING', $5)
       RETURNING *;`,
      [
        userId,
        gatewayOrderId,
        idempotencyKey,
        amountInr,
        JSON.stringify({ type: 'WALLET_TOPUP', userId }),
      ],
    );

    return {
      orderId: res.rows[0].id,
      gatewayOrderId,
      amountInr,
      currency: 'INR',
      keyId: this.razorpayKeyId,
      status: 'PENDING',
    };
  }

  async creditWallet(
    userId: string,
    amountInr: number,
    reason: string,
    reference?: string,
    isPromotional = false,
    runnerClient?: any,
  ) {
    if (amountInr <= 0) {
      throw new BadRequestException('Credit amount must be positive');
    }

    const runner = runnerClient || this.db;
    const wallet = await this.getOrCreateWallet(userId, runnerClient);
    if (wallet.isLocked) {
      throw new BadRequestException('Wallet is locked. Cannot process credit.');
    }

    const txRef =
      reference ||
      `WAL-CR-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const sourceAccount = isPromotional ? 'PLATFORM_COMMISSION' : 'GATEWAY_ESCROW';

    await this.ledger.postTransaction(
      {
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
      },
      runnerClient,
    );

    if (isPromotional) {
      await runner.query(
        `UPDATE wallets SET promotional_balance_inr = promotional_balance_inr + $1 WHERE id = $2;`,
        [amountInr, wallet.id],
      );
    } else {
      await runner.query(
        `UPDATE wallets SET refundable_balance_inr = refundable_balance_inr + $1 WHERE id = $2;`,
        [amountInr, wallet.id],
      );
    }

    return this.getOrCreateWallet(userId, runnerClient);
  }

  async debitWallet(
    userId: string,
    amountInr: number,
    reason: string,
    reference?: string,
    targetAccount: 'GATEWAY_ESCROW' | 'MERCHANT_SETTLEMENT' | 'PARTNER_EARNINGS' = 'GATEWAY_ESCROW',
    runnerClient?: any,
  ) {
    if (amountInr <= 0) {
      throw new BadRequestException('Debit amount must be positive');
    }

    const runner = runnerClient || this.db;
    const wallet = await this.getOrCreateWallet(userId, runnerClient);
    if (wallet.isLocked) {
      throw new BadRequestException('Wallet is locked. Cannot process debit.');
    }

    if (wallet.balanceInr < amountInr) {
      throw new BadRequestException(
        `Insufficient wallet balance. Available: ₹${wallet.balanceInr}, Requested: ₹${amountInr}`,
      );
    }

    const txRef =
      reference ||
      `WAL-DR-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    await this.ledger.postTransaction(
      {
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
      },
      runnerClient,
    );

    const promoAvailable = wallet.promotionalBalanceInr || 0;
    const promoDeduct = Math.round(Math.min(promoAvailable, amountInr) * 100) / 100;
    const refundableDeduct = Math.round((amountInr - promoDeduct) * 100) / 100;

    await runner.query(
      `UPDATE wallets 
       SET promotional_balance_inr = GREATEST(0.00, promotional_balance_inr - $1),
           refundable_balance_inr = GREATEST(0.00, refundable_balance_inr - $2),
           updated_at = NOW()
       WHERE id = $3;`,
      [promoDeduct, refundableDeduct, wallet.id],
    );

    return this.getOrCreateWallet(userId, runnerClient);
  }

  async getWalletTransactions(userId: string, limit = 50, offset = 0) {
    const wallet = await this.getOrCreateWallet(userId);
    return this.ledger.getEntries({
      walletId: wallet.id,
      limit,
      offset,
    });
  }
}
