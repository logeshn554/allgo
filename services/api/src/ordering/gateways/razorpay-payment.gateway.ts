import crypto from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import {
  CreateGatewayOrderParams,
  CreateGatewayRefundParams,
  GatewayOrderResult,
  GatewayPaymentDetails,
  GatewayRefundResult,
  PaymentGateway,
} from './payment-gateway.interface.js';

@Injectable()
export class RazorpayPaymentGateway implements PaymentGateway {
  private readonly logger = new Logger(RazorpayPaymentGateway.name);
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly baseUrl = 'https://api.razorpay.com/v1';

  constructor(keyId?: string, keySecret?: string) {
    this.keyId = keyId || process.env.RAZORPAY_KEY_ID || '';
    this.keySecret = keySecret || process.env.RAZORPAY_KEY_SECRET || '';

    const isProdOrStaging =
      process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
    if (!this.keyId || !this.keySecret) {
      if (isProdOrStaging) {
        throw new Error(
          'FATAL: Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are missing. Failing fast in production/staging.',
        );
      }
    }
  }

  private get authHeader(): string {
    const creds = `${this.keyId}:${this.keySecret}`;
    return `Basic ${Buffer.from(creds).toString('base64')}`;
  }

  async createOrder(params: CreateGatewayOrderParams): Promise<GatewayOrderResult> {
    const amountInPaise = Math.round(params.amountInr * 100);
    const payload = {
      amount: amountInPaise,
      currency: params.currency || 'INR',
      receipt: params.receipt,
      notes: params.notes || {},
    };

    const isProdOrStaging =
      process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
    if (!isProdOrStaging) {
      // Mock / offline fallback in test or local dev
      return {
        id: `order_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`,
        amount: amountInPaise,
        currency: params.currency || 'INR',
        receipt: params.receipt,
        status: 'created',
      };
    }

    if (!this.keyId || !this.keySecret) {
      throw new Error('Razorpay API request failed: Missing credentials');
    }

    try {
      const res = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.authHeader,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Razorpay createOrder API failed (${res.status}): ${errorText}`);
      }

      const data = (await res.json()) as any;
      return {
        id: data.id,
        amount: data.amount,
        currency: data.currency,
        receipt: data.receipt,
        status: data.status,
      };
    } catch (err: any) {
      this.logger.error(`Razorpay order creation call failed: ${err.message}`);
      throw err;
    }
  }

  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    if (!signature || typeof signature !== 'string') return false;
    const payload = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(payload)
      .digest('hex');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(sigBuf, expBuf);
  }

  async createRefund(params: CreateGatewayRefundParams): Promise<GatewayRefundResult> {
    const amountInPaise = Math.round(params.amountInr * 100);
    const payload: any = {
      amount: amountInPaise,
      notes: params.notes || {},
      speed: params.speed || 'optimum',
    };

    const isProdOrStaging =
      process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
    if (!isProdOrStaging) {
      return {
        id: `rfnd_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`,
        paymentId: params.paymentId,
        amount: amountInPaise,
        currency: 'INR',
        status: 'processed',
      };
    }

    if (!this.keyId || !this.keySecret) {
      throw new Error('Razorpay API request failed: Missing credentials');
    }

    try {
      const res = await fetch(`${this.baseUrl}/payments/${params.paymentId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.authHeader,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Razorpay refund API failed (${res.status}): ${errorText}`);
      }

      const data = (await res.json()) as any;
      return {
        id: data.id,
        paymentId: data.payment_id,
        amount: data.amount,
        currency: data.currency,
        status: data.status,
      };
    } catch (err: any) {
      this.logger.error(`Razorpay refund call failed: ${err.message}`);
      throw err;
    }
  }

  async fetchPayment(paymentId: string): Promise<GatewayPaymentDetails> {
    const isProdOrStaging =
      process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
    if (!isProdOrStaging) {
      return {
        id: paymentId,
        orderId: `order_mock_${paymentId}`,
        amount: 10000,
        currency: 'INR',
        status: 'captured',
      };
    }

    if (!this.keyId || !this.keySecret) {
      throw new Error('Razorpay API request failed: Missing credentials');
    }

    try {
      const res = await fetch(`${this.baseUrl}/payments/${paymentId}`, {
        method: 'GET',
        headers: { Authorization: this.authHeader },
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Razorpay fetch payment failed (${res.status}): ${errorText}`);
      }

      const data = (await res.json()) as any;
      return {
        id: data.id,
        orderId: data.order_id,
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        method: data.method,
        errorCode: data.error_code,
        errorDescription: data.error_description,
      };
    } catch (err: any) {
      this.logger.error(`Razorpay fetch payment call failed: ${err.message}`);
      throw err;
    }
  }
}
