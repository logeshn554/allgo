-- ============================================================================
-- ALLGO DATABASE ROLLBACK 011: PHASE 9 FINANCIAL SYSTEMS & SETTLEMENTS
-- SYMMETRIC ROLLBACK FOR MIGRATION 011
-- ============================================================================

BEGIN;

-- 1. DROP NOTIFICATIONS TABLE
DROP TABLE IF EXISTS notifications CASCADE;

-- 2. REVERT RATINGS COLUMNS
ALTER TABLE ratings
    DROP COLUMN IF EXISTS ride_id,
    DROP COLUMN IF EXISTS parcel_id,
    DROP COLUMN IF EXISTS hire_driver_booking_id,
    DROP COLUMN IF EXISTS is_hidden,
    DROP COLUMN IF EXISTS moderated_by,
    DROP COLUMN IF EXISTS moderation_reason,
    DROP COLUMN IF EXISTS moderated_at;

-- 3. DROP SUPPORT TICKET MESSAGES TABLE
DROP TABLE IF EXISTS support_ticket_messages CASCADE;

-- 4. REVERT SUPPORT TICKETS
ALTER TABLE support_tickets
    DROP CONSTRAINT IF EXISTS chk_ticket_status;

ALTER TABLE support_tickets
    ADD CONSTRAINT chk_ticket_status CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'));

ALTER TABLE support_tickets
    DROP COLUMN IF EXISTS partner_id,
    DROP COLUMN IF EXISTS merchant_id,
    DROP COLUMN IF EXISTS ride_id,
    DROP COLUMN IF EXISTS parcel_id,
    DROP COLUMN IF EXISTS hire_driver_booking_id,
    DROP COLUMN IF EXISTS creator_role;

-- 5. REVERT PAYOUTS COLUMNS
ALTER TABLE payouts
    DROP COLUMN IF EXISTS destination_reference,
    DROP COLUMN IF EXISTS settlement_id,
    DROP COLUMN IF EXISTS approved_by_admin_id,
    DROP COLUMN IF EXISTS idempotency_key;

-- 6. DROP COD RECONCILIATIONS TABLE
DROP TABLE IF EXISTS cod_reconciliations CASCADE;

-- 7. DROP MERCHANT SETTLEMENTS TABLE
DROP TABLE IF EXISTS merchant_settlements CASCADE;

-- 8. DROP PARTNER SETTLEMENTS TABLE
DROP TABLE IF EXISTS partner_settlements CASCADE;

-- 9. REMOVE IMMUTABILITY TRIGGERS & EXTRA COLUMNS FROM LEDGER_ENTRIES
DROP TRIGGER IF EXISTS trg_prevent_ledger_update ON ledger_entries;
DROP TRIGGER IF EXISTS trg_prevent_ledger_delete ON ledger_entries;
DROP FUNCTION IF EXISTS prevent_ledger_modification();

ALTER TABLE ledger_entries
    DROP COLUMN IF EXISTS ledger_transaction_id,
    DROP COLUMN IF EXISTS partner_id,
    DROP COLUMN IF EXISTS merchant_id,
    DROP COLUMN IF EXISTS reversal_reference,
    DROP COLUMN IF EXISTS reconciliation_reference,
    DROP COLUMN IF EXISTS is_reversal;

-- 10. REVERT WALLETS COLUMNS
ALTER TABLE wallets
    DROP COLUMN IF EXISTS promotional_balance_inr,
    DROP COLUMN IF EXISTS refundable_balance_inr;

COMMIT;
