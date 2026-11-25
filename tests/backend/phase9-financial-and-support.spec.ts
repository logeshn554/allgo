import assert from 'node:assert';
import { describe, it } from 'node:test';
import { LedgerService } from '../../services/api/dist/finance/ledger/ledger.service.js';
import { WalletService } from '../../services/api/dist/finance/wallet/wallet.service.js';
import { NotificationsService } from '../../services/api/dist/notifications/notifications.service.js';
import { RatingsService } from '../../services/api/dist/ratings/ratings.service.js';
import { SupportService } from '../../services/api/dist/support/support.service.js';

// In-Memory Database Double for Fast, Deterministic Unit Testing
class MockDatabaseService {
  public ledgerEntries: any[] = [];
  public wallets: Map<string, any> = new Map();
  public supportTickets: Map<string, any> = new Map();
  public supportMessages: any[] = [];
  public ratings: any[] = [];
  public notifications: any[] = [];

  async query(sql: string, params: any[] = []): Promise<{ rows: any[] }> {
    // 0. Trigger simulation: Enforce strict immutability on ledger_entries
    if (sql.includes('UPDATE ledger_entries') || sql.includes('DELETE FROM ledger_entries')) {
      throw new Error(
        'Posted ledger entries are strictly immutable and cannot be updated or deleted. Post a compensating reversal transaction instead.',
      );
    }

    // 0.1 Column conformity checks
    if (sql.includes('INSERT INTO notifications') && sql.includes('referenceId')) {
      throw new Error(
        'column "referenceid" does not exist in table notifications; must be reference_id',
      );
    }
    if (sql.includes('p.service_types')) {
      throw new Error('column p.service_types does not exist on table partners');
    }

    // 1. Ledger queries
    if (
      sql.includes(
        'SELECT ledger_transaction_id FROM ledger_entries WHERE transaction_reference = $1',
      )
    ) {
      const found = this.ledgerEntries.find((e) => e.transaction_reference === params[0]);
      return { rows: found ? [found] : [] };
    }

    if (sql.includes('INSERT INTO ledger_entries')) {
      const entry = {
        id: `entry-${Date.now()}-${Math.random()}`,
        wallet_id: params[0],
        sub_order_id: params[1],
        ride_id: params[2],
        parcel_id: params[3],
        hire_driver_booking_id: params[4],
        partner_id: params[5],
        merchant_id: params[6],
        ledger_transaction_id: params[7],
        transaction_reference: params[8],
        account_type: params[9],
        direction: params[10],
        amount_inr: params[11],
        balance_after_inr: params[12],
        description: params[13],
        metadata: params[14],
        is_reversal: params[15] || false,
        reversal_reference: params[16] || null,
        created_at: new Date().toISOString(),
      };
      this.ledgerEntries.push(entry);
      return { rows: [entry] };
    }

    if (sql.includes('SELECT * FROM ledger_entries WHERE transaction_reference = $1')) {
      const rows = this.ledgerEntries.filter((e) => e.transaction_reference === params[0]);
      return { rows };
    }

    if (sql.includes('SELECT * FROM ledger_entries')) {
      return { rows: [...this.ledgerEntries] };
    }

    // 2. Wallets queries
    if (sql.includes('SELECT balance_inr FROM wallets WHERE id = $1')) {
      const wallet = this.wallets.get(params[0]);
      return { rows: wallet ? [wallet] : [] };
    }

    if (sql.includes('UPDATE wallets SET balance_inr = $1')) {
      const wallet = this.wallets.get(params[1]);
      if (wallet) {
        wallet.balance_inr = params[0].toString();
      }
      return { rows: [wallet] };
    }

    if (sql.includes('UPDATE wallets SET promotional_balance_inr = promotional_balance_inr + $1')) {
      const wallet = this.wallets.get(params[1]);
      if (wallet) {
        wallet.promotional_balance_inr = (
          Number.parseFloat(wallet.promotional_balance_inr || '0') + params[0]
        ).toFixed(2);
      }
      return { rows: [wallet] };
    }

    if (sql.includes('UPDATE wallets SET refundable_balance_inr = refundable_balance_inr + $1')) {
      const wallet = this.wallets.get(params[1]);
      if (wallet) {
        wallet.refundable_balance_inr = (
          Number.parseFloat(wallet.refundable_balance_inr || '0') + params[0]
        ).toFixed(2);
      }
      return { rows: [wallet] };
    }

    if (
      sql.includes(
        'UPDATE wallets \n       SET promotional_balance_inr = GREATEST(0.00, promotional_balance_inr - $1)',
      )
    ) {
      const wallet = this.wallets.get(params[2]);
      if (wallet) {
        wallet.promotional_balance_inr = Math.max(
          0,
          Number.parseFloat(wallet.promotional_balance_inr || '0') - params[0],
        ).toFixed(2);
        wallet.refundable_balance_inr = Math.max(
          0,
          Number.parseFloat(wallet.refundable_balance_inr || '0') - params[1],
        ).toFixed(2);
      }
      return { rows: [wallet] };
    }

    if (sql.includes('SELECT * FROM wallets WHERE user_id = $1')) {
      for (const w of this.wallets.values()) {
        if (w.user_id === params[0]) return { rows: [w] };
      }
      return { rows: [] };
    }

    if (sql.includes('INSERT INTO wallets')) {
      const w = {
        id: `wallet-${Date.now()}`,
        user_id: params[0],
        balance_inr: '0.00',
        promotional_balance_inr: '0.00',
        refundable_balance_inr: '0.00',
        currency: 'INR',
        is_locked: false,
      };
      this.wallets.set(w.id, w);
      return { rows: [w] };
    }

    if (sql.includes("SELECT \n         COALESCE(SUM(CASE WHEN direction = 'CREDIT'")) {
      let sum = 0;
      for (const e of this.ledgerEntries) {
        if (e.wallet_id === params[0]) {
          sum +=
            e.direction === 'CREDIT'
              ? Number.parseFloat(e.amount_inr)
              : -Number.parseFloat(e.amount_inr);
        }
      }
      return { rows: [{ ledger_balance: sum.toFixed(2) }] };
    }

    // 3. Support Tickets queries
    if (sql.includes('INSERT INTO support_tickets')) {
      const t = {
        id: `ticket-${Date.now()}`,
        user_id: params[0],
        creator_role: params[1],
        category: params[2],
        subject: params[3],
        description: params[4],
        priority: params[5],
        status: 'OPEN',
        created_at: new Date().toISOString(),
      };
      this.supportTickets.set(t.id, t);
      return { rows: [t] };
    }

    if (sql.includes('INSERT INTO support_ticket_messages')) {
      const msg = {
        id: `msg-${Date.now()}`,
        ticket_id: params[0],
        sender_id: params[1],
        sender_role: params[2],
        message: params[3],
        is_internal: params[4] || false,
        created_at: new Date().toISOString(),
      };
      this.supportMessages.push(msg);
      return { rows: [msg] };
    }

    if (sql.includes('SELECT * FROM support_tickets WHERE id = $1')) {
      const t = this.supportTickets.get(params[0]);
      return { rows: t ? [t] : [] };
    }

    if (
      sql.includes(
        'FROM support_tickets t\n       JOIN users u ON u.id = t.user_id\n       WHERE t.id = $1',
      )
    ) {
      const t = this.supportTickets.get(params[0]);
      return {
        rows: t ? [{ ...t, creator_phone: '+919876543210', creator_name: 'Test Customer' }] : [],
      };
    }

    if (sql.includes('FROM support_ticket_messages m') && sql.includes('is_internal = FALSE')) {
      const filtered = this.supportMessages.filter(
        (m) => m.ticket_id === params[0] && !m.is_internal,
      );
      return { rows: filtered };
    }

    if (sql.includes('FROM support_ticket_messages m')) {
      const filtered = this.supportMessages.filter((m) => m.ticket_id === params[0]);
      return { rows: filtered };
    }

    if (sql.includes('UPDATE support_tickets SET status = $1')) {
      const t = this.supportTickets.get(params[1]);
      if (t) t.status = params[0];
      return { rows: [t] };
    }

    // 4. Ratings queries
    if (sql.includes('SELECT id FROM ratings \n       WHERE reviewer_id = $1')) {
      const existing = this.ratings.find(
        (r) =>
          r.reviewer_id === params[0] &&
          r.target_id === params[1] &&
          ((params[2] && r.order_group_id === params[2]) || (params[4] && r.ride_id === params[4])),
      );
      return { rows: existing ? [existing] : [] };
    }

    if (sql.includes('INSERT INTO ratings')) {
      const r = {
        id: `rating-${Date.now()}`,
        reviewer_id: params[0],
        target_type: params[1],
        target_id: params[2],
        score: params[3],
        feedback: params[4],
        order_group_id: params[5],
        sub_order_id: params[6],
        ride_id: params[9],
        is_hidden: false,
        created_at: new Date().toISOString(),
      };
      this.ratings.push(r);
      return { rows: [r] };
    }

    if (sql.includes('UPDATE ratings\n       SET is_hidden = $1')) {
      const r = this.ratings.find((x) => x.id === params[3]);
      if (r) {
        r.is_hidden = params[0];
        r.moderation_reason = params[2];
      }
      return { rows: r ? [r] : [] };
    }

    // 5. Notifications queries
    if (sql.includes('SELECT id FROM notifications \n       WHERE user_id = $1')) {
      const existing = this.notifications.find(
        (n) => n.user_id === params[0] && n.title === params[1],
      );
      return { rows: existing ? [existing] : [] };
    }

    if (sql.includes('INSERT INTO notifications')) {
      const n = {
        id: `notif-${Date.now()}`,
        user_id: params[0],
        role: params[1],
        title: params[2],
        body: params[3],
        category: params[4],
        is_read: false,
        created_at: new Date().toISOString(),
      };
      this.notifications.push(n);
      return { rows: [n] };
    }

    if (sql.includes('SELECT * FROM notifications')) {
      return { rows: this.notifications.filter((n) => n.user_id === params[0]) };
    }

    if (sql.includes('SELECT COUNT(*) as unread_count FROM notifications')) {
      const count = this.notifications.filter((n) => n.user_id === params[0] && !n.is_read).length;
      return { rows: [{ unread_count: count }] };
    }

    if (sql.includes('UPDATE notifications\n       SET is_read = TRUE')) {
      const n = this.notifications.find((x) => x.id === params[0] && x.user_id === params[1]);
      if (n) n.is_read = true;
      return { rows: n ? [n] : [] };
    }

    return { rows: [] };
  }
}

describe('Phase 9: Financial Systems, Ledger, Wallets, Support & Ratings Contract Suite', () => {
  // =========================================================================
  // 1. DOUBLE-ENTRY ACCOUNTING LEDGER INVARIANTS
  // =========================================================================

  it('1.1 should strictly reject unbalanced double-entry transactions (Total Debit != Total Credit)', async () => {
    const mockDb = new MockDatabaseService();
    const ledger = new LedgerService(mockDb as any);

    await assert.rejects(
      async () => {
        await ledger.postTransaction({
          transactionReference: 'TX-UNBALANCED-01',
          description: 'Unbalanced payment test',
          entries: [
            {
              accountType: 'GATEWAY_ESCROW',
              direction: 'DEBIT',
              amountInr: 100.0,
              description: 'Customer payment debited',
            },
            {
              accountType: 'CUSTOMER_WALLET',
              direction: 'CREDIT',
              amountInr: 80.0, // Unbalanced by 20 INR!
              description: 'Wallet credit',
            },
          ],
        });
      },
      /Double-entry invariant violation.*Total DEBIT.*does not equal Total CREDIT/i,
      'Ledger must reject any transaction where debits do not balance credits down to 2 decimals',
    );
  });

  it('1.2 should strictly reject transactions with fewer than 2 entries', async () => {
    const mockDb = new MockDatabaseService();
    const ledger = new LedgerService(mockDb as any);

    await assert.rejects(async () => {
      await ledger.postTransaction({
        transactionReference: 'TX-SINGLE-ENTRY',
        description: 'Single entry invalid transaction',
        entries: [
          {
            accountType: 'GATEWAY_ESCROW',
            direction: 'DEBIT',
            amountInr: 100.0,
            description: 'Orphaned debit',
          },
        ],
      });
    }, /A double-entry transaction must contain at least two entries/i);
  });

  it('1.3 should strictly reject negative or zero entry amounts', async () => {
    const mockDb = new MockDatabaseService();
    const ledger = new LedgerService(mockDb as any);

    await assert.rejects(async () => {
      await ledger.postTransaction({
        transactionReference: 'TX-NEGATIVE',
        description: 'Negative amount attempt',
        entries: [
          {
            accountType: 'GATEWAY_ESCROW',
            direction: 'DEBIT',
            amountInr: -50.0,
            description: 'Negative debit',
          },
          {
            accountType: 'CUSTOMER_WALLET',
            direction: 'CREDIT',
            amountInr: -50.0,
            description: 'Negative credit',
          },
        ],
      });
    }, /Invalid entry amount.*All entries must have amount > 0/i);
  });

  it('1.4 should successfully post balanced transaction and enforce idempotency on transaction reference', async () => {
    const mockDb = new MockDatabaseService();
    const ledger = new LedgerService(mockDb as any);

    const result = await ledger.postTransaction({
      transactionReference: 'TX-BALANCED-100',
      description: 'Order Payment Allocation',
      entries: [
        {
          accountType: 'GATEWAY_ESCROW',
          direction: 'DEBIT',
          amountInr: 250.0,
          description: 'Payment collected',
        },
        {
          accountType: 'MERCHANT_SETTLEMENT',
          direction: 'CREDIT',
          amountInr: 200.0,
          description: 'Merchant share',
        },
        {
          accountType: 'PLATFORM_COMMISSION',
          direction: 'CREDIT',
          amountInr: 50.0,
          description: 'Platform fee',
        },
      ],
    });

    assert.ok(result.transactionId, 'Must return generated ledger_transaction_id');
    assert.strictEqual(result.entryCount, 3, 'Must record all 3 entries');
    assert.strictEqual(result.balancedAmount, 250.0, 'Must record exact balanced amount');

    // Duplicate submission with same transactionReference must be idempotent
    const duplicateResult = await ledger.postTransaction({
      transactionReference: 'TX-BALANCED-100',
      description: 'Duplicate attempt',
      entries: [
        {
          accountType: 'GATEWAY_ESCROW',
          direction: 'DEBIT',
          amountInr: 250.0,
          description: 'Duplicate',
        },
        {
          accountType: 'MERCHANT_SETTLEMENT',
          direction: 'CREDIT',
          amountInr: 250.0,
          description: 'Duplicate',
        },
      ],
    });

    assert.strictEqual(
      duplicateResult.transactionId,
      result.transactionId,
      'Idempotent call must return original transactionId without duplicate entries',
    );
  });

  it('1.5 should post compensating reversal with inverted directions and reversal flag', async () => {
    const mockDb = new MockDatabaseService();
    const ledger = new LedgerService(mockDb as any);

    await ledger.postTransaction({
      transactionReference: 'TX-ORIG-500',
      description: 'Initial Delivery Fee Payment',
      entries: [
        {
          accountType: 'GATEWAY_ESCROW',
          direction: 'DEBIT',
          amountInr: 120.0,
          description: 'Fee in escrow',
        },
        {
          accountType: 'PARTNER_EARNINGS',
          direction: 'CREDIT',
          amountInr: 120.0,
          description: 'Partner earnings',
        },
      ],
    });

    const reversal = await ledger.postReversal('TX-ORIG-500', 'Delivery cancelled before pickup');
    assert.ok(reversal.reversalTransactionId, 'Must generate reversal transaction');
    assert.match(
      reversal.reversalReference,
      /^REV-TX-ORIG-500/i,
      'Reversal reference must link to original transaction',
    );
  });

  // =========================================================================
  // 2. CUSTOMER WALLET INVARIANTS & LEDGER RECONCILIATION
  // =========================================================================

  it('2.1 should prevent debit exceeding available wallet balance', async () => {
    const mockDb = new MockDatabaseService();
    const ledger = new LedgerService(mockDb as any);
    const wallet = new WalletService(mockDb as any, ledger);

    const userId = 'usr-test-wallet-01';
    await wallet.creditWallet(userId, 100.0, 'Initial promo topup');

    await assert.rejects(
      async () => {
        await wallet.debitWallet(userId, 150.0, 'Attempt to overdraw');
      },
      /Insufficient wallet balance/i,
      'Must strictly reject debit when requested amount exceeds current balance',
    );
  });

  it('2.2 should reconcile wallet balance strictly from double-entry ledger entries', async () => {
    const mockDb = new MockDatabaseService();
    const ledger = new LedgerService(mockDb as any);
    const wallet = new WalletService(mockDb as any, ledger);

    const userId = 'usr-test-wallet-02';
    await wallet.creditWallet(userId, 300.0, 'Refund Credit');
    await wallet.debitWallet(userId, 50.0, 'Order Payment');

    const walletInfo = await wallet.getOrCreateWallet(userId);
    assert.strictEqual(
      walletInfo.balanceInr,
      250.0,
      'Balance must equal total credits minus debits (300 - 50 = 250)',
    );
  });

  it('2.3 should correctly deduct promotional credits first and update sub-balances on debit without drift', async () => {
    const mockDb = new MockDatabaseService();
    const ledger = new LedgerService(mockDb as any);
    const wallet = new WalletService(mockDb as any, ledger);

    const userId = 'usr-test-wallet-sub';
    await wallet.creditWallet(userId, 50.0, 'Promotional bonus', undefined, true);
    await wallet.creditWallet(userId, 100.0, 'Refund credit', undefined, false);

    let w = await wallet.getOrCreateWallet(userId);
    assert.strictEqual(w.balanceInr, 150.0);
    assert.strictEqual(w.promotionalBalanceInr, 50.0);
    assert.strictEqual(w.refundableBalanceInr, 100.0);

    // Debit 70 INR: 50 promo consumed, 20 refundable consumed
    await wallet.debitWallet(userId, 70.0, 'Order Payment');

    w = await wallet.getOrCreateWallet(userId);
    assert.strictEqual(w.balanceInr, 80.0);
    assert.strictEqual(w.promotionalBalanceInr, 0.0);
    assert.strictEqual(w.refundableBalanceInr, 80.0);
  });

  // =========================================================================
  // 3. SUPPORT TICKETS & ADMIN PRIVACY SECURITY BOUNDARY
  // =========================================================================

  it('3.1 should reject empty support messages or invalid ticket requests', async () => {
    const mockDb = new MockDatabaseService();
    const support = new SupportService(mockDb as any);

    await assert.rejects(async () => {
      await support.createTicket('usr-1', 'CUSTOMER', {
        category: '',
        subject: '',
        description: '',
      });
    }, /category, subject, and description are required/i);
  });

  it('3.2 CRITICAL SECURITY INVARIANT: Non-admin users must NEVER receive internal admin notes', async () => {
    const mockDb = new MockDatabaseService();
    const support = new SupportService(mockDb as any);

    const customerId = 'usr-customer-99';
    const adminId = 'usr-admin-01';

    const ticket = await support.createTicket(customerId, 'CUSTOMER', {
      category: 'PAYMENT_FAILED',
      subject: 'Double charged on order',
      description: 'I was charged twice on my card',
    });

    // Admin posts internal note (e.g., fraud score, bank reference, internal discussion)
    await support.addMessage(
      ticket.id,
      adminId,
      'ADMIN',
      'Suspicious refund pattern detected. Flagged for risk review.',
      true,
    );

    // Admin posts public reply to customer
    await support.addMessage(
      ticket.id,
      adminId,
      'ADMIN',
      'We are investigating your bank charge and will refund within 24h.',
      false,
    );

    // Customer retrieves ticket conversation:
    const customerView = await support.getTicketDetails(ticket.id, customerId, 'CUSTOMER');
    assert.strictEqual(
      customerView.messages.some((m: any) => m.is_internal === true),
      false,
      'CRITICAL: Customer must never receive internal notes!',
    );
    assert.strictEqual(
      customerView.messages.length,
      2,
      'Customer should only see initial ticket message and public admin reply',
    );

    // Admin retrieves ticket conversation:
    const adminView = await support.getTicketDetails(ticket.id, adminId, 'ADMIN');
    assert.strictEqual(
      adminView.messages.some((m: any) => m.is_internal === true),
      true,
      'Admin must receive all internal notes',
    );
    assert.strictEqual(
      adminView.messages.length,
      3,
      'Admin must see complete conversation including internal notes',
    );
  });

  it('3.3 should prevent non-admin users from creating internal notes', async () => {
    const mockDb = new MockDatabaseService();
    const support = new SupportService(mockDb as any);

    const customerId = 'usr-customer-88';
    const ticket = await support.createTicket(customerId, 'CUSTOMER', {
      category: 'ORDER_ISSUE',
      subject: 'Food arrived cold',
      description: 'The burger was cold',
    });

    await assert.rejects(
      async () => {
        await support.addMessage(ticket.id, customerId, 'CUSTOMER', 'Hacking internal note', true);
      },
      /Only administrators can post internal notes/i,
      'Non-admin users must be strictly forbidden from posting internal notes',
    );
  });

  // =========================================================================
  // 4. RATINGS, REVIEWS & MODERATION
  // =========================================================================

  it('4.1 should validate that rating score must be an integer between 1 and 5', async () => {
    const mockDb = new MockDatabaseService();
    const ratings = new RatingsService(mockDb as any);

    await assert.rejects(async () => {
      await ratings.submitRating('usr-1', {
        targetType: 'PARTNER',
        targetId: 'part-1',
        score: 0, // Invalid!
      });
    }, /Rating score must be an integer between 1 and 5/i);

    await assert.rejects(async () => {
      await ratings.submitRating('usr-1', {
        targetType: 'PARTNER',
        targetId: 'part-1',
        score: 6, // Invalid!
      });
    }, /Rating score must be an integer between 1 and 5/i);
  });

  it('4.2 should prevent duplicate ratings for the same completed service', async () => {
    const mockDb = new MockDatabaseService();
    const ratings = new RatingsService(mockDb as any);

    const reviewerId = 'usr-rev-1';
    const partnerId = 'part-xyz';
    const rideId = 'ride-abc';

    await ratings.submitRating(reviewerId, {
      targetType: 'PARTNER',
      targetId: partnerId,
      score: 5,
      feedback: 'Excellent safe driving!',
      rideId,
    });

    await assert.rejects(async () => {
      await ratings.submitRating(reviewerId, {
        targetType: 'PARTNER',
        targetId: partnerId,
        score: 4,
        rideId,
      });
    }, /already submitted a rating for this completed service/i);
  });

  it('4.3 should allow admin moderation to hide abusive review with reason', async () => {
    const mockDb = new MockDatabaseService();
    const ratings = new RatingsService(mockDb as any);

    const r = await ratings.submitRating('usr-rev-2', {
      targetType: 'MERCHANT',
      targetId: 'merch-1',
      score: 1,
      feedback: 'Abusive profane content here',
      orderGroupId: 'grp-1',
    });

    const moderated = await ratings.moderateRating(
      r.id,
      'admin-1',
      true,
      'Violates community guidelines / profanity',
    );
    assert.strictEqual(moderated.is_hidden, true, 'Review must be flagged as hidden');
    assert.strictEqual(moderated.moderation_reason, 'Violates community guidelines / profanity');
  });

  // =========================================================================
  // 5. NOTIFICATIONS DEDUPLICATION & STATE TRANSITIONS
  // =========================================================================

  it('5.1 should deduplicate rapid identical notifications and track read status', async () => {
    const mockDb = new MockDatabaseService();
    const notifs = new NotificationsService(mockDb as any);

    const userId = 'usr-notif-1';
    const n1 = await notifs.sendNotification({
      userId,
      role: 'CUSTOMER',
      title: 'Order Confirmed',
      body: 'Your order #101 is being prepared.',
      category: 'BOOKING',
    });

    // Immediate duplicate send
    const n2 = await notifs.sendNotification({
      userId,
      role: 'CUSTOMER',
      title: 'Order Confirmed',
      body: 'Your order #101 is being prepared.',
      category: 'BOOKING',
    });

    assert.strictEqual(n1.id, n2.id, 'Duplicate notification within 60s must be deduplicated');

    const inbox = await notifs.getNotifications(userId);
    assert.strictEqual(inbox.notifications.length, 1);
    assert.strictEqual(inbox.unreadCount, 1);

    await notifs.markAsRead(n1.id, userId);
    const updatedInbox = await notifs.getNotifications(userId);
    assert.strictEqual(updatedInbox.unreadCount, 0, 'Unread count must be 0 after marking as read');
  });
});
