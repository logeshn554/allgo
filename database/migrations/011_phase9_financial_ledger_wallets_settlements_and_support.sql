-- ============================================================================
-- ALLGO DATABASE MIGRATION 011: PHASE 9 FINANCIAL SYSTEMS & SETTLEMENTS
-- ADDITIVE MIGRATION FOR DOUBLE-ENTRY LEDGER, WALLETS, SETTLEMENTS,
-- COD RECONCILIATION, PAYOUTS, SUPPORT DISPUTES, RATINGS & NOTIFICATIONS
-- ============================================================================

BEGIN;

-- 1. EXTEND WALLETS TABLE FOR PROMOTIONAL & REFUNDABLE SUB-BALANCES
ALTER TABLE wallets
    ADD COLUMN IF NOT EXISTS promotional_balance_inr DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS refundable_balance_inr DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- 2. EXTEND LEDGER_ENTRIES TABLE WITH TRANSACTION GROUPING & OWNERSHIP
ALTER TABLE ledger_entries
    ADD COLUMN IF NOT EXISTS ledger_transaction_id UUID NOT NULL DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS merchant_id UUID REFERENCES merchants(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS reversal_reference VARCHAR(100),
    ADD COLUMN IF NOT EXISTS reconciliation_reference VARCHAR(100),
    ADD COLUMN IF NOT EXISTS is_reversal BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_ledger_transaction_id ON ledger_entries(ledger_transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_partner ON ledger_entries(partner_id);
CREATE INDEX IF NOT EXISTS idx_ledger_merchant ON ledger_entries(merchant_id);
CREATE INDEX IF NOT EXISTS idx_ledger_tx_ref ON ledger_entries(transaction_reference);

-- IMMUTABILITY ENFORCEMENT: PREVENT UPDATES OR DELETIONS ON POSTED LEDGER ENTRIES
CREATE OR REPLACE FUNCTION prevent_ledger_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Posted ledger entries are strictly immutable and cannot be updated or deleted. Post a compensating reversal transaction instead.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_ledger_update ON ledger_entries;
CREATE TRIGGER trg_prevent_ledger_update
    BEFORE UPDATE ON ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION prevent_ledger_modification();

DROP TRIGGER IF EXISTS trg_prevent_ledger_delete ON ledger_entries;
CREATE TRIGGER trg_prevent_ledger_delete
    BEFORE DELETE ON ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION prevent_ledger_modification();

-- 3. PARTNER SETTLEMENTS TABLE
CREATE TABLE IF NOT EXISTS partner_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    total_deliveries INTEGER NOT NULL DEFAULT 0,
    gross_earnings_inr DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    platform_commission_inr DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    cod_collected_inr DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    adjustments_inr DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    net_payable_inr DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    payout_id UUID REFERENCES payouts(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_partner_settlement_status CHECK (status IN ('PENDING', 'APPROVED', 'PROCESSING', 'SETTLED', 'FAILED'))
);

CREATE INDEX IF NOT EXISTS idx_partner_settlements_partner ON partner_settlements(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_settlements_status ON partner_settlements(status);

-- 4. MERCHANT SETTLEMENTS TABLE
CREATE TABLE IF NOT EXISTS merchant_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
    outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    total_orders INTEGER NOT NULL DEFAULT 0,
    gross_sales_inr DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    commission_inr DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    tax_withheld_tcs_inr DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    refund_deductions_inr DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    net_payable_inr DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    payout_id UUID REFERENCES payouts(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_merchant_settlement_status CHECK (status IN ('PENDING', 'APPROVED', 'PROCESSING', 'SETTLED', 'FAILED'))
);

CREATE INDEX IF NOT EXISTS idx_merchant_settlements_merchant ON merchant_settlements(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_settlements_status ON merchant_settlements(status);

-- 5. CASH ON DELIVERY (COD) RECONCILIATION TABLE
CREATE TABLE IF NOT EXISTS cod_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
    amount_expected_inr DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    amount_collected_inr DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    amount_deposited_inr DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    discrepancy_inr DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    reference VARCHAR(100),
    notes TEXT,
    verified_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_cod_recon_status CHECK (status IN ('PENDING', 'RECONCILED', 'DISCREPANCY', 'UNDER_INVESTIGATION', 'ADJUSTED'))
);

CREATE INDEX IF NOT EXISTS idx_cod_recon_partner ON cod_reconciliations(partner_id);
CREATE INDEX IF NOT EXISTS idx_cod_recon_status ON cod_reconciliations(status);

-- 6. EXTEND PAYOUTS TABLE FOR SETTLEMENT LINKS & SECURITY ATTRIBUTES
ALTER TABLE payouts
    ADD COLUMN IF NOT EXISTS destination_reference VARCHAR(100),
    ADD COLUMN IF NOT EXISTS settlement_id UUID,
    ADD COLUMN IF NOT EXISTS approved_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128) UNIQUE;

-- 7. SUPPORT TICKETS EXPANSION FOR MULTI-ROLE & NEW LIFECYCLE STATES
ALTER TABLE support_tickets
    DROP CONSTRAINT IF EXISTS chk_ticket_status;

ALTER TABLE support_tickets
    ADD CONSTRAINT chk_ticket_status CHECK (status IN (
        'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'ESCALATED', 'RESOLVED', 'CLOSED'
    ));

ALTER TABLE support_tickets
    ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS ride_id UUID REFERENCES rides(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS hire_driver_booking_id UUID REFERENCES hire_driver_bookings(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS creator_role VARCHAR(32) NOT NULL DEFAULT 'CUSTOMER';

CREATE INDEX IF NOT EXISTS idx_support_partner ON support_tickets(partner_id);
CREATE INDEX IF NOT EXISTS idx_support_merchant ON support_tickets(merchant_id);
CREATE INDEX IF NOT EXISTS idx_support_status ON support_tickets(status);

-- 8. SUPPORT TICKET MESSAGES (CONVERSATION THREAD WITH INTERNAL ADMIN NOTES PRIVACY)
CREATE TABLE IF NOT EXISTS support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    sender_role VARCHAR(32) NOT NULL,
    message TEXT NOT NULL,
    attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON support_ticket_messages(ticket_id);

-- 9. RATINGS TABLE EXPANSION FOR MOBILITY & MODERATION
ALTER TABLE ratings
    ADD COLUMN IF NOT EXISTS ride_id UUID REFERENCES rides(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS parcel_id UUID REFERENCES parcels(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS hire_driver_booking_id UUID REFERENCES hire_driver_bookings(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS moderation_reason TEXT,
    ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_ratings_target ON ratings(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_ratings_hidden ON ratings(is_hidden);

-- 10. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL DEFAULT 'CUSTOMER',
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    reference_type VARCHAR(50),
    reference_id VARCHAR(100),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_role ON notifications(user_id, role);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);

COMMIT;
