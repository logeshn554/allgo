import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import crypto from 'node:crypto';
import { DatabaseService } from '../../database/database.service.js';

export interface PaymentInitiationResult {
  transactionId: string;
  gatewayName: string;
  gatewayOrderId: string;
  paymentMethod: string;
  amountInr: number;
  currency: string;
  status: string;
  requiresAction: boolean;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || 'local_test_razorpay_secret_key_12345';

  constructor(private readonly db: DatabaseService) {}

  /**
   * Initiate payment attempt
   */
  async initiatePayment(
    orderGroupId: string,
    subOrderId: string,
    customerId: string,
    paymentMethod: 'COD' | 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET',
    amountInr: number,
    idempotencyKey?: string,
    client?: any
  ): Promise<PaymentInitiationResult> {
    const runner = client || this.db;
    const gatewayName = paymentMethod === 'COD' ? 'CASH_ON_DELIVERY' : 'RAZORPAY';
    const gatewayOrderId = paymentMethod === 'COD'
      ? `COD-${Date.now().toString(36).toUpperCase()}`
      : `order_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;

    const initialStatus = paymentMethod === 'COD' ? 'AUTHORIZED' : 'PENDING';
    const idemKey = idempotencyKey || `idem-${orderGroupId}-${Date.now()}`;

    const res = await runner.query(
      `INSERT INTO payment_transactions (
         order_group_id, sub_order_id, customer_id, gateway_name, gateway_order_id,
         idempotency_key, payment_method, amount_inr, currency, status
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, 'INR', $9
       ) RETURNING *;`,
      [
        orderGroupId,
        subOrderId,
        customerId,
        gatewayName,
        gatewayOrderId,
        idemKey,
        paymentMethod,
        amountInr,
        initialStatus,
      ]
    );

    // Also populate canonical payments table
    await runner.query(
      `INSERT INTO payments (
         order_group_id, gateway_name, gateway_order_id, payment_method, amount_inr, status
       ) VALUES ($1, $2, $3, $4, $5, $6);`,
      [orderGroupId, gatewayName, gatewayOrderId, paymentMethod, amountInr, initialStatus]
    );

    const transaction = res.rows[0];

    return {
      transactionId: transaction.id,
      gatewayName,
      gatewayOrderId,
      paymentMethod,
      amountInr,
      currency: 'INR',
      status: initialStatus,
      requiresAction: paymentMethod !== 'COD',
    };
  }

  /**
   * Verify Razorpay payment signature
   */
  verifyRazorpaySignature(gatewayOrderId: string, gatewayPaymentId: string, signature: string): boolean {
    if (!signature || typeof signature !== 'string') return false;
    const payload = `${gatewayOrderId}|${gatewayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.razorpayKeySecret)
      .update(payload)
      .digest('hex');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(sigBuf, expBuf);
  }

  /**
   * Confirm successful payment
   */
  async confirmPayment(
    transactionId: string,
    gatewayPaymentId: string,
    gatewaySignature: string
  ): Promise<any> {
    const transRes = await this.db.query(
      `SELECT * FROM payment_transactions WHERE id = $1;`,
      [transactionId]
    );

    if (transRes.rows.length === 0) {
      throw new BadRequestException('Payment transaction not found');
    }

    const trans = transRes.rows[0];

    if (trans.gateway_name === 'RAZORPAY') {
      const isValid = this.verifyRazorpaySignature(trans.gateway_order_id, gatewayPaymentId, gatewaySignature);
      if (!isValid) {
        throw new BadRequestException('Invalid Razorpay payment signature');
      }
    }

    // Update transaction to CAPTURED
    const updated = await this.db.query(
      `UPDATE payment_transactions
       SET status = 'CAPTURED',
           gateway_payment_id = $1,
           gateway_signature = $2,
           captured_at = NOW(),
           updated_at = NOW()
       WHERE id = $3 RETURNING *;`,
      [gatewayPaymentId, gatewaySignature, transactionId]
    );

    await this.db.query(
      `UPDATE payments
       SET status = 'CAPTURED',
           gateway_payment_id = $1,
           gateway_signature = $2,
           captured_at = NOW(),
           updated_at = NOW()
       WHERE order_group_id = $3;`,
      [gatewayPaymentId, gatewaySignature, trans.order_group_id]
    );

    return updated.rows[0];
  }

  /**
   * Process refund for a cancelled sub-order
   */
  async processRefund(subOrderId: string, amountInr: number, reason: string): Promise<any> {
    // Find payment associated with this sub_order
    const transRes = await this.db.query(
      `SELECT pt.*, p.id as canonical_payment_id
       FROM payment_transactions pt
       JOIN payments p ON p.order_group_id = pt.order_group_id
       WHERE pt.sub_order_id = $1 AND pt.status IN ('CAPTURED', 'AUTHORIZED')
       ORDER BY pt.created_at DESC LIMIT 1;`,
      [subOrderId]
    );

    if (transRes.rows.length === 0) {
      this.logger.warn(`No captured payment found for sub_order ${subOrderId}; skipping payment refund`);
      return null;
    }

    const payment = transRes.rows[0];
    const destination = payment.payment_method === 'COD' ? 'WALLET' : 'ORIGINAL_METHOD';
    const gatewayRefundId = `rfnd_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;

    const refundRes = await this.db.query(
      `INSERT INTO refunds (
         payment_id, sub_order_id, gateway_refund_id, destination, amount_inr, reason, status, processed_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, 'PROCESSED', NOW()
       ) RETURNING *;`,
      [payment.canonical_payment_id, subOrderId, gatewayRefundId, destination, amountInr, reason]
    );

    // Update payment transaction status
    await this.db.query(
      `UPDATE payment_transactions SET status = 'REFUNDED', updated_at = NOW() WHERE id = $1;`,
      [payment.id]
    );

    return refundRes.rows[0];
  }

  /**
   * Webhook Signature Verification and Idempotent Handler
   */
  async handleWebhook(rawBody: string, signature: string, eventPayload: any): Promise<{ handled: boolean; event: string }> {
    const expected = crypto.createHmac('sha256', this.razorpayKeySecret).update(rawBody).digest('hex');
    if (signature !== expected && process.env.NODE_ENV === 'production') {
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = eventPayload.event;
    const paymentEntity = eventPayload.payload?.payment?.entity;
    if (!paymentEntity) {
      return { handled: false, event };
    }

    const gatewayOrderId = paymentEntity.order_id;
    const gatewayPaymentId = paymentEntity.id;

    if (event === 'payment.captured' || event === 'order.paid') {
      await this.db.query(
        `UPDATE payment_transactions
         SET status = 'CAPTURED', gateway_payment_id = $1, captured_at = NOW(), updated_at = NOW()
         WHERE gateway_order_id = $2;`,
        [gatewayPaymentId, gatewayOrderId]
      );
    } else if (event === 'payment.failed') {
      await this.db.query(
        `UPDATE payment_transactions
         SET status = 'FAILED', error_code = $1, error_description = $2, updated_at = NOW()
         WHERE gateway_order_id = $3;`,
        [paymentEntity.error_code, paymentEntity.error_description, gatewayOrderId]
      );
    }

    return { handled: true, event };
  }
}
