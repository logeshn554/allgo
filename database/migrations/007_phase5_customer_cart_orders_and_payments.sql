-- ==============================================================================
-- ALLGO DATABASE MIGRATION 007
-- Phase 5: Customer Cart, Checkout, Food & Grocery Ordering, Payments & Refunds
-- ==============================================================================

BEGIN;

-- 1. ADDITIVE COLUMNS TO CART_ITEMS
ALTER TABLE cart_items 
    ADD COLUMN IF NOT EXISTS selected_options JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS special_instructions TEXT;

-- 2. CUSTOMER SAVED ADDRESSES TABLE
CREATE TABLE IF NOT EXISTS customer_saved_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(50) NOT NULL DEFAULT 'Home',
    recipient_name VARCHAR(100) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    landmark TEXT,
    city VARCHAR(100) NOT NULL DEFAULT 'Chennai',
    state VARCHAR(100) NOT NULL DEFAULT 'Tamil Nadu',
    postal_code VARCHAR(20) NOT NULL,
    location geometry(Point, 4326) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_addresses_customer ON customer_saved_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_saved_addresses_location ON customer_saved_addresses USING GIST(location);

-- 3. ADDITIVE COLUMNS TO SUB_ORDERS
ALTER TABLE sub_orders
    ADD COLUMN IF NOT EXISTS delivery_fee_inr DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS platform_fee_inr DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS total_payable_inr DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS delivery_job_id UUID REFERENCES delivery_jobs(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS delivery_address_snapshot JSONB,
    ADD COLUMN IF NOT EXISTS delivery_instructions TEXT,
    ADD COLUMN IF NOT EXISTS customer_notes TEXT,
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
    ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rejected_reason TEXT,
    ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

-- 4. LINK DELIVERY_JOBS TO SUB_ORDERS
ALTER TABLE delivery_jobs
    ADD COLUMN IF NOT EXISTS sub_order_id UUID REFERENCES sub_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sub_orders_delivery_job ON sub_orders(delivery_job_id);
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_sub_order ON delivery_jobs(sub_order_id);

-- 5. ORDER ITEM CUSTOMIZATIONS (Snapshot of selected options)
CREATE TABLE IF NOT EXISTS order_item_customizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    group_id UUID REFERENCES item_option_groups(id) ON DELETE SET NULL,
    group_name_snapshot VARCHAR(100) NOT NULL,
    option_id UUID REFERENCES item_options(id) ON DELETE SET NULL,
    option_name_snapshot VARCHAR(100) NOT NULL,
    price_adjustment_inr DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_customizations_item ON order_item_customizations(order_item_id);

-- 6. PAYMENT TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_group_id UUID REFERENCES order_groups(id) ON DELETE RESTRICT,
    sub_order_id UUID REFERENCES sub_orders(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    gateway_name VARCHAR(32) NOT NULL DEFAULT 'CASH_ON_DELIVERY',
    gateway_order_id VARCHAR(100),
    gateway_payment_id VARCHAR(100),
    gateway_signature VARCHAR(255),
    idempotency_key VARCHAR(128) UNIQUE,
    payment_method VARCHAR(32) NOT NULL DEFAULT 'COD',
    amount_inr DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    error_code VARCHAR(100),
    error_description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    captured_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_trans_status CHECK (status IN ('PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED')),
    CONSTRAINT chk_trans_method CHECK (payment_method IN ('COD', 'UPI', 'CARD', 'NETBANKING', 'WALLET'))
);

CREATE INDEX IF NOT EXISTS idx_trans_order_group ON payment_transactions(order_group_id);
CREATE INDEX IF NOT EXISTS idx_trans_customer ON payment_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_trans_gateway_order ON payment_transactions(gateway_order_id);

-- 7. COUPON REDEMPTIONS (Atomic tracking per user & order)
CREATE TABLE IF NOT EXISTS coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    order_group_id UUID NOT NULL REFERENCES order_groups(id) ON DELETE CASCADE,
    sub_order_id UUID REFERENCES sub_orders(id) ON DELETE CASCADE,
    coupon_code VARCHAR(50) NOT NULL,
    discount_amount_inr DECIMAL(10,2) NOT NULL,
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_coupon_user_order UNIQUE (coupon_id, customer_id, order_group_id)
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user ON coupon_redemptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_code ON coupon_redemptions(coupon_code);

-- 8. ORDER CANCELLATIONS & REFUND AUDIT TABLE
CREATE TABLE IF NOT EXISTS order_cancellations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_order_id UUID NOT NULL REFERENCES sub_orders(id) ON DELETE CASCADE,
    cancelled_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    role_at_cancellation VARCHAR(32) NOT NULL,
    reason TEXT NOT NULL,
    stage_at_cancellation VARCHAR(32) NOT NULL,
    refund_eligible BOOLEAN NOT NULL DEFAULT FALSE,
    refund_amount_inr DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    refund_id UUID REFERENCES refunds(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_cancellation_role CHECK (role_at_cancellation IN ('CUSTOMER', 'MERCHANT', 'ADMIN', 'SYSTEM'))
);

CREATE INDEX IF NOT EXISTS idx_cancellations_sub_order ON order_cancellations(sub_order_id);

-- 9. SEED INITIAL TEST COUPONS
INSERT INTO coupons (
    code, vertical_type, discount_percentage, flat_discount_inr,
    min_order_amount_inr, max_discount_inr, usage_limit_per_user,
    valid_from, valid_until, is_active
) VALUES 
    ('ALLGO50', 'FOOD', 50.00, NULL, 149.00, 100.00, 3, NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days', TRUE),
    ('FEAST20', 'FOOD', 20.00, NULL, 299.00, 150.00, 5, NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days', TRUE),
    ('FLAT50', 'FOOD', NULL, 50.00, 199.00, 50.00, 2, NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days', TRUE)
ON CONFLICT (code) DO NOTHING;

COMMIT;
