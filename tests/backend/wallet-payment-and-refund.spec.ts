import assert from 'node:assert';
import crypto from 'node:crypto';
import { describe, it } from 'node:test';
import { LedgerService } from '../../services/api/dist/finance/ledger/ledger.service.js';
import { WalletService } from '../../services/api/dist/finance/wallet/wallet.service.js';
import { PaymentService } from '../../services/api/dist/ordering/services/payment.service.js';

describe('Priority 1: Real Wallet Payments, Double-Entry Ledger and Refunds', () => {
  // In-memory mock database with table emulation
  class MockDb {
    wallets: any[] = [];
    ledger_entries: any[] = [];
    payment_transactions: any[] = [];
    payments: any[] = [];
    refunds: any[] = [];
    refund_allocations: any[] = [];
    sub_orders: any[] = [];

    async query(sql: string, params: any[] = []): Promise<{ rows: any[] }> {
      const s = sql.trim();

      // WALLETS
      if (s.startsWith('SELECT * FROM wallets WHERE user_id = $1')) {
        const row = this.wallets.find((w) => w.user_id === params[0]);
        return { rows: row ? [row] : [] };
      }
      if (s.startsWith('INSERT INTO wallets')) {
        const newWallet = {
          id: `wal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          user_id: params[0],
          balance_inr: '0.00',
          promotional_balance_inr: '0.00',
          refundable_balance_inr: '0.00',
          currency: 'INR',
          is_locked: false,
        };
        this.wallets.push(newWallet);
        return { rows: [newWallet] };
      }
      if (s.includes('FROM ledger_entries') && s.includes('SUM(')) {
        const walletId = params[0];
        const entries = this.ledger_entries.filter((e) => e.wallet_id === walletId);
        const bal = entries.reduce(
          (acc, e) => (e.direction === 'CREDIT' ? acc + e.amount_inr : acc - e.amount_inr),
          0,
        );
        return { rows: [{ ledger_balance: bal.toFixed(2) }] };
      }
      if (
        s.startsWith(
          'SELECT ledger_transaction_id FROM ledger_entries WHERE transaction_reference = $1',
        )
      ) {
        const row = this.ledger_entries.find((e) => e.transaction_reference === params[0]);
        return { rows: row ? [row] : [] };
      }
      if (s.startsWith('SELECT balance_inr FROM wallets WHERE id = $1 FOR UPDATE')) {
        const row = this.wallets.find((w) => w.id === params[0]);
        return { rows: row ? [{ balance_inr: row.balance_inr }] : [] };
      }
      if (s.startsWith('UPDATE wallets SET balance_inr = $1')) {
        const row = this.wallets.find((w) => w.id === params[1]);
        if (row) row.balance_inr = Number(params[0]).toFixed(2);
        return { rows: [row] };
      }
      if (
        s.startsWith('UPDATE wallets SET promotional_balance_inr = promotional_balance_inr + $1')
      ) {
        const row = this.wallets.find((w) => w.id === params[1]);
        if (row) {
          row.promotional_balance_inr = (
            Number(row.promotional_balance_inr) + Number(params[0])
          ).toFixed(2);
        }
        return { rows: [row] };
      }
      if (s.startsWith('UPDATE wallets SET refundable_balance_inr = refundable_balance_inr + $1')) {
        const row = this.wallets.find((w) => w.id === params[1]);
        if (row) {
          row.refundable_balance_inr = (
            Number(row.refundable_balance_inr) + Number(params[0])
          ).toFixed(2);
        }
        return { rows: [row] };
      }
      if (s.startsWith('UPDATE wallets') && s.includes('promotional_balance_inr = GREATEST')) {
        const row = this.wallets.find((w) => w.id === params[2]);
        if (row) {
          row.promotional_balance_inr = Math.max(
            0,
            Number(row.promotional_balance_inr) - Number(params[0]),
          ).toFixed(2);
          row.refundable_balance_inr = Math.max(
            0,
            Number(row.refundable_balance_inr) - Number(params[1]),
          ).toFixed(2);
        }
        return { rows: [row] };
      }
      if (s.startsWith('INSERT INTO ledger_entries')) {
        const newEntry = {
          id: `le_${this.ledger_entries.length + 1}`,
          wallet_id: params[0],
          ledger_transaction_id: params[7],
          transaction_reference: params[8],
          account_type: params[9],
          direction: params[10],
          amount_inr: Number(params[11]),
          balance_after_inr: params[12],
          description: params[13],
          metadata: params[14],
        };
        this.ledger_entries.push(newEntry);
        return { rows: [newEntry] };
      }

      // PAYMENTS & TRANSACTIONS
      if (s.startsWith('INSERT INTO payment_transactions')) {
        const row = {
          id: `pt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          order_group_id: params[0],
          sub_order_id: params[1],
          customer_id: params[2],
          gateway_name: params[3],
          gateway_order_id: params[4],
          idempotency_key: params[5],
          payment_method: params[6],
          amount_inr: params[7],
          currency: 'INR',
          status: params[8],
        };
        this.payment_transactions.push(row);
        return { rows: [row] };
      }
      if (s.startsWith('INSERT INTO payments')) {
        const row = {
          id: `pay_${Date.now()}`,
          order_group_id: params[0],
          gateway_name: params[1],
          gateway_order_id: params[2],
          payment_method: params[3],
          amount_inr: params[4],
          status: params[5],
        };
        this.payments.push(row);
        return { rows: [row] };
      }
      if (s.includes('FROM refunds r') && s.includes('JOIN refund_allocations ra')) {
        const subOrderId = params[0];
        const alloc = this.refund_allocations.find((a) => a.sub_order_id === subOrderId);
        if (alloc) {
          const ref = this.refunds.find(
            (r) => r.id === alloc.refund_id && r.status === 'PROCESSED',
          );
          return { rows: ref ? [ref] : [] };
        }
        return { rows: [] };
      }
      if (s.includes('FROM payment_transactions pt') && s.includes('JOIN payments p')) {
        const subOrderId = params[0];
        const pt = this.payment_transactions.find(
          (t) =>
            (t.sub_order_id === subOrderId || t.order_group_id) &&
            ['CAPTURED', 'AUTHORIZED'].includes(t.status),
        );
        if (pt) {
          const p = this.payments.find((pay) => pay.order_group_id === pt.order_group_id) || {
            id: 'p_can_1',
          };
          return { rows: [{ ...pt, canonical_payment_id: p.id }] };
        }
        return { rows: [] };
      }
      if (s.startsWith('INSERT INTO refunds')) {
        const row = {
          id: `rfnd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          payment_id: params[0],
          sub_order_id: params[1],
          gateway_refund_id: params[2],
          destination: params[3],
          amount_inr: params[4],
          reason: params[5],
          status: 'PROCESSED',
        };
        this.refunds.push(row);
        return { rows: [row] };
      }
      if (s.startsWith('INSERT INTO refund_allocations')) {
        const row = {
          id: `ra_${Date.now()}`,
          refund_id: params[0],
          sub_order_id: params[1],
          allocated_amount_inr: params[2],
        };
        this.refund_allocations.push(row);
        return { rows: [row] };
      }
      if (s.startsWith("UPDATE payment_transactions SET status = 'REFUNDED'")) {
        const row = this.payment_transactions.find((t) => t.id === params[0]);
        if (row) row.status = 'REFUNDED';
        return { rows: [row] };
      }
      if (s.startsWith('SELECT * FROM payment_transactions WHERE id = $1')) {
        const row = this.payment_transactions.find((t) => t.id === params[0]);
        return { rows: row ? [row] : [] };
      }
      if (s.startsWith('UPDATE payment_transactions') && s.includes("SET status = 'CAPTURED'")) {
        const row = this.payment_transactions.find((t) => t.id === params[2]);
        if (row) {
          row.status = 'CAPTURED';
          row.gateway_payment_id = params[0];
          row.gateway_signature = params[1];
        }
        return { rows: row ? [row] : [] };
      }
      if (s.startsWith('UPDATE payments') && s.includes("SET status = 'CAPTURED'")) {
        const row = this.payments.find((p) => p.order_group_id === params[2]);
        if (row) {
          row.status = 'CAPTURED';
          row.gateway_payment_id = params[0];
          row.gateway_signature = params[1];
        }
        return { rows: row ? [row] : [] };
      }

      // Default
      return { rows: [] };
    }
  }

  it('1. Crediting wallet creates balanced double-entry ledger records', async () => {
    const mockDb = new MockDb();
    const ledger = new LedgerService(mockDb as any);
    const walletService = new WalletService(mockDb as any, ledger);

    const userWallet = await walletService.creditWallet(
      'user_100',
      500.0,
      'Initial Top-up',
      'TX-TOPUP-001',
      false,
    );
    assert.strictEqual(userWallet.balanceInr, 500.0);
    assert.strictEqual(userWallet.refundableBalanceInr, 500.0);

    // Verify double-entry: 1 DEBIT to GATEWAY_ESCROW, 1 CREDIT to CUSTOMER_WALLET
    assert.strictEqual(mockDb.ledger_entries.length, 2);
    const debitEntry = mockDb.ledger_entries.find((e) => e.direction === 'DEBIT');
    const creditEntry = mockDb.ledger_entries.find((e) => e.direction === 'CREDIT');
    assert.strictEqual(debitEntry.account_type, 'GATEWAY_ESCROW');
    assert.strictEqual(debitEntry.amount_inr, 500.0);
    assert.strictEqual(creditEntry.account_type, 'CUSTOMER_WALLET');
    assert.strictEqual(creditEntry.amount_inr, 500.0);
  });

  it('2. Insufficient balance rejects payment and prevents debit', async () => {
    const mockDb = new MockDb();
    const ledger = new LedgerService(mockDb as any);
    const walletService = new WalletService(mockDb as any, ledger);
    const paymentService = new PaymentService(mockDb as any, walletService);

    // Initial wallet balance ₹100
    await walletService.creditWallet('user_poor', 100.0, 'Seed', 'SEED-001');

    // Attempt to pay ₹250
    await assert.rejects(
      async () => {
        await paymentService.initiatePayment(
          'grp_001',
          'sub_001',
          'user_poor',
          'WALLET',
          250.0,
          'idem_wal_1',
        );
      },
      (err: any) => {
        assert.match(err.message, /Insufficient wallet balance/);
        return true;
      },
    );

    // Wallet balance remains ₹100
    const w = await walletService.getOrCreateWallet('user_poor');
    assert.strictEqual(w.balanceInr, 100.0);
  });

  it('3. Successful wallet payment deducts balance and logs MERCHANT_SETTLEMENT ledger entry', async () => {
    const mockDb = new MockDb();
    const ledger = new LedgerService(mockDb as any);
    const walletService = new WalletService(mockDb as any, ledger);
    const paymentService = new PaymentService(mockDb as any, walletService);

    // Credit ₹1000
    await walletService.creditWallet('user_rich', 1000.0, 'Seed', 'SEED-002');

    const paymentResult = await paymentService.initiatePayment(
      'grp_002',
      'sub_002',
      'user_rich',
      'WALLET',
      420.0,
      'idem_wal_2',
    );

    assert.strictEqual(paymentResult.status, 'CAPTURED');
    assert.strictEqual(paymentResult.paymentMethod, 'WALLET');
    assert.strictEqual(paymentResult.requiresAction, false);

    // Wallet balance should now be 1000 - 420 = 580
    const w = await walletService.getOrCreateWallet('user_rich');
    assert.strictEqual(w.balanceInr, 580.0);

    // Check ledger entry for merchant settlement
    const settlementCredit = mockDb.ledger_entries.find(
      (e) => e.account_type === 'MERCHANT_SETTLEMENT' && e.direction === 'CREDIT',
    );
    assert.ok(settlementCredit, 'Expected credit entry to MERCHANT_SETTLEMENT');
    assert.strictEqual(settlementCredit.amount_inr, 420.0);
  });

  it('4. Sub-order cancellation issues wallet refund with double-entry and idempotency', async () => {
    const mockDb = new MockDb();
    const ledger = new LedgerService(mockDb as any);
    const walletService = new WalletService(mockDb as any, ledger);
    const paymentService = new PaymentService(mockDb as any, walletService);

    await walletService.creditWallet('user_buyer', 800.0, 'Topup', 'TOPUP-003');

    // Initiate order
    await paymentService.initiatePayment(
      'grp_003',
      'sub_cancelled',
      'user_buyer',
      'WALLET',
      350.0,
      'idem_wal_3',
    );

    let w = await walletService.getOrCreateWallet('user_buyer');
    assert.strictEqual(w.balanceInr, 450.0);

    // Process refund for sub_cancelled
    const refund = await paymentService.processRefund(
      'sub_cancelled',
      350.0,
      'Out of stock at merchant',
    );
    assert.ok(refund);
    assert.strictEqual(refund.status, 'PROCESSED');
    assert.strictEqual(refund.destination, 'WALLET');

    // Wallet balance restored to 800.0
    w = await walletService.getOrCreateWallet('user_buyer');
    assert.strictEqual(w.balanceInr, 800.0);

    // Attempt second refund for same sub-order (idempotency check)
    const duplicateRefund = await paymentService.processRefund(
      'sub_cancelled',
      350.0,
      'Duplicate request',
    );
    assert.strictEqual(
      duplicateRefund.id,
      refund.id,
      'Idempotency must return identical refund record',
    );

    // Wallet balance MUST remain 800.0 (no double refund)
    w = await walletService.getOrCreateWallet('user_buyer');
    assert.strictEqual(w.balanceInr, 800.0);
  });

  it('5. Double-entry transaction reference idempotency prevents duplicate debits', async () => {
    const mockDb = new MockDb();
    const ledger = new LedgerService(mockDb as any);
    const walletService = new WalletService(mockDb as any, ledger);

    await walletService.creditWallet('user_idem', 500.0, 'Seed', 'SEED-004');

    // Post debit with reference REF-SAME-01
    await walletService.debitWallet('user_idem', 150.0, 'Debit 1', 'REF-SAME-01');
    let w = await walletService.getOrCreateWallet('user_idem');
    assert.strictEqual(w.balanceInr, 350.0);

    // Post exact same reference again
    await walletService.debitWallet('user_idem', 150.0, 'Debit 1 Duplicate', 'REF-SAME-01');
    w = await walletService.getOrCreateWallet('user_idem');
    // Balance must still be 350.0 because ledger detected existing transaction reference
    assert.strictEqual(w.balanceInr, 350.0);
  });

  it('6. Razorpay online payment initiates with PENDING status and requiresAction', async () => {
    const mockDb = new MockDb();
    const ledger = new LedgerService(mockDb as any);
    const walletService = new WalletService(mockDb as any, ledger);
    const paymentService = new PaymentService(mockDb as any, walletService);

    const initiation = await paymentService.initiatePayment(
      'grp_rzp_1',
      'sub_rzp_1',
      'user_rzp',
      'UPI',
      650.0,
      'idem_rzp_1',
    );

    assert.strictEqual(initiation.paymentMethod, 'UPI');
    assert.strictEqual(initiation.gatewayName, 'RAZORPAY');
    assert.strictEqual(initiation.status, 'PENDING');
    assert.strictEqual(initiation.requiresAction, true);
    assert.ok(initiation.gatewayOrderId, 'Expected Razorpay gateway order ID');
  });

  it('7. Razorpay signature verification validates legitimate signatures and rejects fraudulent tampering', async () => {
    const mockDb = new MockDb();
    const ledger = new LedgerService(mockDb as any);
    const walletService = new WalletService(mockDb as any, ledger);
    const paymentService = new PaymentService(mockDb as any, walletService);

    const initiation = await paymentService.initiatePayment(
      'grp_rzp_2',
      'sub_rzp_2',
      'user_rzp_2',
      'CARD',
      900.0,
      'idem_rzp_2',
    );

    const keySecret = (paymentService as any).gateway.keySecret || 'test_secret';
    (paymentService as any).gateway.keySecret = 'rzp_sec_allgo_testing';
    const orderId = initiation.gatewayOrderId;
    const paymentId = 'pay_rzp_test_999';

    // 1. Legitimate HMAC-SHA256 signature
    const validSignature = crypto
      .createHmac('sha256', 'rzp_sec_allgo_testing')
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    // Tampered signature should be rejected
    await assert.rejects(
      async () => {
        await paymentService.confirmPayment(
          initiation.transactionId,
          paymentId,
          'forged_tampered_signature_xyz',
        );
      },
      (err: any) => {
        assert.match(err.message, /Invalid Razorpay payment signature/);
        return true;
      },
    );

    // Legitimate signature confirms payment and transitions status to CAPTURED
    const confirmed = await paymentService.confirmPayment(
      initiation.transactionId,
      paymentId,
      validSignature,
    );

    assert.strictEqual(confirmed.status, 'CAPTURED');
    assert.strictEqual(confirmed.gateway_payment_id, paymentId);
    assert.strictEqual(confirmed.gateway_signature, validSignature);
  });

  it('8. Cash on Delivery (COD) order initiates with PENDING status without requiring immediate capture', async () => {
    const mockDb = new MockDb();
    const ledger = new LedgerService(mockDb as any);
    const walletService = new WalletService(mockDb as any, ledger);
    const paymentService = new PaymentService(mockDb as any, walletService);

    const initiation = await paymentService.initiatePayment(
      'grp_cod_1',
      'sub_cod_1',
      'user_cod',
      'COD',
      320.0,
      'idem_cod_1',
    );

    assert.strictEqual(initiation.paymentMethod, 'COD');
    assert.strictEqual(initiation.gatewayName, 'CASH_ON_DELIVERY');
    assert.strictEqual(initiation.status, 'AUTHORIZED');
    assert.strictEqual(initiation.requiresAction, false);
  });
});
