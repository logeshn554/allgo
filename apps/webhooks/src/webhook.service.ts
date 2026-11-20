import crypto from 'node:crypto';
import { PubSubPublisher, InMemoryPubSubPublisher } from './pubsub-publisher.js';
import { IdempotencyStore, InMemoryIdempotencyStore } from './idempotency-store.js';

export interface WebhookProcessingResult {
  status: 'PROCESSED' | 'DUPLICATE' | 'INVALID_SIGNATURE' | 'IGNORED';
  eventId: string;
  topic?: string;
  messageId?: string;
}

export class WebhookService {
  private readonly webhookSecret: string;
  private readonly pubsub: PubSubPublisher;
  private readonly idempotency: IdempotencyStore;

  constructor(
    webhookSecret?: string,
    pubsub?: PubSubPublisher,
    idempotency?: IdempotencyStore
  ) {
    const isProduction = process.env.NODE_ENV === 'production';
    const secret = webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET;

    if (isProduction && (!secret || secret.length < 16)) {
      throw new Error('FATAL: RAZORPAY_WEBHOOK_SECRET is missing or insecure in production.');
    }

    this.webhookSecret = secret || 'local_test_razorpay_secret_key_12345';
    this.pubsub = pubsub || new InMemoryPubSubPublisher();
    this.idempotency = idempotency || new InMemoryIdempotencyStore();
  }

  verifySignature(rawBody: string | Buffer, signature: string): boolean {
    if (!signature || typeof signature !== 'string') return false;

    const rawBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody || '', 'utf8');
    const expectedSig = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBuffer)
      .digest('hex');

    const sigBuf = Buffer.from(signature.trim(), 'utf8');
    const expBuf = Buffer.from(expectedSig.trim(), 'utf8');

    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  }

  async handleInboundWebhook(
    rawBody: string | Buffer,
    signature: string,
    eventData: any
  ): Promise<WebhookProcessingResult> {
    const isValid = this.verifySignature(rawBody, signature);
    if (!isValid) {
      return {
        status: 'INVALID_SIGNATURE',
        eventId: eventData?.id || 'unknown',
      };
    }

    const paymentEntity = eventData?.payload?.payment?.entity;
    const payoutEntity = eventData?.payload?.payout?.entity;
    const eventId =
      eventData?.id ||
      paymentEntity?.id ||
      payoutEntity?.id ||
      `evt_${crypto.randomUUID()}`;

    const isNew = await this.idempotency.setIfNotExists(`webhook:event:${eventId}`, 'PROCESSED', 86400);
    if (!isNew) {
      return {
        status: 'DUPLICATE',
        eventId,
      };
    }

    const eventName = eventData?.event || 'unknown';
    let topic = 'payment-events';

    if (eventName.startsWith('payout.')) {
      topic = 'payout-events';
    } else if (eventName.startsWith('refund.')) {
      topic = 'refund-events';
    }

    const pubMsg = await this.pubsub.publish(topic, eventData, {
      eventId,
      eventType: eventName,
      source: 'apps/webhooks',
    });

    return {
      status: 'PROCESSED',
      eventId,
      topic,
      messageId: pubMsg.messageId,
    };
  }
}
