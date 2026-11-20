CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. REFERRALS & REFERRAL REWARDS
CREATE TABLE IF NOT EXISTS referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(32) UNIQUE NOT NULL,
    times_used INTEGER NOT NULL DEFAULT 0,
    max_uses INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referral_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_code_id UUID NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
    referrer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referee_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referee_device_id VARCHAR(128),
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    referrer_reward_inr DECIMAL(10,2) NOT NULL DEFAULT 50.00,
    referee_discount_inr DECIMAL(10,2) NOT NULL DEFAULT 50.00,
    reward_granted_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_ref_status CHECK (status IN ('PENDING', 'REWARDED', 'REJECTED_ABUSE')),
    UNIQUE (referee_user_id)
);

CREATE INDEX IF NOT EXISTS idx_ref_codes_user ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_ref_redemptions_referrer ON referral_redemptions(referrer_user_id);

-- 2. DPDP USER CONSENTS & DELETION REQUESTS
CREATE TABLE IF NOT EXISTS dpdp_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_purpose VARCHAR(64) NOT NULL,
    is_granted BOOLEAN NOT NULL DEFAULT TRUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    policy_version VARCHAR(32) NOT NULL DEFAULT 'v1.0',
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dpdp_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    reason TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scheduled_purge_at TIMESTAMPTZ NOT NULL,
    executed_at TIMESTAMPTZ,
    CONSTRAINT chk_dpdp_del_status CHECK (status IN ('PENDING', 'CANCELLED', 'EXECUTED'))
);

-- 3. SCHEDULED CLOUD TASKS
CREATE TABLE IF NOT EXISTS scheduled_cloud_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_name VARCHAR(255) UNIQUE NOT NULL,
    target_type VARCHAR(64) NOT NULL,
    target_id UUID NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    executed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. OUT-OF-STOCK SUBSTITUTION REQUESTS
CREATE TABLE IF NOT EXISTS order_item_substitutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_order_id UUID NOT NULL,
    order_item_id UUID NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING_CUSTOMER_APPROVAL',
    original_item_name VARCHAR(255) NOT NULL,
    original_price_inr DECIMAL(10,2) NOT NULL,
    substituted_item_id UUID,
    substituted_item_name VARCHAR(255),
    substituted_price_inr DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    action_type VARCHAR(32) NOT NULL DEFAULT 'SUBSTITUTE',
    expires_at TIMESTAMPTZ NOT NULL,
    customer_response VARCHAR(32),
    resolved_at TIMESTAMPTZ,
    difference_refund_inr DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_subst_status CHECK (status IN ('PENDING_CUSTOMER_APPROVAL', 'APPROVED', 'REJECTED', 'TIMED_OUT'))
);
