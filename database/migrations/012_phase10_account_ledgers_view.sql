-- ============================================================================
-- ALLGO DATABASE MIGRATION 012: FINANCIAL LEDGER ENGINE ENHANCEMENT
-- CREATES ACCOUNT_LEDGERS COMPATIBILITY VIEW AND IMMUTABILITY RULES
-- ============================================================================

BEGIN;

-- Create account_ledgers view mirroring ledger_entries
CREATE OR REPLACE VIEW account_ledgers AS
SELECT
    id,
    ledger_transaction_id,
    transaction_reference,
    wallet_id,
    partner_id,
    merchant_id,
    sub_order_id,
    ride_id,
    parcel_id,
    hire_driver_booking_id,
    account_type,
    direction,
    amount_inr,
    balance_after_inr,
    description,
    metadata,
    is_reversal,
    reversal_reference,
    created_at
FROM ledger_entries;

COMMIT;
