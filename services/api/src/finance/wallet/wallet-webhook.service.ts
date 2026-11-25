import crypto from 'node:crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { WalletService, WebhookResult } from './wallet.service.js';

@Injectable()
export class WalletWebhookService {
  private readonly logger = new Logger(WalletWebhookService.name);
  private readonly razorpayKeySecret =
    process.env.RAZORPAY_WEBHOOK_SECRET ||
    process.env.RAZORPAY_KEY_SECRET ||
    'local_test_razorpay_secret_key_12345';

  constructor(
    private readonly db: DatabaseService,
    private readonly wallet: WalletService,
  ) {}

  async handlePaymentWebhook(
    rawBody: string | Buffer,
    signature: string,
    eventPayload: any,
  ): Promise<WebhookResult> {
    const rawBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody || '', 'utf8');
    const expectedSignature = crypto
      .createHmac('sha256', this.razorpayKeySecret)
      .update(rawBuffer)
      .digest('hex');

    const sigBuf = Buffer.from((signature || '').trim(), 'utf8');
    const expBuf = Buffer.from(expectedSignature, 'utf8');
    const isValid = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);

    if (!isValid) {
      throw new BadRequestException('Invalid Razorpay webhook signature');
    }

    const event = eventPayload?.event;
    const paymentEntity = eventPayload?.payload?.payment?.entity;
    if (!paymentEntity) {
      return { handled: false, event: event || 'unknown' };
    }

    const gatewayOrderId = paymentEntity.order_id;
    const gatewayPaymentId = paymentEntity.id;
    const paymentAmountInr = (paymentEntity.amount || 0) / 100;

    const transRes = await this.db.query(
      `SELECT * FROM payment_transactions WHERE gateway_order_id = $1 LIMIT 1;`,
      [gatewayOrderId],
    );

    if (transRes.rows.length === 0) {
      this.logger.warn(`No payment transaction found for gateway_order_id ${gatewayOrderId}`);
      return { handled: false, event };
    }

    const trans = transRes.rows[0];

    if (trans.status === 'CAPTURED') {
      this.logger.log(`Idempotent webhook replay detected for gateway_order_id ${gatewayOrderId}`);
      return { handled: true, event, idempotentDuplicate: true };
    }

    if (Math.abs(Number.parseFloat(trans.amount_inr) - paymentAmountInr) > 0.01) {
      throw new BadRequestException(
        `Payment amount mismatch. Expected: ₹${trans.amount_inr}, received: ₹${paymentAmountInr}`,
      );
    }

    if (event === 'payment.captured' || event === 'order.paid') {
      const topupRef = `TOPUP-${gatewayOrderId}-${gatewayPaymentId}`;
      const wallet = await this.wallet.creditWallet(
        trans.customer_id,
        paymentAmountInr,
        `Online Wallet Topup (${gatewayPaymentId})`,
        topupRef,
        false,
      );

      await this.db.query(
        `UPDATE payment_transactions
         SET status = 'CAPTURED', gateway_payment_id = $1, captured_at = NOW(), updated_at = NOW()
         WHERE id = $2;`,
        [gatewayPaymentId, trans.id],
      );

      return { handled: true, event, creditedWallet: wallet };
    }

    if (event === 'payment.failed') {
      await this.db.query(
        `UPDATE payment_transactions
         SET status = 'FAILED', error_code = $1, error_description = $2, updated_at = NOW()
         WHERE id = $3;`,
        [
          paymentEntity.error_code || 'FAILED',
          paymentEntity.error_description || 'Payment failed',
          trans.id,
        ],
      );
      return { handled: true, event };
    }

    return { handled: false, event };
  }
}
