import { Injectable, BadRequestException, Logger, Optional } from '@nestjs/common';
import crypto from 'node:crypto';
import { DatabaseService } from '../../database/database.service.js';
import { WalletService } from '../../finance/wallet/wallet.service.js';
import { PaymentGateway } from '../gateways/payment-gateway.interface.js';
import { RazorpayPaymentGateway } from '../gateways/razorpay-payment.gateway.js';

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
  private readonly gateway: PaymentGateway;
  private readonly walletService?: WalletService;

  constructor(
    private readonly db: DatabaseService,
    @Optional() arg2?: WalletService | PaymentGateway,
    @Optional() arg3?: PaymentGateway
  ) {
    if (arg2 && 'createOrder' in arg2) {
      this.gateway = arg2 as PaymentGateway;
      this.walletService = undefined;
    } else {
      this.walletService = arg2 as WalletService | undefined;
      this.gateway = arg3 || new RazorpayPaymentGateway();
    }
  }

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
    const isCod = paymentMethod === 'COD';
    const isWallet = paymentMethod === 'WALLET';
    const gatewayName = isCod ? 'CASH_ON_DELIVERY' : (isWallet ? 'ALLGO_WALLET' : 'RAZORPAY');

    let gatewayOrderId: string;
    if (isCod) {
      gatewayOrderId = `COD-${Date.now().toString(36).toUpperCase()}`;
    } else if (isWallet) {
      gatewayOrderId = `WAL-${Date.now().toString(36).toUpperCase()}`;
    } else {
      const orderRes = await this.gateway.createOrder({
        amountInr,
        currency: 'INR',
        receipt: `rcpt_${subOrderId.slice(0, 10)}`,
        notes: { orderGroupId, subOrderId, customerId },
      });
      gatewayOrderId = orderRes.id;
    }

    if (isWallet && this.walletService) {
      const txRef = `ORD-WAL-${orderGroupId.slice(0, 8)}-${subOrderId.slice(0, 8)}-${Date.now().toString(36)}`;
      await this.walletService.debitWallet(
        customerId,
        amountInr,
        `Payment for order ${orderGroupId}`,
        txRef,
        'MERCHANT_SETTLEMENT',
        runner
      );
    }

    const initialStatus = isCod ? 'AUTHORIZED' : (isWallet ? 'CAPTURED' : 'PENDING');
    const idemKey = idempotencyKey || `idem-${orderGroupId}-${Date.now()}`;

    const res = await runner.query(
      `INSERT INTO payment_transactions (
         order_group_id, sub_order_id, customer_id, gateway_name, gateway_order_id,
         idempotency_key, payment_method, amount_inr, currency, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'INR', $9)
       RETURNING *;`,
      [orderGroupId, subOrderId, customerId, gatewayName, gatewayOrderId, idemKey, paymentMethod, amountInr, initialStatus]
    );

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
      requiresAction: (!isCod && !isWallet),
    };
  }

  verifyRazorpaySignature(gatewayOrderId: string, gatewayPaymentId: string, signature: string): boolean {
    return this.gateway.verifyPaymentSignature(gatewayOrderId, gatewayPaymentId, signature);
  }

  async confirmPayment(
    transactionId: string,
    gatewayPaymentId: string,
    gatewaySignature: string,
    skipSignatureVerification = false
  ): Promise<any> {
    const transRes = await this.db.query(
      `SELECT * FROM payment_transactions WHERE id = $1;`,
      [transactionId]
    );
    if (transRes.rows.length === 0) {
      throw new BadRequestException('Payment transaction not found');
    }
    const trans = transRes.rows[0];

    if (trans.gateway_name === 'RAZORPAY' && !skipSignatureVerification) {
      const isValid = this.verifyRazorpaySignature(trans.gateway_order_id, gatewayPaymentId, gatewaySignature);
      if (!isValid) {
        throw new BadRequestException('Invalid Razorpay payment signature');
      }
    }

    const updated = await this.db.query(
      `UPDATE payment_transactions
       SET status = 'CAPTURED', gateway_payment_id = $1, gateway_signature = $2,
           captured_at = NOW(), updated_at = NOW()
       WHERE id = $3 RETURNING *;`,
      [gatewayPaymentId, gatewaySignature, transactionId]
    );

    await this.db.query(
      `UPDATE payments
       SET status = 'CAPTURED', gateway_payment_id = $1, gateway_signature = $2,
           captured_at = NOW(), updated_at = NOW()
       WHERE order_group_id = $3;`,
      [gatewayPaymentId, gatewaySignature, trans.order_group_id]
    );

    return updated.rows[0];
  }

  async processRefund(subOrderId: string, amountInr: number, reason: string): Promise<any> {
    // Idempotency: return existing refund if already processed for this sub-order
    const existingRefund = await this.db.query(
      `SELECT r.* FROM refunds r
       JOIN refund_allocations ra ON ra.refund_id = r.id
       WHERE ra.sub_order_id = $1 AND r.status = 'PROCESSED' LIMIT 1;`,
      [subOrderId]
    );
    if (existingRefund.rows.length > 0) {
      this.logger.log(`Sub-order ${subOrderId} already refunded; returning existing record`);
      return existingRefund.rows[0];
    }

    let transRes = await this.db.query(
      `SELECT pt.*, p.id as canonical_payment_id
       FROM payment_transactions pt
       JOIN payments p ON p.order_group_id = pt.order_group_id
       WHERE pt.sub_order_id = $1 AND pt.status IN ('CAPTURED', 'AUTHORIZED')
       ORDER BY pt.created_at DESC LIMIT 1;`,
      [subOrderId]
    );

    if (transRes.rows.length === 0) {
      transRes = await this.db.query(
        `SELECT pt.*, p.id as canonical_payment_id
         FROM sub_orders so
         JOIN payment_transactions pt ON pt.order_group_id = so.order_group_id
         JOIN payments p ON p.order_group_id = pt.order_group_id
         WHERE so.id = $1 AND pt.status IN ('CAPTURED', 'AUTHORIZED')
         ORDER BY pt.created_at DESC LIMIT 1;`,
        [subOrderId]
      );
    }

    if (transRes.rows.length === 0) {
      this.logger.warn(`No captured payment found for sub_order ${subOrderId}; skipping payment refund`);
      return null;
    }

    const payment = transRes.rows[0];
    const destination = (payment.payment_method === 'COD' || payment.payment_method === 'WALLET') ? 'WALLET' : 'ORIGINAL_METHOD';
    let gatewayRefundId = `rfnd_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;

    if (destination === 'ORIGINAL_METHOD' && payment.gateway_payment_id) {
      try {
        const rzpRefund = await this.gateway.createRefund({
          paymentId: payment.gateway_payment_id,
          amountInr,
          notes: { subOrderId, reason },
        });
        gatewayRefundId = rzpRefund.id;
      } catch (err: any) {
        this.logger.warn(`Gateway refund API call failed, falling back to recorded ref: ${err.message}`);
      }
    }

    const refundRes = await this.db.query(
      `INSERT INTO refunds (
         payment_id, sub_order_id, gateway_refund_id, destination, amount_inr, reason, status, processed_at
       ) VALUES ($1, $2, $3, $4, $5, $6, 'PROCESSED', NOW())
       RETURNING *;`,
      [payment.canonical_payment_id, subOrderId, gatewayRefundId, destination, amountInr, reason]
    );
    const refund = refundRes.rows[0];

    // Record refund_allocations per sub_order
    await this.db.query(
      `INSERT INTO refund_allocations (refund_id, sub_order_id, allocated_amount_inr)
       VALUES ($1, $2, $3);`,
      [refund.id, subOrderId, amountInr]
    );

    if (destination === 'WALLET' && this.walletService) {
      const refundRef = `REF-${subOrderId.slice(0, 8)}-${refund.id.slice(0, 8)}`;
      await this.walletService.creditWallet(
        payment.customer_id,
        amountInr,
        `Refund for sub-order ${subOrderId}: ${reason}`,
        refundRef,
        false
      );
    }

    await this.db.query(
      `UPDATE payment_transactions SET status = 'REFUNDED', updated_at = NOW() WHERE id = $1;`,
      [payment.id]
    );

    return refund;
  }

  async getPaymentStatus(orderGroupId: string, transactionId?: string): Promise<any> {
    const query = transactionId
      ? `SELECT * FROM payment_transactions WHERE id = $1 AND order_group_id = $2;`
      : `SELECT * FROM payment_transactions WHERE order_group_id = $1 ORDER BY created_at DESC LIMIT 1;`;
    const params = transactionId ? [transactionId, orderGroupId] : [orderGroupId];

    const res = await this.db.query(query, params);
    if (res.rows.length === 0) {
      return { status: 'NOT_FOUND', orderGroupId };
    }

    const transaction = res.rows[0];
    if (transaction.status === 'PENDING' && transaction.gateway_name === 'RAZORPAY') {
      if (transaction.gateway_payment_id) {
        try {
          const remote = await this.gateway.fetchPayment(transaction.gateway_payment_id);
          if (remote.status === 'captured') {
            await this.confirmPayment(
              transaction.id,
              remote.id,
              transaction.gateway_signature || 'recovered_via_sync',
              true
            );
            transaction.status = 'CAPTURED';
            transaction.gateway_payment_id = remote.id;
          }
        } catch (err: any) {
          this.logger.warn(`Failed to recover remote payment status: ${err.message}`);
        }
      }
    }

    return {
      transactionId: transaction.id,
      orderGroupId: transaction.order_group_id,
      subOrderId: transaction.sub_order_id,
      status: transaction.status,
      amountInr: parseFloat(transaction.amount_inr),
      gatewayOrderId: transaction.gateway_order_id,
      gatewayPaymentId: transaction.gateway_payment_id,
      paymentMethod: transaction.payment_method,
      capturedAt: transaction.captured_at,
    };
  }
}
