import assert from 'node:assert';
import { describe, it } from 'node:test';
import { RazorpayXPayoutGateway } from '../../services/api/dist/finance/gateways/razorpayx-payout.gateway.js';
import { LedgerService } from '../../services/api/dist/finance/ledger/ledger.service.js';
import { PayoutService } from '../../services/api/dist/finance/payout/payout.service.js';

class MockPayoutGateway {
  public payouts: any[] = [];
  public fetchedPayouts: any[] = [];
  public cancelledPayouts: any[] = [];

  async createPayout(params: any): Promise<any> {
    const res = {
      id: `pout_mock_${Date.now()}`,
      entity: 'payout',
      fundAccountId: params.fundAccountId || 'fa_mock_123',
      amount: Math.round(params.amountInr * 100),
      currency: 'INR',
      status: 'processing',
      mode: params.mode || 'IMPS',
      referenceId: params.referenceId,
    };
    this.payouts.push({ params, res });
    return res;
  }

  async fetchPayout(payoutId: string): Promise<any> {
    const res = {
      id: payoutId,
      amount: 50000,
      status: 'processed',
      utr: `UTR_${Date.now()}`,
    };
    this.fetchedPayouts.push(res);
    return res;
  }

  async cancelPayout(payoutId: string): Promise<any> {
    const res = {
      id: payoutId,
      entity: 'payout',
      amount: 50000,
      currency: 'INR',
      status: 'cancelled',
      mode: 'IMPS',
      referenceId: `ref_${payoutId}`,
    };
    this.cancelledPayouts.push(res);
    return res;
  }
}

class MockDb {
  public payouts: any[] = [];
  public ledgerEntries: any[] = [];

  async query(sql: string, params: any[] = []): Promise<{ rows: any[] }> {
    if (sql.includes('SELECT * FROM payouts WHERE idempotency_key = $1')) {
      const row = this.payouts.find((p) => p.idempotency_key === params[0]);
      return { rows: row ? [row] : [] };
    }

    if (sql.includes('INSERT INTO payouts')) {
      const row = {
        id: `po_${this.payouts.length + 1}`,
        recipient_type: params[0],
        recipient_id: params[1],
        payout_channel: 'RAZORPAYX',
        gross_amount_inr: params[2],
        net_amount_inr: params[2],
        status: 'SCHEDULED',
        destination_reference: params[3],
        settlement_id: params[4],
        approved_by_admin_id: params[5],
        idempotency_key: params[6],
        razorpayx_payout_id: null,
        created_at: new Date(),
      };
      this.payouts.push(row);
      return { rows: [row] };
    }

    if (sql.includes('SELECT * FROM payouts WHERE id = $1')) {
      const row = this.payouts.find((p) => p.id === params[0]);
      return { rows: row ? [row] : [] };
    }

    if (sql.includes('UPDATE payouts') && sql.includes('razorpayx_payout_id = $2')) {
      const row = this.payouts.find((p) => p.id === params[3]);
      if (row) {
        row.status = params[0];
        row.razorpayx_payout_id = params[1];
        row.approved_by_admin_id = params[2];
      }
      return { rows: row ? [row] : [] };
    }

    if (sql.includes('SELECT * FROM payouts WHERE razorpayx_payout_id = $1')) {
      const row = this.payouts.find((p) => p.razorpayx_payout_id === params[0]);
      return { rows: row ? [row] : [] };
    }

    if (sql.includes("UPDATE payouts SET status = 'SUCCESS'")) {
      const row = this.payouts.find((p) => p.id === params[0]);
      if (row) row.status = 'SUCCESS';
      return { rows: row ? [row] : [] };
    }

    if (sql.includes("UPDATE payouts SET status = 'FAILED'")) {
      const row = this.payouts.find((p) => p.id === params[1]);
      if (row) {
        row.status = 'FAILED';
        row.failure_reason = params[0];
      }
      return { rows: row ? [row] : [] };
    }

    // Ledger queries
    if (
      sql.includes(
        'SELECT ledger_transaction_id FROM ledger_entries WHERE transaction_reference = $1',
      )
    ) {
      const row = this.ledgerEntries.find((e) => e.transaction_reference === params[0]);
      return { rows: row ? [row] : [] };
    }

    if (sql.includes('INSERT INTO ledger_entries')) {
      const entry = {
        id: `entry_${this.ledgerEntries.length + 1}`,
        partner_id: params[5],
        merchant_id: params[6],
        ledger_transaction_id: params[7],
        transaction_reference: params[8],
        account_type: params[9],
        direction: params[10],
        amount_inr: params[11],
        description: params[13],
      };
      this.ledgerEntries.push(entry);
      return { rows: [entry] };
    }

    return { rows: [] };
  }
}

describe('Phase B3: PayoutGateway and RazorpayX Payout Lifecycle', () => {
  it('should schedule payout and disburse via RazorpayX PayoutGateway', async () => {
    const mockDb = new MockDb();
    const ledger = new LedgerService(mockDb as any);
    const mockGateway = new MockPayoutGateway();
    const payoutService = new PayoutService(mockDb as any, ledger, mockGateway as any);

    const created = await payoutService.createPayout({
      recipientType: 'PARTNER',
      recipientId: 'prt_100',
      amountInr: 1500,
      destinationReference: '9876543210',
    });

    assert.strictEqual(created.status, 'SCHEDULED');
    assert.strictEqual(created.destination_reference, '****3210');

    const processed = await payoutService.processPayout(created.id, 'adm_1');
    assert.strictEqual(processed.status, 'PROCESSING');
    assert.ok(processed.razorpayx_payout_id);
    assert.strictEqual(mockGateway.payouts.length, 1);

    // Verify double-entry ledger entry was created
    const partnerDebit = mockDb.ledgerEntries.find((e) => e.account_type === 'PARTNER_EARNINGS');
    const escrowCredit = mockDb.ledgerEntries.find((e) => e.account_type === 'GATEWAY_ESCROW');
    assert.ok(partnerDebit);
    assert.ok(escrowCredit);
    assert.strictEqual(partnerDebit.direction, 'DEBIT');
    assert.strictEqual(escrowCredit.direction, 'CREDIT');
  });

  it('should handle payout.processed webhook and transition status to SUCCESS', async () => {
    const mockDb = new MockDb();
    const ledger = new LedgerService(mockDb as any);
    const mockGateway = new MockPayoutGateway();
    const payoutService = new PayoutService(mockDb as any, ledger, mockGateway as any);

    const created = await payoutService.createPayout({
      recipientType: 'MERCHANT',
      recipientId: 'mer_100',
      amountInr: 2000,
      destinationReference: '1122334455',
    });

    const processed = await payoutService.processPayout(created.id, 'adm_1');

    const webhookRes = await payoutService.handlePayoutWebhook('payout.processed', {
      payout: {
        entity: {
          id: processed.razorpayx_payout_id,
          status: 'processed',
        },
      },
    });

    assert.strictEqual(webhookRes.handled, true);
    assert.strictEqual(webhookRes.status, 'SUCCESS');

    const inDb = mockDb.payouts.find((p) => p.id === created.id);
    assert.strictEqual(inDb.status, 'SUCCESS');
  });

  it('should handle payout.reversed webhook, transition to FAILED and reconcile reversal', async () => {
    const mockDb = new MockDb();
    const ledger = new LedgerService(mockDb as any);
    const mockGateway = new MockPayoutGateway();
    const payoutService = new PayoutService(mockDb as any, ledger, mockGateway as any);

    const created = await payoutService.createPayout({
      recipientType: 'PARTNER',
      recipientId: 'prt_200',
      amountInr: 800,
      destinationReference: '5566778899',
    });

    const processed = await payoutService.processPayout(created.id, 'adm_1');

    const webhookRes = await payoutService.handlePayoutWebhook('payout.reversed', {
      payout: {
        entity: {
          id: processed.razorpayx_payout_id,
          status: 'reversed',
          failure_reason: 'Account frozen',
        },
      },
    });

    assert.strictEqual(webhookRes.handled, true);
    assert.strictEqual(webhookRes.status, 'REVERSED');

    const inDb = mockDb.payouts.find((p) => p.id === created.id);
    assert.strictEqual(inDb.status, 'FAILED');
    assert.strictEqual(inDb.failure_reason, 'Account frozen');

    // Verify reversal ledger transaction was posted
    const revEntries = mockDb.ledgerEntries.filter((e) =>
      e.transaction_reference.startsWith('REV-PAYOUT-'),
    );
    assert.strictEqual(revEntries.length, 2);
    const escrowDebit = revEntries.find((e) => e.account_type === 'GATEWAY_ESCROW');
    const partnerCredit = revEntries.find((e) => e.account_type === 'PARTNER_EARNINGS');
    assert.strictEqual(escrowDebit.direction, 'DEBIT');
    assert.strictEqual(partnerCredit.direction, 'CREDIT');
  });

  it('RazorpayXPayoutGateway test-mode fallback works cleanly without network', async () => {
    const gateway = new RazorpayXPayoutGateway('test_key', 'test_secret');
    const res = await gateway.createPayout({
      accountNumber: '1234567890',
      amountInr: 300,
      referenceId: 'ref_001',
    });
    assert.match(res.id, /^pout_/);
    assert.strictEqual(res.status, 'processing');

    const fetched = await gateway.fetchPayout(res.id);
    assert.strictEqual(fetched.id, res.id);
    assert.strictEqual(fetched.status, 'processed');
  });
});
