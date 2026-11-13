import { db } from '../../config/database';
import { Knex } from 'knex';

export interface LedgerPosting {
  orderId: string;
  customerAmountCents: number;
  deliveryFeeCents: number;
  platformCommissionCents: number;
  driverEarningsCents: number;
  merchantSettlementCents: number;
}

export async function postOrderSettlement(posting: LedgerPosting): Promise<void> {
  await db.transaction(async (trx: Knex.Transaction) => {
    const rows = [
      {
        account_type: 'ACCOUNTS_RECEIVABLE_CUSTOMER',
        debit_cents: posting.customerAmountCents,
        credit_cents: 0,
      },
      {
        account_type: 'MERCHANT_PAYABLE',
        debit_cents: 0,
        credit_cents: posting.merchantSettlementCents,
      },
      {
        account_type: 'DRIVER_PAYABLE',
        debit_cents: 0,
        credit_cents: posting.driverEarningsCents,
      },
      {
        account_type: 'PLATFORM_REVENUE',
        debit_cents: 0,
        credit_cents: posting.platformCommissionCents,
      },
    ];

    const totalDebits = rows.reduce((acc, r) => acc + r.debit_cents, 0);
    const totalCredits = rows.reduce((acc, r) => acc + r.credit_cents, 0);

    if (totalDebits !== totalCredits) {
      throw new Error(`Ledger entry unbalanced. Debits: ${totalDebits}, Credits: ${totalCredits}`);
    }

    const records = rows.map((row) => ({
      ...row,
      reference_id: posting.orderId,
      created_at: new Date(),
    }));

    await trx('account_ledgers').insert(records);
  });
}
