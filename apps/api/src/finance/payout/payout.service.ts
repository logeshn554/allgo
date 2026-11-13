import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import crypto from 'node:crypto';
import { DatabaseService } from '../../database/database.service.js';
import { LedgerService } from '../ledger/ledger.service.js';

export interface CreatePayoutDto {
  recipientType: 'MERCHANT' | 'PARTNER';
  recipientId: string;
  amountInr: number;
  destinationReference: string;
  settlementId?: string;
  idempotencyKey?: string;
}

@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);
  private readonly minPayoutThreshold = 100.00; // ₹100 min
  private readonly maxPayoutThreshold = 100000.00; // ₹1,00,000 max

  constructor(
    private readonly db: DatabaseService,
    private readonly ledger: LedgerService
  ) {}

  /**
   * Request / Schedule a payout
   */
  async createPayout(dto: CreatePayoutDto, requesterId?: string) {
    const { recipientType, recipientId, amountInr, destinationReference, settlementId, idempotencyKey } = dto;

    if (amountInr < this.minPayoutThreshold) {
      throw new BadRequestException(`Payout amount must be at least ₹${this.minPayoutThreshold}`);
    }
    if (amountInr > this.maxPayoutThreshold) {
      throw new BadRequestException(`Payout amount exceeds maximum threshold of ₹${this.maxPayoutThreshold}`);
    }

    const idemKey = idempotencyKey || `PO-${recipientType}-${recipientId}-${Date.now()}`;

    // Mask destination reference to prevent exposing full bank details
    const maskedDest = destinationReference.length > 4
      ? `****${destinationReference.slice(-4)}`
      : destinationReference;

    const existing = await this.db.query(
      `SELECT * FROM payouts WHERE idempotency_key = $1;`,
      [idemKey]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    const res = await this.db.query(
      `INSERT INTO payouts (
         recipient_type, recipient_id, payout_channel, gross_amount_inr, net_amount_inr,
         status, destination_reference, settlement_id, approved_by_admin_id, idempotency_key
       ) VALUES ($1, $2, 'RAZORPAYX', $3, $3, 'SCHEDULED', $4, $5, $6, $7)
       RETURNING *;`,
      [
        recipientType,
        recipientId,
        amountInr,
        maskedDest,
        settlementId || null,
        requesterId || null,
        idemKey,
      ]
    );

    return res.rows[0];
  }

  /**
   * Process Payout (Local mock/adapter for RazorpayX when live credentials are unconfigured)
   */
  async processPayout(payoutId: string, adminId: string) {
    const res = await this.db.query(`SELECT * FROM payouts WHERE id = $1;`, [payoutId]);
    if (res.rows.length === 0) {
      throw new NotFoundException(`Payout record not found: ${payoutId}`);
    }

    const payout = res.rows[0];
    if (payout.status !== 'SCHEDULED' && payout.status !== 'PROCESSING') {
      throw new BadRequestException(`Cannot process payout in status: ${payout.status}`);
    }

    // Simulate provider adapter execution
    const mockProviderPayoutId = `pout_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
    const amount = parseFloat(payout.net_amount_inr);

    const updated = await this.db.query(
      `UPDATE payouts
       SET status = 'SUCCESS', razorpayx_payout_id = $1, processed_at = NOW(),
           approved_by_admin_id = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *;`,
      [mockProviderPayoutId, adminId, payoutId]
    );

    // Ledger posting: clear payable account to escrow
    const txRef = `PAYOUT-${payoutId}`;
    const sourceAccount = payout.recipient_type === 'PARTNER' ? 'PARTNER_EARNINGS' : 'MERCHANT_SETTLEMENT';

    await this.ledger.postTransaction({
      transactionReference: txRef,
      description: `Disbursed Payout #${payoutId} via RazorpayX`,
      entries: [
        {
          partnerId: payout.recipient_type === 'PARTNER' ? payout.recipient_id : undefined,
          merchantId: payout.recipient_type === 'MERCHANT' ? payout.recipient_id : undefined,
          accountType: sourceAccount,
          direction: 'DEBIT',
          amountInr: amount,
          description: `Disbursement from ${sourceAccount}`,
          metadata: { payoutId, mockProviderPayoutId },
        },
        {
          accountType: 'GATEWAY_ESCROW',
          direction: 'CREDIT',
          amountInr: amount,
          description: `Bank transfer executed`,
          metadata: { payoutId, mockProviderPayoutId },
        },
      ],
      metadata: { payoutId, mockProviderPayoutId, adminId },
    });

    this.logger.log(`Disbursed payout ${payoutId} of ₹${amount} to ${payout.recipient_type} ${payout.recipient_id}`);

    return updated.rows[0];
  }

  /**
   * Payout history
   */
  async getPayoutHistory(recipientType: 'MERCHANT' | 'PARTNER', recipientId: string) {
    const res = await this.db.query(
      `SELECT * FROM payouts WHERE recipient_type = $1 AND recipient_id = $2 ORDER BY created_at DESC;`,
      [recipientType, recipientId]
    );
    return res.rows;
  }

  /**
   * List all payouts for admin review
   */
  async listAllPayouts(status?: string) {
    const query = status
      ? `SELECT * FROM payouts WHERE status = $1 ORDER BY created_at DESC;`
      : `SELECT * FROM payouts ORDER BY created_at DESC;`;
    const params = status ? [status] : [];
    const res = await this.db.query(query, params);
    return res.rows;
  }
}
