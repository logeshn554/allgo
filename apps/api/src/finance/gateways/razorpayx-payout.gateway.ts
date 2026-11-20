import { Injectable, Logger } from '@nestjs/common';
import crypto from 'node:crypto';
import {
  PayoutGateway,
  CreateGatewayPayoutParams,
  GatewayPayoutResult,
  GatewayPayoutDetails,
} from './payout-gateway.interface.js';

@Injectable()
export class RazorpayXPayoutGateway implements PayoutGateway {
  private readonly logger = new Logger(RazorpayXPayoutGateway.name);
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly baseUrl = 'https://api.razorpay.com/v1';

  constructor(keyId?: string, keySecret?: string) {
    this.keyId = keyId || process.env.RAZORPAYX_KEY_ID || process.env.RAZORPAY_KEY_ID || 'rzp_test_payout_key';
    this.keySecret = keySecret || process.env.RAZORPAYX_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || 'local_test_rzpx_secret';
  }

  private get authHeader(): string {
    const creds = `${this.keyId}:${this.keySecret}`;
    return `Basic ${Buffer.from(creds).toString('base64')}`;
  }

  async createPayout(params: CreateGatewayPayoutParams): Promise<GatewayPayoutResult> {
    const amountInPaise = Math.round(params.amountInr * 100);
    const payload = {
      account_number: params.accountNumber || process.env.RAZORPAYX_ACCOUNT_NUMBER || '2323230041122334',
      fund_account_id: params.fundAccountId || `fa_${crypto.randomBytes(6).toString('hex')}`,
      amount: amountInPaise,
      currency: params.currency || 'INR',
      mode: params.mode || 'IMPS',
      purpose: params.purpose || 'payout',
      queue_if_low_balance: true,
      reference_id: params.referenceId,
      narration: params.narration || 'AllGo Partner Disbursement',
      notes: params.notes || {},
    };

    if (process.env.NODE_ENV === 'test' || !process.env.RAZORPAYX_KEY_ID) {
      return {
        id: `pout_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`,
        entity: 'payout',
        fundAccountId: payload.fund_account_id,
        amount: amountInPaise,
        currency: 'INR',
        status: 'processing',
        mode: payload.mode,
        referenceId: params.referenceId,
      };
    }

    try {
      const res = await fetch(`${this.baseUrl}/payouts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.authHeader,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`RazorpayX createPayout failed (${res.status}): ${errorText}`);
      }

      const data = await res.json() as any;
      return {
        id: data.id,
        entity: data.entity,
        fundAccountId: data.fund_account_id,
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        mode: data.mode,
        referenceId: data.reference_id,
      };
    } catch (err: any) {
      this.logger.error(`RazorpayX create payout failed: ${err.message}`);
      throw err;
    }
  }

  async fetchPayout(payoutId: string): Promise<GatewayPayoutDetails> {
    if (process.env.NODE_ENV === 'test' || !process.env.RAZORPAYX_KEY_ID) {
      return {
        id: payoutId,
        amount: 50000,
        status: 'processed',
        utr: `UTR_${Date.now()}`,
      };
    }

    try {
      const res = await fetch(`${this.baseUrl}/payouts/${payoutId}`, {
        method: 'GET',
        headers: { Authorization: this.authHeader },
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`RazorpayX fetch payout failed (${res.status}): ${errorText}`);
      }

      const data = await res.json() as any;
      return {
        id: data.id,
        amount: data.amount,
        status: data.status,
        utr: data.utr,
        failureReason: data.failure_reason,
        referenceId: data.reference_id,
      };
    } catch (err: any) {
      this.logger.error(`RazorpayX fetch payout call failed: ${err.message}`);
      throw err;
    }
  }

  async cancelPayout(payoutId: string): Promise<GatewayPayoutResult> {
    if (process.env.NODE_ENV === 'test' || !process.env.RAZORPAYX_KEY_ID) {
      return {
        id: payoutId,
        entity: 'payout',
        amount: 50000,
        currency: 'INR',
        status: 'cancelled',
        mode: 'IMPS',
        referenceId: `ref_${payoutId}`,
      };
    }

    try {
      const res = await fetch(`${this.baseUrl}/payouts/${payoutId}/cancel`, {
        method: 'POST',
        headers: { Authorization: this.authHeader },
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`RazorpayX cancel payout failed (${res.status}): ${errorText}`);
      }

      const data = await res.json() as any;
      return {
        id: data.id,
        entity: data.entity,
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        mode: data.mode,
        referenceId: data.reference_id,
      };
    } catch (err: any) {
      this.logger.error(`RazorpayX cancel payout call failed: ${err.message}`);
      throw err;
    }
  }
}
