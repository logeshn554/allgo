import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { PayoutGateway } from '../gateways/payout-gateway.interface.js';
import { RazorpayXPayoutGateway } from '../gateways/razorpayx-payout.gateway.js';
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
  private readonly minPayoutThreshold = 100.0;
  private readonly maxPayoutThreshold = 100000.0;
  private readonly gateway: PayoutGateway;

  constructor(
    private readonly db: DatabaseService,
    private readonly ledger: LedgerService,
    @Optional() gateway?: PayoutGateway,
  ) {
    this.gateway = gateway || new RazorpayXPayoutGateway();
  }

  async createPayout(dto: CreatePayoutDto, requesterId?: string) {
    const {
      recipientType,
      recipientId,
      amountInr,
      destinationReference,
      settlementId,
      idempotencyKey,
    } = dto;

    if (amountInr < this.minPayoutThreshold) {
      throw new BadRequestException(`Payout amount must be at least ₹${this.minPayoutThreshold}`);
    }
    if (amountInr > this.maxPayoutThreshold) {
      throw new BadRequestException(
        `Payout amount exceeds maximum threshold of ₹${this.maxPayoutThreshold}`,
      );
    }

    const idemKey = idempotencyKey || `PO-${recipientType}-${recipientId}-${Date.now()}`;
    const maskedDest =
      destinationReference.length > 4
        ? `****${destinationReference.slice(-4)}`
        : destinationReference;

    const existing = await this.db.query(`SELECT * FROM payouts WHERE idempotency_key = $1;`, [
      idemKey,
    ]);
    if (existing.rows.length > 0) return existing.rows[0];

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
      ],
    );
    return res.rows[0];
  }

  async processPayout(payoutId: string, adminId: string) {
    const res = await this.db.query(`SELECT * FROM payouts WHERE id = $1;`, [payoutId]);
    if (res.rows.length === 0) throw new NotFoundException(`Payout record not found: ${payoutId}`);

    const payout = res.rows[0];
    if (payout.status !== 'SCHEDULED' && payout.status !== 'PROCESSING') {
      throw new BadRequestException(`Cannot process payout in status: ${payout.status}`);
    }

    const amount = Number.parseFloat(payout.net_amount_inr);
    const rzpResult = await this.gateway.createPayout({
      accountNumber: process.env.RAZORPAYX_ACCOUNT_NUMBER || '2323230041122334',
      amountInr: amount,
      referenceId: `pout_ref_${payoutId}`,
      notes: { payoutId, recipientType: payout.recipient_type, recipientId: payout.recipient_id },
    });

    const finalStatus =
      rzpResult.status === 'processing' || rzpResult.status === 'queued' ? 'PROCESSING' : 'SUCCESS';

    const updated = await this.db.query(
      `UPDATE payouts
       SET status = $1, razorpayx_payout_id = $2, processed_at = NOW(),
           approved_by_admin_id = $3, updated_at = NOW()
       WHERE id = $4 RETURNING *;`,
      [finalStatus, rzpResult.id, adminId, payoutId],
    );

    const txRef = `PAYOUT-${payoutId}`;
    const sourceAccount =
      payout.recipient_type === 'PARTNER' ? 'PARTNER_EARNINGS' : 'MERCHANT_SETTLEMENT';

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
          metadata: { payoutId, razorpayxPayoutId: rzpResult.id },
        },
        {
          accountType: 'GATEWAY_ESCROW',
          direction: 'CREDIT',
          amountInr: amount,
          description: `Bank transfer executed`,
          metadata: { payoutId, razorpayxPayoutId: rzpResult.id },
        },
      ],
      metadata: { payoutId, razorpayxPayoutId: rzpResult.id, adminId },
    });

    return updated.rows[0];
  }

  async handlePayoutWebhook(
    event: string,
    payload: any,
  ): Promise<{ handled: boolean; status: string }> {
    const payoutEntity = payload?.payout?.entity;
    if (!payoutEntity?.id) return { handled: false, status: 'NO_PAYOUT_ENTITY' };

    const razorpayxPayoutId = payoutEntity.id;
    const res = await this.db.query(`SELECT * FROM payouts WHERE razorpayx_payout_id = $1;`, [
      razorpayxPayoutId,
    ]);
    if (res.rows.length === 0) return { handled: false, status: 'PAYOUT_NOT_FOUND' };

    const payout = res.rows[0];
    const amount = Number.parseFloat(payout.net_amount_inr);

    if (event === 'payout.processed') {
      await this.db.query(
        `UPDATE payouts SET status = 'SUCCESS', updated_at = NOW() WHERE id = $1;`,
        [payout.id],
      );
      return { handled: true, status: 'SUCCESS' };
    }

    if (event === 'payout.failed' || event === 'payout.rejected') {
      const reason = payoutEntity.failure_reason || 'Payout transaction failed at bank';
      await this.db.query(
        `UPDATE payouts SET status = 'FAILED', failure_reason = $1, updated_at = NOW() WHERE id = $2;`,
        [reason, payout.id],
      );
      await this.reconcileReversal(payout, amount, reason);
      return { handled: true, status: 'FAILED' };
    }

    if (event === 'payout.reversed') {
      const reason = payoutEntity.failure_reason || 'Payout reversed by banking network';
      await this.db.query(
        `UPDATE payouts SET status = 'FAILED', failure_reason = $1, updated_at = NOW() WHERE id = $2;`,
        [reason, payout.id],
      );
      await this.reconcileReversal(payout, amount, reason);
      return { handled: true, status: 'REVERSED' };
    }

    return { handled: true, status: event };
  }

  private async reconcileReversal(payout: any, amount: number, reason: string): Promise<void> {
    const revRef = `REV-PAYOUT-${payout.id}`;
    const sourceAccount =
      payout.recipient_type === 'PARTNER' ? 'PARTNER_EARNINGS' : 'MERCHANT_SETTLEMENT';

    try {
      await this.ledger.postTransaction({
        transactionReference: revRef,
        description: `Compensating Reversal for Payout #${payout.id}: ${reason}`,
        entries: [
          {
            accountType: 'GATEWAY_ESCROW',
            direction: 'DEBIT',
            amountInr: amount,
            description: `Escrow refund on failed payout`,
            metadata: { payoutId: payout.id },
          },
          {
            partnerId: payout.recipient_type === 'PARTNER' ? payout.recipient_id : undefined,
            merchantId: payout.recipient_type === 'MERCHANT' ? payout.recipient_id : undefined,
            accountType: sourceAccount,
            direction: 'CREDIT',
            amountInr: amount,
            description: `Restored payable balance after reversal`,
            metadata: { payoutId: payout.id },
          },
        ],
        metadata: { payoutId: payout.id, reason },
      });
      this.logger.log(`Reconciled payout reversal for ${payout.id} of ₹${amount}`);
    } catch (err: any) {
      this.logger.error(`Failed to reconcile reversal for payout ${payout.id}: ${err.message}`);
    }
  }

  async getPayoutHistory(recipientType: 'MERCHANT' | 'PARTNER', recipientId: string) {
    const res = await this.db.query(
      `SELECT * FROM payouts WHERE recipient_type = $1 AND recipient_id = $2 ORDER BY created_at DESC;`,
      [recipientType, recipientId],
    );
    return res.rows;
  }

  async listAllPayouts(status?: string) {
    const query = status
      ? `SELECT * FROM payouts WHERE status = $1 ORDER BY created_at DESC;`
      : `SELECT * FROM payouts ORDER BY created_at DESC;`;
    const res = await this.db.query(query, status ? [status] : []);
    return res.rows;
  }
}
