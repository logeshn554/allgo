import assert from 'node:assert';
import crypto from 'node:crypto';
import { describe, it } from 'node:test';
import { RazorpayPaymentGateway } from '../../services/api/dist/ordering/gateways/razorpay-payment.gateway.js';
import { PaymentService } from '../../services/api/dist/ordering/services/payment.service.js';

class MockPaymentGateway {
  public createdOrders: any[] = [];
  public createdRefunds: any[] = [];
  public fetchedPayments: any[] = [];

  async createOrder(params: any): Promise<any> {
    const res = {
      id: `order_mock_${Date.now()}`,
      amount: Math.round(params.amountInr * 100),
      currency: params.currency || 'INR',
      receipt: params.receipt,
      status: 'created',
    };
    this.createdOrders.push({ params, res });
    return res;
  }

  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    const expected = crypto
      .createHmac('sha256', 'mock_secret_key_123')
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    return signature === expected;
  }

  async createRefund(params: any): Promise<any> {
    const res = {
      id: `rfnd_mock_${Date.now()}`,
      paymentId: params.paymentId,
      amount: Math.round(params.amountInr * 100),
      currency: 'INR',
      status: 'processed',
    };
    this.createdRefunds.push({ params, res });
    return res;
  }

  async fetchPayment(paymentId: string): Promise<any> {
    const res = {
      id: paymentId,
      orderId: `order_remote_${paymentId}`,
      amount: 45000,
      currency: 'INR',
      status: 'captured',
    };
    this.fetchedPayments.push({ paymentId, res });
    return res;
  }
}

class MockDb {
  public transactions: any[] = [];
  public payments: any[] = [];
  public refunds: any[] = [];
  public refundAllocations: any[] = [];

  async query(sql: string, params: any[] = []): Promise<{ rows: any[] }> {
    if (sql.includes('INSERT INTO payment_transactions')) {
      const row = {
        id: `tx_${this.transactions.length + 1}`,
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
        gateway_payment_id: null,
        gateway_signature: null,
        created_at: new Date(),
      };
      this.transactions.push(row);
      return { rows: [row] };
    }

    if (sql.includes('INSERT INTO payments')) {
      const row = {
        id: `pay_${this.payments.length + 1}`,
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

    if (sql.includes('SELECT * FROM payment_transactions WHERE id = $1')) {
      const row = this.transactions.find((t) => t.id === params[0]);
      return { rows: row ? [row] : [] };
    }

    if (sql.includes('SELECT pt.*, p.id as canonical_payment_id')) {
      const row = this.transactions.find(
        (t) =>
          t.sub_order_id === params[0] && (t.status === 'CAPTURED' || t.status === 'AUTHORIZED'),
      );
      if (row) return { rows: [{ ...row, canonical_payment_id: `canon_${row.id}` }] };
      return { rows: [] };
    }

    if (sql.includes('INSERT INTO refunds')) {
      const row = {
        id: `rfnd_db_${this.refunds.length + 1}`,
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

    if (sql.includes('INSERT INTO refund_allocations')) {
      const row = {
        id: `alloc_${this.refundAllocations.length + 1}`,
        refund_id: params[0],
        sub_order_id: params[1],
        allocated_amount_inr: params[2],
      };
      this.refundAllocations.push(row);
      return { rows: [row] };
    }

    if (sql.includes('UPDATE payment_transactions') && sql.includes("status = 'CAPTURED'")) {
      const row = this.transactions.find((t) => t.id === params[2]);
      if (row) {
        row.status = 'CAPTURED';
        row.gateway_payment_id = params[0];
        row.gateway_signature = params[1];
        row.captured_at = new Date();
      }
      return { rows: row ? [row] : [] };
    }

    if (sql.includes("UPDATE payment_transactions SET status = 'REFUNDED'")) {
      const row = this.transactions.find((t) => t.id === params[0]);
      if (row) row.status = 'REFUNDED';
      return { rows: row ? [row] : [] };
    }

    if (sql.includes("UPDATE payments SET status = 'CAPTURED'")) {
      const row = this.payments.find((p) => p.order_group_id === params[2]);
      if (row) {
        row.status = 'CAPTURED';
        row.gateway_payment_id = params[0];
        row.gateway_signature = params[1];
      }
      return { rows: row ? [row] : [] };
    }

    if (sql.includes('SELECT * FROM payment_transactions WHERE order_group_id = $1')) {
      return { rows: this.transactions.filter((t) => t.order_group_id === params[0]) };
    }

    return { rows: [] };
  }
}

describe('Phase B1 & B2: PaymentGateway and Real Razorpay Integration', () => {
  it('should create real Razorpay order through PaymentGateway and record real order ID', async () => {
    const mockDb = new MockDb();
    const mockGateway = new MockPaymentGateway();
    const paymentService = new PaymentService(mockDb as any, mockGateway as any);

    const init = await paymentService.initiatePayment(
      'grp_test_100',
      'sub_test_100',
      'cust_100',
      'UPI',
      450.0,
      'idem_key_100',
    );

    assert.strictEqual(init.gatewayName, 'RAZORPAY');
    assert.strictEqual(init.status, 'PENDING');
    assert.strictEqual(init.requiresAction, true);
    assert.strictEqual(mockGateway.createdOrders.length, 1);
    assert.strictEqual(init.gatewayOrderId, mockGateway.createdOrders[0].res.id);
  });

  it('should verify signature and confirm payment', async () => {
    const mockDb = new MockDb();
    const mockGateway = new MockPaymentGateway();
    const paymentService = new PaymentService(mockDb as any, mockGateway as any);

    const init = await paymentService.initiatePayment(
      'grp_test_101',
      'sub_test_101',
      'cust_101',
      'UPI',
      500.0,
    );
    const payId = 'pay_real_999';
    const validSig = crypto
      .createHmac('sha256', 'mock_secret_key_123')
      .update(`${init.gatewayOrderId}|${payId}`)
      .digest('hex');

    const confirmed = await paymentService.confirmPayment(init.transactionId, payId, validSig);
    assert.strictEqual(confirmed.status, 'CAPTURED');
    assert.strictEqual(confirmed.gateway_payment_id, payId);

    await assert.rejects(async () => {
      await paymentService.confirmPayment(init.transactionId, payId, 'forged_signature');
    }, /invalid razorpay payment signature/i);
  });

  it('should process refunds via Gateway and record refund_allocations per sub_order', async () => {
    const mockDb = new MockDb();
    const mockGateway = new MockPaymentGateway();
    const paymentService = new PaymentService(mockDb as any, mockGateway as any);

    const init = await paymentService.initiatePayment(
      'grp_test_102',
      'sub_test_102',
      'cust_102',
      'CARD',
      600.0,
    );
    const payId = 'pay_real_888';
    const validSig = crypto
      .createHmac('sha256', 'mock_secret_key_123')
      .update(`${init.gatewayOrderId}|${payId}`)
      .digest('hex');
    await paymentService.confirmPayment(init.transactionId, payId, validSig);

    const refund = await paymentService.processRefund(
      'sub_test_102',
      600.0,
      'Customer cancelled before food prep',
    );
    assert.ok(refund);
    assert.strictEqual(refund.status, 'PROCESSED');
    assert.strictEqual(mockGateway.createdRefunds.length, 1);
    assert.strictEqual(mockGateway.createdRefunds[0].params.paymentId, payId);

    assert.strictEqual(mockDb.refundAllocations.length, 1);
    assert.strictEqual(mockDb.refundAllocations[0].sub_order_id, 'sub_test_102');
    assert.strictEqual(mockDb.refundAllocations[0].allocated_amount_inr, 600.0);
  });

  it('should recover app-killed-during-payment via getPaymentStatus endpoint', async () => {
    const mockDb = new MockDb();
    const mockGateway = new MockPaymentGateway();
    const paymentService = new PaymentService(mockDb as any, mockGateway as any);

    const init = await paymentService.initiatePayment(
      'grp_test_103',
      'sub_test_103',
      'cust_103',
      'UPI',
      450.0,
    );
    const tx = mockDb.transactions.find((t) => t.id === init.transactionId);
    tx.gateway_payment_id = 'pay_crashed_123';

    const statusResult = await paymentService.getPaymentStatus('grp_test_103');
    assert.strictEqual(statusResult.status, 'CAPTURED');
    assert.strictEqual(statusResult.orderGroupId, 'grp_test_103');
    assert.strictEqual(mockGateway.fetchedPayments.length, 1);
  });

  it('RazorpayPaymentGateway test-mode fallback works cleanly without network', async () => {
    const gateway = new RazorpayPaymentGateway('test_key', 'test_secret');
    const order = await gateway.createOrder({ amountInr: 250, receipt: 'rcpt_1' });
    assert.match(order.id, /^order_/);
    assert.strictEqual(order.amount, 25000);

    const refund = await gateway.createRefund({ paymentId: 'pay_1', amountInr: 250 });
    assert.match(refund.id, /^rfnd_/);

    const payment = await gateway.fetchPayment('pay_1');
    assert.strictEqual(payment.id, 'pay_1');
    assert.strictEqual(payment.status, 'captured');
  });
});
