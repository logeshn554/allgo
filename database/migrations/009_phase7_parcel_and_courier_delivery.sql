-- ============================================================================
-- ALLGO DATABASE MIGRATION 009: PHASE 7 PARCEL & COURIER BOOKING, DISPATCH,
-- TRACKING, DELIVERY, DUAL OTP SECURITY & SERVICE CONFIGURATION
-- ============================================================================

BEGIN;

-- 1. PARCEL SERVICE CONFIGURATIONS (Service-level options: Standard, Express, Same Day)
CREATE TABLE IF NOT EXISTS parcel_service_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_type VARCHAR(32) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    base_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    estimated_delivery_hours DECIMAL(4,1) NOT NULL DEFAULT 24.0,
    max_distance_km DECIMAL(6,2) NOT NULL DEFAULT 50.00,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO parcel_service_configs (service_type, display_name, base_multiplier, estimated_delivery_hours, max_distance_km, is_enabled, description)
VALUES
    ('STANDARD', 'Standard Delivery', 1.00, 24.0, 50.00, TRUE, 'Affordable intra-city parcel courier handover within standard hours'),
    ('EXPRESS', 'Express Priority', 1.30, 2.0, 25.00, TRUE, 'High-priority direct courier handover with expedited dispatch'),
    ('SAME_DAY', 'Same Day Guaranteed', 1.60, 6.0, 40.00, TRUE, 'Guaranteed same-day intra-city delivery')
ON CONFLICT (service_type) DO UPDATE SET base_multiplier = EXCLUDED.base_multiplier;

-- 2. PARCEL PACKAGE RESTRICTIONS CONFIGURATION (Configurable permitted and prohibited goods policy)
CREATE TABLE IF NOT EXISTS parcel_restrictions_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name VARCHAR(64) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    is_permitted BOOLEAN NOT NULL DEFAULT TRUE,
    requires_review BOOLEAN NOT NULL DEFAULT FALSE,
    max_weight_kg DECIMAL(6,2) NOT NULL DEFAULT 20.00,
    max_length_cm DECIMAL(6,2) NOT NULL DEFAULT 100.00,
    max_width_cm DECIMAL(6,2) NOT NULL DEFAULT 100.00,
    max_height_cm DECIMAL(6,2) NOT NULL DEFAULT 100.00,
    max_declared_value_inr DECIMAL(10,2) NOT NULL DEFAULT 50000.00,
    description TEXT,
    prohibited_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO parcel_restrictions_config (category_name, display_name, is_permitted, requires_review, max_weight_kg, max_length_cm, max_width_cm, max_height_cm, max_declared_value_inr, description, prohibited_reason)
VALUES
    ('DOCUMENTS', 'Documents & Envelopes', TRUE, FALSE, 5.00, 35.00, 25.00, 5.00, 10000.00, 'Legal papers, contracts, passports, books and envelopes', NULL),
    ('CLOTHES_ITEMS', 'Clothes & Apparel', TRUE, FALSE, 15.00, 60.00, 50.00, 40.00, 25000.00, 'Apparel, garments, shoes, fabrics and textiles', NULL),
    ('FOOD_BOX', 'Packaged Food & Snacks', TRUE, FALSE, 10.00, 40.00, 40.00, 30.00, 15000.00, 'Packaged non-perishable foods and sweet boxes', NULL),
    ('ELECTRONICS', 'Electronics & Gadgets', TRUE, FALSE, 12.00, 50.00, 40.00, 30.00, 50000.00, 'Smartphones, laptops, accessories and household electronics', NULL),
    ('MEDICINE', 'Prescription Medicines & Health', TRUE, TRUE, 5.00, 30.00, 20.00, 15.00, 10000.00, 'Prescribed drugs and clinical test supplies requiring compliance review', NULL),
    ('GENERAL', 'General Everyday Items', TRUE, FALSE, 20.00, 80.00, 60.00, 50.00, 30000.00, 'Non-fragile miscellaneous daily parcel items', NULL),
    ('HAZARDOUS_CHEMICALS', 'Hazardous & Chemical Goods', FALSE, FALSE, 0.00, 0.00, 0.00, 0.00, 0.00, 'Acids, flammable chemicals, gases and corrosives', 'Hazardous materials are strictly prohibited under carrier transportation safety regulations'),
    ('EXPLOSIVES', 'Explosives & Flammables', FALSE, FALSE, 0.00, 0.00, 0.00, 0.00, 0.00, 'Fireworks, ammunition and combustible materials', 'Explosives and flammables are prohibited by regulatory statute'),
    ('CONTRABAND', 'Contraband & Illegal Substances', FALSE, FALSE, 0.00, 0.00, 0.00, 0.00, 0.00, 'Narcotics, uninspected alcohol, and unauthorized items', 'Illegal contraband and controlled substances are strictly prohibited by law')
ON CONFLICT (category_name) DO NOTHING;

-- 2b. EXPAND PARCEL FARES CONFIGURATION TO COVER PERMITTED CATEGORIES (MEDICINE)
ALTER TABLE parcel_fares_config DROP CONSTRAINT IF EXISTS chk_parcel_cat;
ALTER TABLE parcel_fares_config ADD CONSTRAINT chk_parcel_cat CHECK (
    package_category IN ('DOCUMENTS', 'FOOD_BOX', 'ELECTRONICS', 'CLOTHES_ITEMS', 'GENERAL', 'MEDICINE')
);

INSERT INTO parcel_fares_config (package_category, base_fare_inr, base_distance_km, per_km_rate_inr, per_kg_rate_inr)
VALUES
    ('MEDICINE', 50.00, 2.0, 15.00, 5.00)
ON CONFLICT (package_category) DO NOTHING;

-- 3. ADDITIVE COLUMNS TO CANONICAL PARCELS TABLE
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS package_quantity INTEGER NOT NULL DEFAULT 1;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS length_cm DECIMAL(6,2) DEFAULT 20.00;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS width_cm DECIMAL(6,2) DEFAULT 15.00;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS height_cm DECIMAL(6,2) DEFAULT 10.00;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS declared_value_inr DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS handling_instructions TEXT;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS service_type VARCHAR(32) NOT NULL DEFAULT 'STANDARD';
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS requested_pickup_time TIMESTAMPTZ;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS price_snapshot JSONB;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100);
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS payment_method VARCHAR(32) DEFAULT 'ONLINE';
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS pickup_otp_hash VARCHAR(128);
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS pickup_otp_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS delivery_otp_hash VARCHAR(128);
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS delivery_otp_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS delivery_proof_photo_url TEXT;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS failed_attempt_reason TEXT;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS return_reason TEXT;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS return_assigned_partner_id UUID REFERENCES partners(id) ON DELETE SET NULL;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS return_initiated_at TIMESTAMPTZ;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS return_completed_at TIMESTAMPTZ;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours');

-- Backfill customer_id from sender_id for existing records
UPDATE parcels SET customer_id = sender_id WHERE customer_id IS NULL;

-- Expand parcel status constraint to comprehensively support all Phase 7 lifecycle states
ALTER TABLE parcels DROP CONSTRAINT IF EXISTS chk_parcel_status;
ALTER TABLE parcels ADD CONSTRAINT chk_parcel_status CHECK (
    status IN (
        'CREATED',
        'BOOKED',
        'PAYMENT_PENDING',
        'PAYMENT_CONFIRMED',
        'SEARCHING_FOR_PARTNER',
        'PARTNER_ASSIGNED',
        'PARTNER_ACCEPTED',
        'OFFERED',
        'ACCEPTED',
        'ARRIVING_AT_PICKUP',
        'PICKED_UP',
        'IN_TRANSIT',
        'ARRIVING_AT_DESTINATION',
        'DELIVERY_ATTEMPTED',
        'DELIVERED',
        'DELIVERY_FAILED',
        'RETURN_INITIATED',
        'RETURN_IN_PROGRESS',
        'RETURN_IN_TRANSIT',
        'RETURNED',
        'RETURNED_TO_SENDER',
        'CANCELLED',
        'DISPUTED'
    )
);

CREATE INDEX IF NOT EXISTS idx_parcels_customer_id ON parcels(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parcels_service_type ON parcels(service_type);

-- 4. PARCEL DISPATCH ASSIGNMENTS & OFFER HISTORY TABLE
CREATE TABLE IF NOT EXISTS parcel_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(32) NOT NULL DEFAULT 'OFFERED',
    offer_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    offer_expires_at TIMESTAMPTZ NOT NULL,
    responded_at TIMESTAMPTZ,
    rejection_reason TEXT,
    reassignment_reason TEXT,
    distance_to_pickup_meters NUMERIC(10,2),
    estimated_pickup_eta_seconds INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_parcel_assign_status CHECK (
        status IN ('OFFERED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'REASSIGNED')
    )
);

CREATE INDEX IF NOT EXISTS idx_parcel_assign_parcel ON parcel_assignments(parcel_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_parcel_assign_partner ON parcel_assignments(partner_id, status);

-- 5. IMMUTABLE PARCEL DELIVERY EVENTS AUDIT TRAIL TABLE
CREATE TABLE IF NOT EXISTS parcel_delivery_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL,
    from_status VARCHAR(64),
    to_status VARCHAR(64),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_role VARCHAR(32) NOT NULL DEFAULT 'SYSTEM',
    location geometry(Point, 4326),
    reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parcel_events_parcel ON parcel_delivery_events(parcel_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_parcel_events_type ON parcel_delivery_events(event_type);

-- Trigger to guarantee append-only immutability on parcel_delivery_events
CREATE OR REPLACE FUNCTION prevent_parcel_events_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'parcel_delivery_events is append-only and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_parcel_events_mutation ON parcel_delivery_events;
CREATE TRIGGER trg_prevent_parcel_events_mutation
BEFORE UPDATE OR DELETE ON parcel_delivery_events
FOR EACH ROW EXECUTE FUNCTION prevent_parcel_events_mutation();

-- 6. PARCEL POLICY & RESTRICTIONS AUDIT LOGS
CREATE TABLE IF NOT EXISTS parcel_policy_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    category VARCHAR(64) NOT NULL,
    decision VARCHAR(32) NOT NULL, -- 'ALLOWED', 'REJECTED', 'FLAGGED_FOR_REVIEW', 'REQUIRES_REVIEW'
    weight_kg DECIMAL(6,2),
    dimensions JSONB,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_policy_decision CHECK (decision IN ('ALLOWED', 'REJECTED', 'FLAGGED_FOR_REVIEW', 'REQUIRES_REVIEW'))
);

CREATE INDEX IF NOT EXISTS idx_parcel_policy_audit ON parcel_policy_audit_logs(category, created_at DESC);

COMMIT;
