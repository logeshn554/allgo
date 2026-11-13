-- ============================================================================
-- ALLGO DATABASE MIGRATION 010: PHASE 8 MOBILITY SERVICES & HIRE DRIVER
-- ADDITIVE MIGRATION FOR BIKE TAXI, AUTO, CAB, AND DESIGNATED DRIVER SERVICES
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ADDITIVE COLUMNS TO CANONICAL `rides` TABLE
-- ============================================================================
ALTER TABLE rides ADD COLUMN IF NOT EXISTS service_type VARCHAR(32) NOT NULL DEFAULT 'CAB';
ALTER TABLE rides ADD COLUMN IF NOT EXISTS vehicle_category VARCHAR(32);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS pickup_contact_name VARCHAR(100);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS pickup_contact_phone VARCHAR(20);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS drop_contact_name VARCHAR(100);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS drop_contact_phone VARCHAR(20);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS passenger_count INTEGER NOT NULL DEFAULT 1;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS special_instructions TEXT;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS fare_quote_snapshot JSONB;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS final_fare_snapshot JSONB;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS pricing_rule_version VARCHAR(50);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS otp_hash VARCHAR(128);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS otp_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS scheduled_pickup_time TIMESTAMPTZ;

-- Backfill vehicle_category from legacy ride_type if not already set
UPDATE rides 
SET vehicle_category = ride_type 
WHERE vehicle_category IS NULL AND ride_type IS NOT NULL;

-- Backfill service_type based on vehicle_category/ride_type
UPDATE rides 
SET service_type = CASE
    WHEN ride_type = 'BIKE' THEN 'BIKE_TAXI'
    WHEN ride_type = 'AUTO' THEN 'AUTO_RICKSHAW'
    WHEN ride_type IN ('CAB_ECONOMY', 'CAB_PREMIUM') THEN 'CAB'
    ELSE 'CAB'
END 
WHERE service_type = 'CAB' AND ride_type IS NOT NULL;

-- Widen monetary columns to NUMERIC(12,2) for decimal safety
ALTER TABLE rides ALTER COLUMN total_fare_inr TYPE NUMERIC(12,2);
ALTER TABLE rides ALTER COLUMN fare_base_inr TYPE NUMERIC(12,2);
ALTER TABLE rides ALTER COLUMN fare_distance_inr TYPE NUMERIC(12,2);
ALTER TABLE rides ALTER COLUMN fare_time_inr TYPE NUMERIC(12,2);
ALTER TABLE rides ALTER COLUMN platform_fee_inr TYPE NUMERIC(12,2);
ALTER TABLE rides ALTER COLUMN tax_total_inr TYPE NUMERIC(12,2);
ALTER TABLE rides ALTER COLUMN discount_inr TYPE NUMERIC(12,2);
ALTER TABLE rides ALTER COLUMN partner_payout_inr TYPE NUMERIC(12,2);

-- Update chk_ride_status check constraint to support all 15 Phase 8 states
-- Retains legacy states to guarantee zero regression on existing records
ALTER TABLE rides DROP CONSTRAINT IF EXISTS chk_ride_status;
ALTER TABLE rides ADD CONSTRAINT chk_ride_status CHECK (
    status IN (
        'RIDE_REQUESTED',
        'SEARCHING_FOR_DRIVER',
        'DRIVER_ASSIGNED',
        'DRIVER_ACCEPTED',
        'DRIVER_REJECTED',
        'DRIVER_ARRIVING',
        'DRIVER_ARRIVED',
        'TRIP_STARTED',
        'TRIP_IN_PROGRESS',
        'TRIP_COMPLETED',
        'RIDE_CANCELLED',
        'DRIVER_CANCELLED',
        'CUSTOMER_CANCELLED',
        'RIDE_EXPIRED',
        'DISPUTED',
        -- Backward compatibility statuses from 001
        'REQUESTED',
        'OFFERED',
        'ACCEPTED',
        'ARRIVING',
        'ARRIVED',
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED'
    )
);

-- Constraint for service_type
ALTER TABLE rides DROP CONSTRAINT IF EXISTS chk_rides_service_type;
ALTER TABLE rides ADD CONSTRAINT chk_rides_service_type CHECK (
    service_type IN ('BIKE_TAXI', 'AUTO_RICKSHAW', 'CAB', 'HIRE_DRIVER', 'DAILY_RIDE', 'RENTAL', 'OUTSTATION')
);

-- Performance & Lookup Indexes for `rides`
CREATE INDEX IF NOT EXISTS idx_rides_service_type ON rides(service_type);
CREATE INDEX IF NOT EXISTS idx_rides_vehicle_category ON rides(vehicle_category);
CREATE INDEX IF NOT EXISTS idx_rides_payment_ref ON rides(payment_reference) WHERE payment_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rides_scheduled_pickup ON rides(scheduled_pickup_time) WHERE scheduled_pickup_time IS NOT NULL;


-- ============================================================================
-- 2. ADDITIVE COLUMNS TO CANONICAL `hire_driver_bookings` TABLE
-- ============================================================================
ALTER TABLE hire_driver_bookings ADD COLUMN IF NOT EXISTS drop_address TEXT;
ALTER TABLE hire_driver_bookings ADD COLUMN IF NOT EXISTS drop_location geometry(Point, 4326);
ALTER TABLE hire_driver_bookings ADD COLUMN IF NOT EXISTS customer_vehicle_registration VARCHAR(32);
ALTER TABLE hire_driver_bookings ADD COLUMN IF NOT EXISTS customer_vehicle_make_model VARCHAR(100);
ALTER TABLE hire_driver_bookings ADD COLUMN IF NOT EXISTS customer_vehicle_fuel_type VARCHAR(32);
ALTER TABLE hire_driver_bookings ADD COLUMN IF NOT EXISTS customer_vehicle_transmission VARCHAR(32);
ALTER TABLE hire_driver_bookings ADD COLUMN IF NOT EXISTS pricing_model VARCHAR(32) NOT NULL DEFAULT 'HOURLY';
ALTER TABLE hire_driver_bookings ADD COLUMN IF NOT EXISTS fare_quote_snapshot JSONB;
ALTER TABLE hire_driver_bookings ADD COLUMN IF NOT EXISTS final_fare_snapshot JSONB;
ALTER TABLE hire_driver_bookings ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100);
ALTER TABLE hire_driver_bookings ADD COLUMN IF NOT EXISTS start_otp_hash VARCHAR(128);
ALTER TABLE hire_driver_bookings ADD COLUMN IF NOT EXISTS end_otp_hash VARCHAR(128);
ALTER TABLE hire_driver_bookings ADD COLUMN IF NOT EXISTS otp_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE hire_driver_bookings ADD COLUMN IF NOT EXISTS start_otp_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE hire_driver_bookings ADD COLUMN IF NOT EXISTS end_otp_attempts INTEGER NOT NULL DEFAULT 0;

-- Backfill vehicle specs from legacy fields if present
UPDATE hire_driver_bookings 
SET customer_vehicle_make_model = vehicle_model 
WHERE customer_vehicle_make_model IS NULL AND vehicle_model IS NOT NULL;

UPDATE hire_driver_bookings 
SET customer_vehicle_transmission = vehicle_transmission 
WHERE customer_vehicle_transmission IS NULL AND vehicle_transmission IS NOT NULL;

-- Widen monetary columns to NUMERIC(12,2) for decimal safety
ALTER TABLE hire_driver_bookings ALTER COLUMN total_amount_inr TYPE NUMERIC(12,2);
ALTER TABLE hire_driver_bookings ALTER COLUMN base_fee_inr TYPE NUMERIC(12,2);
ALTER TABLE hire_driver_bookings ALTER COLUMN extra_hours_fee_inr TYPE NUMERIC(12,2);
ALTER TABLE hire_driver_bookings ALTER COLUMN night_allowance_inr TYPE NUMERIC(12,2);
ALTER TABLE hire_driver_bookings ALTER COLUMN platform_fee_inr TYPE NUMERIC(12,2);
ALTER TABLE hire_driver_bookings ALTER COLUMN tax_total_inr TYPE NUMERIC(12,2);
ALTER TABLE hire_driver_bookings ALTER COLUMN partner_payout_inr TYPE NUMERIC(12,2);

-- Update chk_hire_driver_status check constraint to support Phase 8 states
ALTER TABLE hire_driver_bookings DROP CONSTRAINT IF EXISTS chk_hire_driver_status;
ALTER TABLE hire_driver_bookings ADD CONSTRAINT chk_hire_driver_status CHECK (
    status IN (
        'BOOKED',
        'SEARCHING_FOR_DRIVER',
        'DRIVER_ASSIGNED',
        'DRIVER_ACCEPTED',
        'DRIVER_REJECTED',
        'DRIVER_ARRIVING',
        'DRIVER_ARRIVED',
        'DUTY_STARTED',
        'DUTY_IN_PROGRESS',
        'DUTY_COMPLETED',
        'BOOKING_CANCELLED',
        'DRIVER_CANCELLED',
        'CUSTOMER_CANCELLED',
        'BOOKING_EXPIRED',
        'DISPUTED',
        -- Legacy statuses from 001
        'ASSIGNED',
        'ARRIVED',
        'STARTED',
        'COMPLETED',
        'CANCELLED'
    )
);

-- Constraint for pricing_model
ALTER TABLE hire_driver_bookings DROP CONSTRAINT IF EXISTS chk_hire_driver_pricing_model;
ALTER TABLE hire_driver_bookings ADD CONSTRAINT chk_hire_driver_pricing_model CHECK (
    pricing_model IN ('HOURLY', 'FIXED', 'PACKAGE', 'DISTANCE', 'DISTANCE_BASED')
);

-- Performance & Lookup Indexes for `hire_driver_bookings`
CREATE INDEX IF NOT EXISTS idx_hire_pricing_model ON hire_driver_bookings(pricing_model);
CREATE INDEX IF NOT EXISTS idx_hire_driver_drop_gist ON hire_driver_bookings USING GIST(drop_location);
CREATE INDEX IF NOT EXISTS idx_hire_cust_veh ON hire_driver_bookings(customer_vehicle_registration);
CREATE INDEX IF NOT EXISTS idx_hire_payment_ref ON hire_driver_bookings(payment_reference) WHERE payment_reference IS NOT NULL;


-- ============================================================================
-- 3. NEW TABLE: `ride_assignments`
-- ============================================================================
CREATE TABLE IF NOT EXISTS ride_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES partners(id) ON DELETE CASCADE,
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
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_ride_assignment_status CHECK (
        status IN ('OFFERED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED')
    )
);

-- Unique active offer index: guarantees at most one active OFFERED assignment per ride
CREATE UNIQUE INDEX IF NOT EXISTS uq_ride_assignments_active_offer
ON ride_assignments (ride_id)
WHERE status = 'OFFERED';

-- Query indexes
CREATE INDEX IF NOT EXISTS idx_ride_assignments_ride ON ride_assignments(ride_id, attempt_number);
CREATE INDEX IF NOT EXISTS idx_ride_assignments_driver ON ride_assignments(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_ride_assignments_partner ON ride_assignments(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_ride_assignments_expires ON ride_assignments(offer_expires_at) WHERE status = 'OFFERED';


-- ============================================================================
-- 4. NEW TABLE: `ride_events` (IMMUTABLE AUDIT TRAIL)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ride_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL,
    actor_role VARCHAR(32) NOT NULL DEFAULT 'SYSTEM',
    actor_type VARCHAR(32) DEFAULT 'SYSTEM',
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    from_status VARCHAR(64),
    to_status VARCHAR(64),
    location geometry(Point, 4326),
    reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ride_events_ride ON ride_events(ride_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ride_events_type ON ride_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ride_events_actor ON ride_events(actor_id);

-- Immutability Trigger for `ride_events`
CREATE OR REPLACE FUNCTION prevent_ride_events_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'ride_events is append-only and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_ride_events_mutation ON ride_events;
CREATE TRIGGER trg_prevent_ride_events_mutation
BEFORE UPDATE OR DELETE ON ride_events
FOR EACH ROW EXECUTE FUNCTION prevent_ride_events_mutation();


-- ============================================================================
-- 5. NEW TABLE: `hire_driver_assignments`
-- ============================================================================
CREATE TABLE IF NOT EXISTS hire_driver_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES hire_driver_bookings(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES partners(id) ON DELETE CASCADE,
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
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_hire_driver_assignment_status CHECK (
        status IN ('OFFERED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED')
    )
);

-- Unique active offer index: guarantees at most one active OFFERED assignment per hire driver booking
CREATE UNIQUE INDEX IF NOT EXISTS uq_hire_driver_assignments_active_offer
ON hire_driver_assignments (booking_id)
WHERE status = 'OFFERED';

-- Query indexes
CREATE INDEX IF NOT EXISTS idx_hire_driver_assignments_booking ON hire_driver_assignments(booking_id, attempt_number);
CREATE INDEX IF NOT EXISTS idx_hire_driver_assignments_driver ON hire_driver_assignments(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_hire_driver_assignments_partner ON hire_driver_assignments(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_hire_driver_assignments_expires ON hire_driver_assignments(offer_expires_at) WHERE status = 'OFFERED';


-- ============================================================================
-- 6. NEW TABLE: `hire_driver_events` (IMMUTABLE AUDIT TRAIL)
-- ============================================================================
CREATE TABLE IF NOT EXISTS hire_driver_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES hire_driver_bookings(id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL,
    actor_role VARCHAR(32) NOT NULL DEFAULT 'SYSTEM',
    actor_type VARCHAR(32) DEFAULT 'SYSTEM',
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    from_status VARCHAR(64),
    to_status VARCHAR(64),
    location geometry(Point, 4326),
    reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hire_driver_events_booking ON hire_driver_events(booking_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_hire_driver_events_type ON hire_driver_events(event_type);
CREATE INDEX IF NOT EXISTS idx_hire_driver_events_actor ON hire_driver_events(actor_id);

-- Immutability Trigger for `hire_driver_events`
CREATE OR REPLACE FUNCTION prevent_hire_driver_events_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'hire_driver_events is append-only and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_hire_driver_events_mutation ON hire_driver_events;
CREATE TRIGGER trg_prevent_hire_driver_events_mutation
BEFORE UPDATE OR DELETE ON hire_driver_events
FOR EACH ROW EXECUTE FUNCTION prevent_hire_driver_events_mutation();

COMMIT;
