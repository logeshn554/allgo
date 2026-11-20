import { describe, it } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { LedgerService } from '../../apps/api/dist/finance/ledger/ledger.service.js';
import { WalletService } from '../../apps/api/dist/finance/wallet/wallet.service.js';
import { WalletWebhookService } from '../../apps/api/dist/finance/wallet/wallet-webhook.service.js';
import { MockDatabaseService } from './wallet-mock-db.ts';

describe('A.3: Wallet Topup Razorpay Order and Webhook Invariants', () => {
  const webhookSecret = 'local_test_razorpay_secret_key_12345';

  function signPayload(body: string, secret: string = webhookSecret): string {
    return crypto.createHmac('sha256', secret).update(body).digest('hex');
  }

  it('should create Razorpay payment order without crediting wallet upfront', async () => {
    const mockDb = new MockDatabaseService();
    const ledger = new LedgerService(mockDb as any);
    const wallet = new WalletService(mockDb as any, ledger);

    const userId = 'usr_cust_topup_1';
    const topupOrder = await wallet.createTopupOrder(userId, 500);

    assert.ok(topupOrder.orderId, 'Must generate internal transaction orderId');
    assert.match(topupOrder.gatewayOrderId, /^order_/, 'Must generate Razorpay gateway orderId');
    assert.strictEqual(topupOrder.amountInr, 500);
    assert.strictEqual(topupOrder.status, 'PENDING');

    const walletInfo = await wallet.getOrCreateWallet(userId);
    assert.strictEqual(walletInfo.balanceInr, 0, 'Wallet balance must remain 0 until webhook confirmation');
  });

  it('should credit wallet and post double-entry ledger record upon verified payment.captured webhook', async () => {
    const mockDb = new MockDatabaseService();
    const ledger = new LedgerService(mockDb as any);
    const wallet = new WalletService(mockDb as any, ledger);
    const walletWebhook = new WalletWebhookService(mockDb as any, wallet);

    const userId = 'usr_cust_topup_2';
    const topupOrder = await wallet.createTopupOrder(userId, 750);

    const webhookEvent = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_rzp_mock_123',
            order_id: topupOrder.gatewayOrderId,
            amount: 75000,
            status: 'captured',
          },
        },
      },
    };

    const rawBody = JSON.stringify(webhookEvent);
    const validSignature = signPayload(rawBody);

    const result = await walletWebhook.handlePaymentWebhook(rawBody, validSignature, webhookEvent);
    assert.strictEqual(result.handled, true);
    assert.strictEqual(result.event, 'payment.captured');

    const walletInfo = await wallet.getOrCreateWallet(userId);
    assert.strictEqual(walletInfo.balanceInr, 750, 'Wallet must be credited with 750 INR');

    const ledgerEntries = mockDb.ledgerEntries;
    assert.strictEqual(ledgerEntries.length, 2, 'Must have posted double-entry ledger entries');
    const debit = ledgerEntries.find((e) => e.direction === 'DEBIT');
    const credit = ledgerEntries.find((e) => e.direction === 'CREDIT');
    assert.strictEqual(debit.account_type, 'GATEWAY_ESCROW');
    assert.strictEqual(credit.account_type, 'CUSTOMER_WALLET');
    assert.strictEqual(parseFloat(debit.amount_inr), 750);
    assert.strictEqual(parseFloat(credit.amount_inr), 750);
  });

  it('should reject forged webhook signatures', async () => {
    const mockDb = new MockDatabaseService();
    const ledger = new LedgerService(mockDb as any);
    const wallet = new WalletService(mockDb as any, ledger);
    const walletWebhook = new WalletWebhookService(mockDb as any, wallet);

    const userId = 'usr_cust_topup_3';
    const topupOrder = await wallet.createTopupOrder(userId, 200);

    const webhookEvent = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_rzp_mock_forged',
            order_id: topupOrder.gatewayOrderId,
            amount: 20000,
          },
        },
      },
    };

    const rawBody = JSON.stringify(webhookEvent);
    const forgedSignature = signPayload(rawBody, 'wrong_secret_attacker');

    await assert.rejects(
      async () => {
        await walletWebhook.handlePaymentWebhook(rawBody, forgedSignature, webhookEvent);
      },
      /Invalid Razorpay webhook signature/i,
      'Must reject forged webhook signature'
    );
  });

  it('should reject wrong payment amounts', async () => {
    const mockDb = new MockDatabaseService();
    const ledger = new LedgerService(mockDb as any);
    const wallet = new WalletService(mockDb as any, ledger);
    const walletWebhook = new WalletWebhookService(mockDb as any, wallet);

    const userId = 'usr_cust_topup_4';
    const topupOrder = await wallet.createTopupOrder(userId, 500);

    const webhookEvent = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_rzp_mock_underpaid',
            order_id: topupOrder.gatewayOrderId,
            amount: 10000,
          },
        },
      },
    };

    const rawBody = JSON.stringify(webhookEvent);
    const validSignature = signPayload(rawBody);

    await assert.rejects(
      async () => {
        await walletWebhook.handlePaymentWebhook(rawBody, validSignature, webhookEvent);
      },
      /Payment amount mismatch/i,
      'Must reject mismatched payment amount'
    );
  });

  it('should handle webhook replay attacks idempotently without double-crediting wallet', async () => {
    const mockDb = new MockDatabaseService();
    const ledger = new LedgerService(mockDb as any);
    const wallet = new WalletService(mockDb as any, ledger);
    const walletWebhook = new WalletWebhookService(mockDb as any, wallet);

    const userId = 'usr_cust_topup_5';
    const topupOrder = await wallet.createTopupOrder(userId, 300);

    const webhookEvent = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_rzp_replay_1',
            order_id: topupOrder.gatewayOrderId,
            amount: 30000,
          },
        },
      },
    };

    const rawBody = JSON.stringify(webhookEvent);
    const validSignature = signPayload(rawBody);

    const firstAttempt = await walletWebhook.handlePaymentWebhook(rawBody, validSignature, webhookEvent);
    assert.strictEqual(firstAttempt.handled, true);
    assert.strictEqual(firstAttempt.idempotentDuplicate, undefined);

    let walletInfo = await wallet.getOrCreateWallet(userId);
    assert.strictEqual(walletInfo.balanceInr, 300);
    assert.strictEqual(mockDb.ledgerEntries.length, 2);

    const replayAttempt = await walletWebhook.handlePaymentWebhook(rawBody, validSignature, webhookEvent);
    assert.strictEqual(replayAttempt.handled, true);
    assert.strictEqual(replayAttempt.idempotentDuplicate, true);

    walletInfo = await wallet.getOrCreateWallet(userId);
    assert.strictEqual(walletInfo.balanceInr, 300, 'Replay attack must not double-credit wallet balance');
    assert.strictEqual(mockDb.ledgerEntries.length, 2, 'Replay attack must not create duplicate ledger entries');
  });
});
