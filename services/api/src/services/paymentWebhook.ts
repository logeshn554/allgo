import crypto from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../config/config.service.js';
import { DatabaseService } from '../database/database.service.js';
import { RedisService } from '../redis/redis.service.js';

export interface CreatePaymentOrderParams {
  orderId: string;
  cartId?: string;
  customerId: string;
  amountInr: number;
  paymentMethod: 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET' | 'COD';
  idempotencyKey: string;
}

export interface PaymentOrderResult {
  transactionId: string;
  gatewayOrderId: string;
  amountInr: number;
  currency: string;
  status: string;
  isDuplicate: boolean;
}

export interface WebhookEventPayload {
  event: string;
  id?: string;
  payload: {
    payment?: {
      entity: {
        id: string;
        order_id: string;
        amount: number;
        status: string;
        notes?: Record<string, string>;
      };
    };
    order?: {
      entity: {
        id: string;
        receipt?: string;
        status: string;
        notes?: Record<string, string>;
      };
    };
  };
}

@Injectable()
export class PaymentWebhookService {
  private readonly logger = new Logger(PaymentWebhookService.name);
  private readonly webhookSecret: string;

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    this.webhookSecret =
      process.env.RAZORPAY_WEBHOOK_SECRET ||
      this.config.jwtSecret ||
      'default_rzp_webhook_secret_key_123';
  }

  async createPaymentOrder(params: CreatePaymentOrderParams): Promise<PaymentOrderResult> {
    const { orderId, cartId, customerId, amountInr, paymentMethod, idempotencyKey } = params;

    // 1. Idempotency Check
    const idemKey = `idem:payment_order:${idempotencyKey}`;
    const cachedOrder = await this.redis.get(idemKey);
    if (cachedOrder) {
      try {
        const parsed = JSON.parse(cachedOrder);
        return { ...parsed, isDuplicate: true };
      } catch {
        // Continue if corrupt
      }
    }

    // 2. Atomic Redis Inventory Reservation Lock (5 minutes) for Grocery Carts
    if (cartId) {
      const lockKey = `inventory:lock:cart:${cartId}`;
      const lockResult = await (this.redis as any).set(lockKey, orderId, 'NX', 'EX', 300);
      if (lockResult !== 'OK') {
        throw new ConflictException(
          'INVENTORY_LOCKED: Another checkout is currently in progress for this cart',
        );
      }
    }

    // 3. Generate Gateway Order
    const gatewayOrderId = `order_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
    const initialStatus = paymentMethod === 'COD' ? 'AUTHORIZED' : 'PENDING';

    const res = await this.db.query(
      `INSERT INTO payment_transactions (
         order_group_id, sub_order_id, customer_id, gateway_name, gateway_order_id,
         idempotency_key, payment_method, amount_inr, currency, status
       ) VALUES ($1, $1, $2, 'RAZORPAY', $3, $4, $5, $6, 'INR', $7)
       RETURNING id;`,
      [
        orderId,
        customerId,
        gatewayOrderId,
        idempotencyKey,
        paymentMethod,
        amountInr,
        initialStatus,
      ],
    );

    const transactionId = res.rows[0]?.id || `tx_${crypto.randomUUID()}`;
    const result: PaymentOrderResult = {
      transactionId,
      gatewayOrderId,
      amountInr,
      currency: 'INR',
      status: initialStatus,
      isDuplicate: false,
    };

    // Cache Idempotency key for 24h
    await this.redis.set(idemKey, JSON.stringify(result), 'EX', 86400);

    return result;
  }

  verifyWebhookSignature(rawBody: string | Buffer, signature: string, secret?: string): boolean {
    if (!signature || typeof signature !== 'string') return false;

    const key = secret || this.webhookSecret;
    const expectedSig = crypto
      .createHmac('sha256', key)
      .update(typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8'))
      .digest('hex');

    const sigBuf = Buffer.from(signature.trim());
    const expBuf = Buffer.from(expectedSig.trim());

    if (sigBuf.length !== expBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(sigBuf, expBuf);
  }

  async handleWebhook(
    rawBody: string | Buffer,
    signature: string,
    eventData: WebhookEventPayload,
    secret?: string,
  ): Promise<any> {
    // 1. Verify HMAC-SHA256 signature
    const isValid = this.verifyWebhookSignature(rawBody, signature, secret);
    if (!isValid) {
      throw new BadRequestException('INVALID_SIGNATURE: Webhook signature verification failed');
    }

    const paymentEntity = eventData.payload?.payment?.entity;
    const eventId =
      eventData.id || paymentEntity?.id || eventData.payload?.order?.entity?.id || 'unknown';

    // 2. Idempotent webhook event processing
    const eventKey = `idem:webhook:${eventId}`;
    const alreadyProcessed = await (this.redis as any).set(
      eventKey,
      'PROCESSED',
      'NX',
      'EX',
      86400,
    );
    if (alreadyProcessed !== 'OK') {
      return { status: 'ALREADY_PROCESSED', event: eventData.event, eventId };
    }

    const gatewayOrderId = paymentEntity?.order_id || eventData.payload?.order?.entity?.id;
    const cartId = paymentEntity?.notes?.cartId || eventData.payload?.order?.entity?.notes?.cartId;

    if (eventData.event === 'payment.captured' || eventData.event === 'order.paid') {
      // Payment Succeeded: mark transaction CONFIRMED & release cart lock
      if (gatewayOrderId) {
        await this.db.query(
          `UPDATE payment_transactions SET status = 'SUCCESS', updated_at = NOW() WHERE gateway_order_id = $1;`,
          [gatewayOrderId],
        );
      }
      if (cartId) {
        await this.redis.del(`inventory:lock:cart:${cartId}`);
      }
      return { status: 'SUCCESS', event: eventData.event, gatewayOrderId };
    }

    if (eventData.event === 'payment.failed') {
      // Payment Failed: release atomic cart lock and mark transaction FAILED
      if (gatewayOrderId) {
        await this.db.query(
          `UPDATE payment_transactions SET status = 'FAILED', updated_at = NOW() WHERE gateway_order_id = $1;`,
          [gatewayOrderId],
        );
      }
      if (cartId) {
        await this.redis.del(`inventory:lock:cart:${cartId}`);
      }
      return { status: 'PAYMENT_FAILED_PROCESSED', event: eventData.event, gatewayOrderId };
    }

    return { status: 'IGNORED_EVENT', event: eventData.event };
  }
}
