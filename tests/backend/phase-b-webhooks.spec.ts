import { describe, it } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { WebhookService } from '../../apps/webhooks/dist/webhook.service.js';
import { InMemoryPubSubPublisher } from '../../apps/webhooks/dist/pubsub-publisher.js';
import { InMemoryIdempotencyStore } from '../../apps/webhooks/dist/idempotency-store.js';

describe('Phase B4: Inbound Webhook Service (apps/webhooks)', () => {
  const secret = 'test_webhook_secret_phase_b';

  function sign(payload: string, s = secret): string {
    return crypto.createHmac('sha256', s).update(payload).digest('hex');
  }

  it('should verify signature, enforce idempotency, and publish payment webhook to Pub/Sub', async () => {
    const pubsub = new InMemoryPubSubPublisher();
    const idempotency = new InMemoryIdempotencyStore();
    const service = new WebhookService(secret, pubsub, idempotency);

    const eventData = {
      id: 'evt_pay_success_100',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_capture_999',
            order_id: 'order_rzp_999',
            amount: 75000,
            status: 'captured',
          },
        },
      },
    };

    const rawBody = JSON.stringify(eventData);
    const signature = sign(rawBody);

    const result = await service.handleInboundWebhook(rawBody, signature, eventData);
    assert.strictEqual(result.status, 'PROCESSED');
    assert.strictEqual(result.eventId, 'evt_pay_success_100');
    assert.strictEqual(result.topic, 'payment-events');
    assert.ok(result.messageId);

    // Verify published message
    assert.strictEqual(pubsub.publishedMessages.length, 1);
    assert.strictEqual(pubsub.publishedMessages[0].topic, 'payment-events');
    assert.strictEqual(pubsub.publishedMessages[0].attributes?.eventType, 'payment.captured');

    // Duplicate submission with same eventId
    const dupResult = await service.handleInboundWebhook(rawBody, signature, eventData);
    assert.strictEqual(dupResult.status, 'DUPLICATE');
    assert.strictEqual(pubsub.publishedMessages.length, 1, 'Duplicate event must NOT be republished');
  });

  it('should reject invalid or forged webhook signatures', async () => {
    const pubsub = new InMemoryPubSubPublisher();
    const idempotency = new InMemoryIdempotencyStore();
    const service = new WebhookService(secret, pubsub, idempotency);

    const eventData = {
      id: 'evt_forged_101',
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_fraud_1', order_id: 'order_1', amount: 1000 } } },
    };

    const rawBody = JSON.stringify(eventData);
    const forgedSig = 'invalid_sha256_hex_digest_xyz';

    const result = await service.handleInboundWebhook(rawBody, forgedSig, eventData);
    assert.strictEqual(result.status, 'INVALID_SIGNATURE');
    assert.strictEqual(pubsub.publishedMessages.length, 0);
  });

  it('should route payout and refund events to appropriate pubsub topics', async () => {
    const pubsub = new InMemoryPubSubPublisher();
    const idempotency = new InMemoryIdempotencyStore();
    const service = new WebhookService(secret, pubsub, idempotency);

    // Payout Event
    const payoutEvent = {
      id: 'evt_pout_200',
      event: 'payout.processed',
      payload: { payout: { entity: { id: 'pout_1', amount: 50000, status: 'processed' } } },
    };
    const r1 = JSON.stringify(payoutEvent);
    const res1 = await service.handleInboundWebhook(r1, sign(r1), payoutEvent);
    assert.strictEqual(res1.status, 'PROCESSED');
    assert.strictEqual(res1.topic, 'payout-events');

    // Refund Event
    const refundEvent = {
      id: 'evt_rfnd_300',
      event: 'refund.processed',
      payload: { refund: { entity: { id: 'rfnd_1', amount: 20000, status: 'processed' } } },
    };
    const r2 = JSON.stringify(refundEvent);
    const res2 = await service.handleInboundWebhook(r2, sign(r2), refundEvent);
    assert.strictEqual(res2.status, 'PROCESSED');
    assert.strictEqual(res2.topic, 'refund-events');

    assert.strictEqual(pubsub.publishedMessages.length, 2);
  });
});
