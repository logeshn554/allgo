import { Injectable, BadRequestException, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import crypto from 'node:crypto';
import { DatabaseService } from '../../database/database.service.js';

export type AccountType =
  | 'CUSTOMER_WALLET'
  | 'MERCHANT_SETTLEMENT'
  | 'PARTNER_EARNINGS'
  | 'PLATFORM_COMMISSION'
  | 'PLATFORM_DELIVERY_FEES'
  | 'GATEWAY_ESCROW'
  | 'TAX_PAYABLE_GST'
  | 'TAX_WITHHELD_TCS'
  | 'TAX_WITHHELD_TDS'
  | 'COD_COLLECTED'
  | 'COD_HOLDING';

export type LedgerDirection = 'DEBIT' | 'CREDIT';

export interface LedgerEntryInput {
  walletId?: string;
  partnerId?: string;
  merchantId?: string;
  subOrderId?: string;
  rideId?: string;
  parcelId?: string;
  hireDriverBookingId?: string;
  accountType: AccountType;
  direction: LedgerDirection;
  amountInr: number;
  description: string;
  metadata?: Record<string, any>;
  isReversal?: boolean;
  reversalReference?: string;
}

export interface PostTransactionDto {
  transactionReference: string;
  description: string;
  entries: LedgerEntryInput[];
  metadata?: Record<string, any>;
}

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Post an immutable balanced double-entry transaction
   */
  async postTransaction(dto: PostTransactionDto, externalClient?: any): Promise<{ transactionId: string; entryCount: number; balancedAmount: number }> {
    const { transactionReference, entries, metadata } = dto;

    if (!entries || entries.length < 2) {
      throw new BadRequestException('A double-entry transaction must contain at least two entries.');
    }

    // Verify amounts and calculate debit / credit sums
    let totalDebit = 0;
    let totalCredit = 0;

    for (const entry of entries) {
      if (typeof entry.amountInr !== 'number' || entry.amountInr <= 0 || isNaN(entry.amountInr)) {
        throw new BadRequestException(`Invalid entry amount: ${entry.amountInr}. All entries must have amount > 0.`);
      }
      // Round to 2 decimal places to avoid IEEE 754 precision issues
      const roundedAmount = Math.round(entry.amountInr * 100) / 100;
      entry.amountInr = roundedAmount;

      if (entry.direction === 'DEBIT') {
        totalDebit = Math.round((totalDebit + roundedAmount) * 100) / 100;
      } else if (entry.direction === 'CREDIT') {
        totalCredit = Math.round((totalCredit + roundedAmount) * 100) / 100;
      } else {
        throw new BadRequestException(`Invalid ledger direction: ${entry.direction}`);
      }
    }

    // Balancing Rule: Total Debits must equal Total Credits
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new BadRequestException(
        `Double-entry invariant violation: Total DEBIT (₹${totalDebit.toFixed(2)}) does not equal Total CREDIT (₹${totalCredit.toFixed(2)}). Transaction cannot be posted.`
      );
    }

    const runner = externalClient || this.db;

    // Idempotency check on transaction_reference
    const existing = await runner.query(
      `SELECT ledger_transaction_id FROM ledger_entries WHERE transaction_reference = $1 LIMIT 1;`,
      [transactionReference]
    );

    if (existing.rows.length > 0) {
      return {
        transactionId: existing.rows[0].ledger_transaction_id,
        entryCount: entries.length,
        balancedAmount: totalDebit,
      };
    }

    const transactionId = crypto.randomUUID();

    // Begin atomic transaction if using database service directly
    const shouldManageTx = !externalClient;
    if (shouldManageTx) {
      await this.db.query('BEGIN;');
    }

    try {
      for (const entry of entries) {
        let balanceAfter: number | null = null;

        // If this entry touches a wallet, update wallet balance atomically
        if (entry.walletId) {
          const walletRes = await runner.query(
            `SELECT balance_inr FROM wallets WHERE id = $1 FOR UPDATE;`,
            [entry.walletId]
          );

          if (walletRes.rows.length === 0) {
            throw new NotFoundException(`Wallet not found: ${entry.walletId}`);
          }

          const currentBalance = parseFloat(walletRes.rows[0].balance_inr);
          // For wallet liability account: CREDIT increases user balance, DEBIT decreases user balance
          if (entry.direction === 'CREDIT') {
            balanceAfter = Math.round((currentBalance + entry.amountInr) * 100) / 100;
          } else {
            balanceAfter = Math.round((currentBalance - entry.amountInr) * 100) / 100;
            if (balanceAfter < 0) {
              throw new BadRequestException(`Insufficient wallet balance. Available: ₹${currentBalance}, Requested Debit: ₹${entry.amountInr}`);
            }
          }

          await runner.query(
            `UPDATE wallets SET balance_inr = $1, updated_at = NOW() WHERE id = $2;`,
            [balanceAfter, entry.walletId]
          );
        }

        await runner.query(
          `INSERT INTO ledger_entries (
            wallet_id, sub_order_id, ride_id, parcel_id, hire_driver_booking_id,
            partner_id, merchant_id, ledger_transaction_id, transaction_reference,
            account_type, direction, amount_inr, balance_after_inr, description,
            metadata, is_reversal, reversal_reference, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW()
          );`,
          [
            entry.walletId || null,
            entry.subOrderId || null,
            entry.rideId || null,
            entry.parcelId || null,
            entry.hireDriverBookingId || null,
            entry.partnerId || null,
            entry.merchantId || null,
            transactionId,
            transactionReference,
            entry.accountType,
            entry.direction,
            entry.amountInr,
            balanceAfter,
            entry.description || dto.description,
            JSON.stringify(entry.metadata || metadata || {}),
            Boolean(entry.isReversal),
            entry.reversalReference || null,
          ]
        );
      }

      if (shouldManageTx) {
        await this.db.query('COMMIT;');
      }

      this.logger.log(`Posted balanced ledger transaction ${transactionId} (Ref: ${transactionReference}, Total: ₹${totalDebit})`);

      return {
        transactionId,
        entryCount: entries.length,
        balancedAmount: totalDebit,
      };
    } catch (err) {
      if (shouldManageTx) {
        await this.db.query('ROLLBACK;');
      }
      throw err;
    }
  }

  /**
   * Post compensating reversal transaction
   */
  async postReversal(originalReference: string, reason: string): Promise<{ reversalTransactionId: string; reversalReference: string }> {
    const origEntriesRes = await this.db.query(
      `SELECT * FROM ledger_entries WHERE transaction_reference = $1;`,
      [originalReference]
    );

    if (origEntriesRes.rows.length === 0) {
      throw new NotFoundException(`Original transaction with reference ${originalReference} not found`);
    }

    const reversalReference = `REV-${originalReference}-${Date.now().toString(36)}`;

    // Build compensating entries with reversed directions
    const compensatingEntries: LedgerEntryInput[] = origEntriesRes.rows.map((row) => ({
      walletId: row.wallet_id,
      partnerId: row.partner_id,
      merchantId: row.merchant_id,
      subOrderId: row.sub_order_id,
      rideId: row.ride_id,
      parcelId: row.parcel_id,
      hireDriverBookingId: row.hire_driver_booking_id,
      accountType: row.account_type as AccountType,
      direction: row.direction === 'DEBIT' ? 'CREDIT' : 'DEBIT',
      amountInr: parseFloat(row.amount_inr),
      description: `Reversal of ${originalReference}: ${reason}`,
      metadata: { originalReference, reason, isReversal: true },
      isReversal: true,
      reversalReference: originalReference,
    }));

    const result = await this.postTransaction({
      transactionReference: reversalReference,
      description: `Reversal of ${originalReference}`,
      entries: compensatingEntries,
      metadata: { originalReference, reason },
    });

    // Note: In strict double-entry ledger bookkeeping, posted entries are immutable
    // and protected by database trigger trg_prevent_ledger_update. The compensating
    // entries created above carry is_reversal = TRUE and reversal_reference pointing to originalReference.

    return {
      reversalTransactionId: result.transactionId,
      reversalReference,
    };
  }

  /**
   * Retrieve ledger entries with flexible filters
   */
  async getEntries(filter: {
    walletId?: string;
    partnerId?: string;
    merchantId?: string;
    accountType?: string;
    transactionReference?: string;
    limit?: number;
    offset?: number;
  }) {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (filter.walletId) {
      conditions.push(`wallet_id = $${idx++}`);
      values.push(filter.walletId);
    }
    if (filter.partnerId) {
      conditions.push(`partner_id = $${idx++}`);
      values.push(filter.partnerId);
    }
    if (filter.merchantId) {
      conditions.push(`merchant_id = $${idx++}`);
      values.push(filter.merchantId);
    }
    if (filter.accountType) {
      conditions.push(`account_type = $${idx++}`);
      values.push(filter.accountType);
    }
    if (filter.transactionReference) {
      conditions.push(`transaction_reference = $${idx++}`);
      values.push(filter.transactionReference);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filter.limit || 50;
    const offset = filter.offset || 0;

    const res = await this.db.query(
      `SELECT * FROM ledger_entries ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset};`,
      values
    );

    return res.rows;
  }
}
