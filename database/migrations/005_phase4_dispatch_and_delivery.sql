-- ALLGO PHASE 4: DISPATCH ENGINE, DELIVERY PARTNER ASSIGNMENT, LIVE GPS TRACKING & DELIVERY OPERATIONS
-- File: database/migrations/005_phase4_dispatch_and_delivery.sql

BEGIN;

-- Enable PostGIS if not already active
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Delivery Jobs Core Table
CREATE TABLE IF NOT EXISTS delivery_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_number VARCHAR(50) UNIQUE NOT NULL,
    vertical_type VARCHAR(32) NOT NULL DEFAULT 'FOOD',
    status VARCHAR(32) NOT NULL DEFAULT 'CREATED',
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    pickup_location geometry(Point, 4326) NOT NULL,
    pickup_address TEXT NOT NULL,
    pickup_contact_phone VARCHAR(20) NOT NULL,
    dropoff_location geometry(Point, 4326) NOT NULL,
    dropoff_address TEXT NOT NULL,
    dropoff_contact_phone VARCHAR(20) NOT NULL,
    customer_name VARCHAR(100),
    items_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
    estimated_prep_time_minutes INTEGER NOT NULL DEFAULT 15,
    handover_otp VARCHAR(6) NOT NULL,
    handover_verified_at TIMESTAMPTZ,
    delivery_pin VARCHAR(6) NOT NULL,
    delivery_verified_at TIMESTAMPTZ,
    assigned_partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
    courier_fee_inr DECIMAL(10,2) NOT NULL DEFAULT 40.00,
    surge_fee_inr DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    distance_meters NUMERIC(10,2) DEFAULT 0.00,
    estimated_duration_seconds INTEGER DEFAULT 900,
    cancellation_reason TEXT,
    cancelled_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    cancelled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_job_status CHECK (
        status IN (
            'CREATED',
            'MERCHANT_ACCEPTED',
            'PREPARING',
            'READY_FOR_PICKUP',
            'DISPATCH_PENDING',
            'ASSIGNMENT_PENDING',
            'PARTNER_ASSIGNED',
            'PARTNER_ARRIVING',
            'PARTNER_ARRIVED',
            'PICKED_UP',
            'IN_TRANSIT',
            'ARRIVED_AT_DESTINATION',
            'DELIVERED',
            'CANCELLED',
            'FAILED',
            'RETURN_REQUIRED',
            'RETURN_IN_PROGRESS',
            'RETURNED'
        )
    ),
    CONSTRAINT chk_job_vertical CHECK (vertical_type IN ('FOOD', 'GROCERY'))
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON delivery_jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_outlet ON delivery_jobs(outlet_id);
CREATE INDEX IF NOT EXISTS idx_jobs_partner ON delivery_jobs(assigned_partner_id);
CREATE INDEX IF NOT EXISTS idx_jobs_customer ON delivery_jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON delivery_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_pickup_gix ON delivery_jobs USING GIST(pickup_location);
CREATE INDEX IF NOT EXISTS idx_jobs_dropoff_gix ON delivery_jobs USING GIST(dropoff_location);

-- 2. Delivery Status Events History
CREATE TABLE IF NOT EXISTS delivery_status_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_job_id UUID NOT NULL REFERENCES delivery_jobs(id) ON DELETE CASCADE,
    from_status VARCHAR(32),
    to_status VARCHAR(32) NOT NULL,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_role VARCHAR(32) NOT NULL DEFAULT 'SYSTEM',
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_events_job ON delivery_status_events(delivery_job_id, created_at ASC);

-- 3. Partner Availability Sessions & Live State
CREATE TABLE IF NOT EXISTS partner_availability_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'ONLINE',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_known_location geometry(Point, 4326),
    battery_percentage INTEGER DEFAULT 100,
    app_version VARCHAR(32) DEFAULT '1.0.0',
    CONSTRAINT chk_partner_session_status CHECK (status IN ('ONLINE', 'BUSY', 'OFFLINE'))
);

CREATE INDEX IF NOT EXISTS idx_partner_sessions_partner ON partner_availability_sessions(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_sessions_status ON partner_availability_sessions(status);
CREATE INDEX IF NOT EXISTS idx_partner_sessions_loc_gix ON partner_availability_sessions USING GIST(last_known_location);

-- 4. Partner GPS Location History
CREATE TABLE IF NOT EXISTS partner_location_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    active_job_id UUID REFERENCES delivery_jobs(id) ON DELETE SET NULL,
    location geometry(Point, 4326) NOT NULL,
    heading NUMERIC(5,2),
    speed_meters_per_second NUMERIC(6,2),
    accuracy_meters NUMERIC(6,2),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE partner_location_history ADD COLUMN IF NOT EXISTS heading NUMERIC(5,2);
ALTER TABLE partner_location_history ADD COLUMN IF NOT EXISTS speed_meters_per_second NUMERIC(6,2);
ALTER TABLE partner_location_history ADD COLUMN IF NOT EXISTS accuracy_meters NUMERIC(6,2);

CREATE INDEX IF NOT EXISTS idx_partner_loc_hist_partner ON partner_location_history(partner_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_loc_hist_job ON partner_location_history(active_job_id);
CREATE INDEX IF NOT EXISTS idx_partner_loc_hist_gix ON partner_location_history USING GIST(location);

-- 5. Dispatch Attempts & Job Offers
CREATE TABLE IF NOT EXISTS dispatch_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_job_id UUID NOT NULL REFERENCES delivery_jobs(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'OFFERED',
    offer_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    offer_expires_at TIMESTAMPTZ NOT NULL,
    responded_at TIMESTAMPTZ,
    rejection_reason TEXT,
    distance_to_pickup_meters NUMERIC(10,2),
    estimated_pickup_eta_seconds INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_attempt_status CHECK (status IN ('OFFERED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'))
);

CREATE INDEX IF NOT EXISTS idx_dispatch_attempts_job ON dispatch_attempts(delivery_job_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_attempts_partner ON dispatch_attempts(partner_id, status);

-- 6. Delivery Proofs (PIN / Handover verification)
CREATE TABLE IF NOT EXISTS delivery_proofs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_job_id UUID NOT NULL REFERENCES delivery_jobs(id) ON DELETE CASCADE,
    proof_type VARCHAR(32) NOT NULL DEFAULT 'PIN',
    verified_code VARCHAR(10),
    photo_storage_key VARCHAR(255),
    verification_location geometry(Point, 4326),
    collected_by_partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_proof_type CHECK (proof_type IN ('PIN', 'OTP', 'SIGNATURE', 'PHOTO'))
);

CREATE INDEX IF NOT EXISTS idx_delivery_proofs_job ON delivery_proofs(delivery_job_id);

-- 7. Delivery Cancellation Records
CREATE TABLE IF NOT EXISTS delivery_cancellation_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_job_id UUID NOT NULL REFERENCES delivery_jobs(id) ON DELETE CASCADE,
    cancelled_by_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    cancelled_by_role VARCHAR(32) NOT NULL,
    reason_code VARCHAR(50) NOT NULL,
    reason_details TEXT,
    job_status_at_cancellation VARCHAR(32) NOT NULL,
    compensation_amount_inr DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cancellations_job ON delivery_cancellation_records(delivery_job_id);

-- 8. Delivery Exception Records
CREATE TABLE IF NOT EXISTS delivery_exception_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_job_id UUID NOT NULL REFERENCES delivery_jobs(id) ON DELETE CASCADE,
    partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
    exception_type VARCHAR(50) NOT NULL,
    details TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    resolved_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    CONSTRAINT chk_exception_status CHECK (status IN ('OPEN', 'INVESTIGATING', 'RESOLVED', 'ESCALATED'))
);

CREATE INDEX IF NOT EXISTS idx_exceptions_job ON delivery_exception_records(delivery_job_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_status ON delivery_exception_records(status);

-- 9. Partner Earnings Ledger Entries
CREATE TABLE IF NOT EXISTS partner_earnings_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
    delivery_job_id UUID REFERENCES delivery_jobs(id) ON DELETE SET NULL,
    entry_type VARCHAR(32) NOT NULL DEFAULT 'DELIVERY_PAY',
    base_amount_inr DECIMAL(10,2) NOT NULL,
    distance_amount_inr DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    surge_amount_inr DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    incentive_amount_inr DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_earned_inr DECIMAL(10,2) NOT NULL,
    distance_meters NUMERIC(10,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_earnings_type CHECK (
        entry_type IN (
            'DELIVERY_PAY',
            'DISTANCE_BONUS',
            'SURGE_PAY',
            'INCENTIVE',
            'CANCELLATION_COMPENSATION',
            'PENALTY'
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_earnings_partner ON partner_earnings_entries(partner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_earnings_job ON partner_earnings_entries(delivery_job_id);

-- 10. Dispatch Configurations
CREATE TABLE IF NOT EXISTS dispatch_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES zones(id) ON DELETE CASCADE,
    max_search_radius_meters INTEGER NOT NULL DEFAULT 5000,
    offer_timeout_seconds INTEGER NOT NULL DEFAULT 45,
    max_reassignment_attempts INTEGER NOT NULL DEFAULT 5,
    base_payout_inr DECIMAL(10,2) NOT NULL DEFAULT 35.00,
    payout_per_km_inr DECIMAL(10,2) NOT NULL DEFAULT 12.00,
    min_partner_battery_percentage INTEGER NOT NULL DEFAULT 15,
    location_freshness_seconds INTEGER NOT NULL DEFAULT 120,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default global dispatch configuration
INSERT INTO dispatch_configurations (
    id, max_search_radius_meters, offer_timeout_seconds, max_reassignment_attempts,
    base_payout_inr, payout_per_km_inr, min_partner_battery_percentage, location_freshness_seconds
) VALUES (
    '00000000-0000-0000-0000-000000000001', 5000, 45, 5, 35.00, 12.00, 15, 120
) ON CONFLICT (id) DO NOTHING;

COMMIT;
