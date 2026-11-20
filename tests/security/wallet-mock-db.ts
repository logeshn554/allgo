export class MockDatabaseService {
  public ledgerEntries: any[] = [];
  public walletsByUserId: Map<string, any> = new Map();
  public walletsById: Map<string, any> = new Map();
  public paymentTransactions: any[] = [];

  async query(sql: string, params: any[] = []): Promise<{ rows: any[] }> {
    if (sql.includes('SELECT * FROM wallets WHERE user_id = $1')) {
      const found = this.walletsByUserId.get(params[0]);
      return { rows: found ? [found] : [] };
    }
    if (sql.includes('SELECT balance_inr FROM wallets WHERE id = $1')) {
      const found = this.walletsById.get(params[0]);
      return { rows: found ? [found] : [] };
    }
    if (sql.includes('INSERT INTO wallets')) {
      const wallet = {
        id: `wal-${Date.now()}-${Math.random()}`,
        user_id: params[0],
        balance_inr: '0.00',
        promotional_balance_inr: '0.00',
        refundable_balance_inr: '0.00',
        currency: 'INR',
        is_locked: false,
      };
      this.walletsByUserId.set(params[0], wallet);
      this.walletsById.set(wallet.id, wallet);
      return { rows: [wallet] };
    }
    if (sql.includes('SELECT ledger_transaction_id FROM ledger_entries WHERE transaction_reference = $1')) {
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
        description: params[12],
        metadata: params[13],
        created_at: new Date(),
      };
      this.ledgerEntries.push(entry);
      return { rows: [entry] };
    }
    if (sql.includes('SELECT') && sql.includes('COALESCE(SUM') && sql.includes('FROM ledger_entries')) {
      const walletId = params[0];
      const entries = this.ledgerEntries.filter((e) => e.wallet_id === walletId);
      const balance = entries.reduce((acc, curr) => {
        const amt = parseFloat(curr.amount_inr);
        return curr.direction === 'CREDIT' ? acc + amt : acc - amt;
      }, 0);
      return { rows: [{ ledger_balance: balance.toFixed(2) }] };
    }
    if (sql.includes('UPDATE wallets SET balance_inr = $1')) {
      const wallet = this.walletsById.get(params[1]);
      if (wallet) wallet.balance_inr = params[0].toString();
      return { rows: wallet ? [wallet] : [] };
    }
    if (sql.includes('UPDATE wallets SET refundable_balance_inr = refundable_balance_inr + $1')) {
      const wallet = this.walletsById.get(params[1]);
      if (wallet) {
        wallet.refundable_balance_inr = (parseFloat(wallet.refundable_balance_inr) + params[0]).toFixed(2);
        wallet.balance_inr = (parseFloat(wallet.balance_inr) + params[0]).toFixed(2);
      }
      return { rows: wallet ? [wallet] : [] };
    }
    if (sql.includes('INSERT INTO payment_transactions')) {
      const trans = {
        id: `trans-${Date.now()}`,
        customer_id: params[0],
        gateway_name: 'RAZORPAY',
        gateway_order_id: params[1],
        idempotency_key: params[2],
        payment_method: 'WALLET',
        amount_inr: params[3].toFixed(2),
        currency: 'INR',
        status: 'PENDING',
        metadata: params[4],
      };
      this.paymentTransactions.push(trans);
      return { rows: [trans] };
    }
    if (sql.includes('SELECT * FROM payment_transactions WHERE gateway_order_id = $1')) {
      const found = this.paymentTransactions.find((p) => p.gateway_order_id === params[0]);
      return { rows: found ? [found] : [] };
    }
    if (sql.includes('UPDATE payment_transactions') && sql.includes("SET status = 'CAPTURED'")) {
      const trans = this.paymentTransactions.find((p) => p.id === params[1]);
      if (trans) {
        trans.status = 'CAPTURED';
        trans.gateway_payment_id = params[0];
      }
      return { rows: trans ? [trans] : [] };
    }
    return { rows: [] };
  }
}
