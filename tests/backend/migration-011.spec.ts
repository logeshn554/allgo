import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = path.resolve(import.meta.dirname, '../..');
const MIGRATION_PATH = path.join(ROOT_DIR, 'database/migrations/011_phase9_financial_ledger_wallets_settlements_and_support.sql');
const ROLLBACK_PATH = path.join(ROOT_DIR, 'database/rollbacks/011_phase9_financial_ledger_wallets_settlements_and_support_rollback.sql');

describe('Phase 9: Database Migration 011 & Rollback Verification', () => {

  // =========================================================================
  // TIER 1: STATIC & STRUCTURAL ANALYSIS (Runs In-Memory, 100% Offline-Safe)
  // =========================================================================

  it('1. should verify migration 011 and rollback 011 files exist and conform to transaction safety', () => {
    assert.strictEqual(fs.existsSync(MIGRATION_PATH), true, 'Migration 011 file must exist');
    assert.strictEqual(fs.existsSync(ROLLBACK_PATH), true, 'Rollback 011 file must exist');

    const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');
    const rollbackSql = fs.readFileSync(ROLLBACK_PATH, 'utf8');

    assert.match(migrationSql, /^[\s\S]*?BEGIN;/i, 'Migration 011 must start with BEGIN;');
    assert.match(migrationSql, /COMMIT;\s*$/i, 'Migration 011 must end with COMMIT;');
    assert.match(rollbackSql, /^[\s\S]*?BEGIN;/i, 'Rollback 011 must start with BEGIN;');
    assert.match(rollbackSql, /COMMIT;\s*$/i, 'Rollback 011 must end with COMMIT;');
  });

  it('2. should verify additive columns on wallets table for promotional and refundable sub-balances', () => {
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
    assert.match(sql, /ALTER\s+TABLE\s+wallets/i);
    assert.match(sql, /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+promotional_balance_inr\b/i);
    assert.match(sql, /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+refundable_balance_inr\b/i);
  });

  it('3. should verify additive columns on canonical ledger_entries table for grouping and reversals', () => {
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
    assert.match(sql, /ALTER\s+TABLE\s+ledger_entries/i);
    assert.match(sql, /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+ledger_transaction_id\b/i);
    assert.match(sql, /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+partner_id\b/i);
    assert.match(sql, /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+merchant_id\b/i);
    assert.match(sql, /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+reversal_reference\b/i);
    assert.match(sql, /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+reconciliation_reference\b/i);
    assert.match(sql, /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+is_reversal\b/i);
  });

  it('4. should verify immutability triggers on ledger_entries to strictly prevent mutations', () => {
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
    assert.match(sql, /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+prevent_ledger_modification/i);
    assert.match(sql, /CREATE\s+TRIGGER\s+trg_prevent_ledger_update/i);
    assert.match(sql, /BEFORE\s+UPDATE\s+ON\s+ledger_entries/i);
    assert.match(sql, /CREATE\s+TRIGGER\s+trg_prevent_ledger_delete/i);
    assert.match(sql, /BEFORE\s+DELETE\s+ON\s+ledger_entries/i);
  });

  it('5. should verify partner_settlements table creation with status check constraint', () => {
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
    assert.match(sql, /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+partner_settlements/i);
    assert.match(sql, /gross_earnings_inr\b/i);
    assert.match(sql, /platform_commission_inr\b/i);
    assert.match(sql, /cod_collected_inr\b/i);
    assert.match(sql, /net_payable_inr\b/i);
    assert.match(sql, /CONSTRAINT\s+chk_partner_settlement_status\s+CHECK/i);
  });

  it('6. should verify merchant_settlements table creation with multi-outlet support', () => {
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
    assert.match(sql, /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+merchant_settlements/i);
    assert.match(sql, /outlet_id\s+UUID\s+REFERENCES\s+outlets/i);
    assert.match(sql, /tax_withheld_tcs_inr\b/i);
    assert.match(sql, /refund_deductions_inr\b/i);
    assert.match(sql, /net_payable_inr\b/i);
    assert.match(sql, /CONSTRAINT\s+chk_merchant_settlement_status\s+CHECK/i);
  });

  it('7. should verify cod_reconciliations table creation with discrepancy tracking', () => {
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
    assert.match(sql, /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+cod_reconciliations/i);
    assert.match(sql, /amount_expected_inr\b/i);
    assert.match(sql, /amount_collected_inr\b/i);
    assert.match(sql, /amount_deposited_inr\b/i);
    assert.match(sql, /discrepancy_inr\b/i);
    assert.match(sql, /CONSTRAINT\s+chk_cod_recon_status\s+CHECK/i);
  });

  it('8. should verify payouts table additive columns for idempotency and settlement reference', () => {
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
    assert.match(sql, /ALTER\s+TABLE\s+payouts/i);
    assert.match(sql, /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+destination_reference\b/i);
    assert.match(sql, /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+settlement_id\b/i);
    assert.match(sql, /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+approved_by_admin_id\b/i);
    assert.match(sql, /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+idempotency_key\b/i);
  });

  it('9. should verify support_tickets check constraint covers all 7 required lifecycle states', () => {
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
    assert.match(sql, /ALTER\s+TABLE\s+support_tickets\s+DROP\s+CONSTRAINT\s+IF\s+EXISTS\s+chk_ticket_status/i);
    assert.match(sql, /ALTER\s+TABLE\s+support_tickets\s+ADD\s+CONSTRAINT\s+chk_ticket_status\s+CHECK/i);

    const requiredStatuses = [
      'OPEN',
      'ASSIGNED',
      'IN_PROGRESS',
      'WAITING_FOR_CUSTOMER',
      'ESCALATED',
      'RESOLVED',
      'CLOSED'
    ];

    for (const st of requiredStatuses) {
      assert.match(sql, new RegExp(`'${st}'`), `Migration 011 must include ticket status '${st}'`);
    }
  });

  it('10. should verify support_ticket_messages table with is_internal privacy flag for admin notes', () => {
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
    assert.match(sql, /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+support_ticket_messages/i);
    assert.match(sql, /ticket_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+support_tickets/i);
    assert.match(sql, /sender_role\s+VARCHAR/i);
    assert.match(sql, /is_internal\s+BOOLEAN\s+NOT\s+NULL\s+DEFAULT\s+FALSE/i);
  });

  it('11. should verify ratings table additive columns for mobility services and admin moderation', () => {
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
    assert.match(sql, /ALTER\s+TABLE\s+ratings/i);
    assert.match(sql, /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+ride_id\b/i);
    assert.match(sql, /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+parcel_id\b/i);
    assert.match(sql, /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+hire_driver_booking_id\b/i);
    assert.match(sql, /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+is_hidden\b/i);
    assert.match(sql, /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+moderated_by\b/i);
    assert.match(sql, /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+moderation_reason\b/i);
  });

  it('12. should verify notifications table creation with read/unread indexing', () => {
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
    assert.match(sql, /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+notifications/i);
    assert.match(sql, /user_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+users/i);
    assert.match(sql, /is_read\s+BOOLEAN\s+NOT\s+NULL\s+DEFAULT\s+FALSE/i);
    assert.match(sql, /idx_notifications_unread/i);
  });

  it('13. should verify symmetric rollback 011 reverses all migration 011 changes', () => {
    const rollbackSql = fs.readFileSync(ROLLBACK_PATH, 'utf8');
    assert.match(rollbackSql, /DROP\s+TABLE\s+IF\s+EXISTS\s+notifications/i);
    assert.match(rollbackSql, /DROP\s+TABLE\s+IF\s+EXISTS\s+support_ticket_messages/i);
    assert.match(rollbackSql, /DROP\s+TABLE\s+IF\s+EXISTS\s+cod_reconciliations/i);
    assert.match(rollbackSql, /DROP\s+TABLE\s+IF\s+EXISTS\s+merchant_settlements/i);
    assert.match(rollbackSql, /DROP\s+TABLE\s+IF\s+EXISTS\s+partner_settlements/i);
    assert.match(rollbackSql, /DROP\s+TRIGGER\s+IF\s+EXISTS\s+trg_prevent_ledger_update/i);
    assert.match(rollbackSql, /DROP\s+TRIGGER\s+IF\s+EXISTS\s+trg_prevent_ledger_delete/i);
    assert.match(rollbackSql, /DROP\s+FUNCTION\s+IF\s+EXISTS\s+prevent_ledger_modification/i);
  });
});
