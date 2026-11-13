BEGIN;

-- =========================================================================
-- Phase 5 Migration: Multi-Vertical Mobility, Parcel Delivery, Hire-Driver &
-- Partner Continuity with Mutual Exclusion Safety
-- =========================================================================

-- 1. Regulatory State-by-State Feature Flags
CREATE TABLE IF NOT EXISTS mobility_feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_code VARCHAR(10) NOT NULL UNIQUE,
    state_name VARCHAR(100) NOT NULL,
    rides_enabled BOOLEAN NOT NULL DEFAULT false,
    hire_driver_enabled BOOLEAN NOT NULL DEFAULT false,
    bike_taxi_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Tamil Nadu (TN) default for development/pilot testing
INSERT INTO mobility_feature_flags (state_code, state_name, rides_enabled, hire_driver_enabled, bike_taxi_enabled)
VALUES ('TN', 'Tamil Nadu', true, true, true)
ON CONFLICT (state_code) DO NOTHING;

-- 2. Ride Fare Formulas Configuration
CREATE TABLE IF NOT EXISTS ride_fares_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_category VARCHAR(32) NOT NULL UNIQUE,
    base_fare_inr DECIMAL(10,2) NOT NULL,
    base_distance_km DECIMAL(6,2) NOT NULL DEFAULT 1.5,
    per_km_rate_inr DECIMAL(10,2) NOT NULL,
    per_minute_rate_inr DECIMAL(10,2) NOT NULL DEFAULT 1.50,
    minimum_fare_inr DECIMAL(10,2) NOT NULL,
    cancellation_fee_inr DECIMAL(10,2) NOT NULL DEFAULT 20.00,
    platform_fee_inr DECIMAL(10,2) NOT NULL DEFAULT 5.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_vehicle_cat CHECK (vehicle_category IN ('BIKE', 'AUTO', 'CAB_ECONOMY', 'CAB_PREMIUM'))
);

INSERT INTO ride_fares_config (vehicle_category, base_fare_inr, base_distance_km, per_km_rate_inr, per_minute_rate_inr, minimum_fare_inr, cancellation_fee_inr, platform_fee_inr)
VALUES
    ('BIKE', 25.00, 1.5, 10.00, 1.00, 30.00, 15.00, 3.00),
    ('AUTO', 35.00, 1.5, 15.00, 1.50, 45.00, 20.00, 5.00),
    ('CAB_ECONOMY', 60.00, 2.0, 18.00, 2.00, 90.00, 35.00, 10.00),
    ('CAB_PREMIUM', 100.00, 2.0, 24.00, 2.50, 150.00, 50.00, 15.00)
ON CONFLICT (vehicle_category) DO NOTHING;

-- 3. Parcel Delivery Fares Configuration
CREATE TABLE IF NOT EXISTS parcel_fares_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_category VARCHAR(32) NOT NULL UNIQUE,
    base_fare_inr DECIMAL(10,2) NOT NULL DEFAULT 40.00,
    base_distance_km DECIMAL(6,2) NOT NULL DEFAULT 2.0,
    per_km_rate_inr DECIMAL(10,2) NOT NULL DEFAULT 12.00,
    per_kg_rate_inr DECIMAL(10,2) NOT NULL DEFAULT 5.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_parcel_cat CHECK (package_category IN ('DOCUMENTS', 'FOOD_BOX', 'ELECTRONICS', 'CLOTHES_ITEMS', 'GENERAL'))
);

INSERT INTO parcel_fares_config (package_category, base_fare_inr, base_distance_km, per_km_rate_inr, per_kg_rate_inr)
VALUES
    ('DOCUMENTS', 35.00, 2.0, 10.00, 0.00),
    ('FOOD_BOX', 40.00, 2.0, 12.00, 4.00),
    ('ELECTRONICS', 50.00, 2.0, 14.00, 6.00),
    ('CLOTHES_ITEMS', 40.00, 2.0, 12.00, 4.00),
    ('GENERAL', 40.00, 2.0, 12.00, 5.00)
ON CONFLICT (package_category) DO NOTHING;

-- 4. Additive columns to canonical rides table
ALTER TABLE rides ADD COLUMN IF NOT EXISTS sos_triggered_at TIMESTAMPTZ;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS sos_status VARCHAR(32);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS cancelled_by_user_id UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_rides_customer ON rides(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rides_partner ON rides(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);

-- 5. Additive columns to canonical parcels table
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS package_description TEXT;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS is_fragile BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_parcels_sender ON parcels(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parcels_partner ON parcels(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_parcels_status ON parcels(status);

-- 6. Additive columns to canonical hire_driver_bookings table
ALTER TABLE hire_driver_bookings ADD COLUMN IF NOT EXISTS start_odometer_km INTEGER;
ALTER TABLE hire_driver_bookings ADD COLUMN IF NOT EXISTS end_odometer_km INTEGER;
ALTER TABLE hire_driver_bookings ADD COLUMN IF NOT EXISTS duty_started_at TIMESTAMPTZ;
ALTER TABLE hire_driver_bookings ADD COLUMN IF NOT EXISTS duty_completed_at TIMESTAMPTZ;
ALTER TABLE hire_driver_bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_hire_customer ON hire_driver_bookings(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hire_partner ON hire_driver_bookings(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_hire_status ON hire_driver_bookings(status);

-- 7. Emergency / SOS Alerts Table
CREATE TABLE IF NOT EXISTS mobility_sos_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id UUID REFERENCES rides(id) ON DELETE CASCADE,
    triggered_by_user_id UUID NOT NULL REFERENCES users(id),
    trigger_role VARCHAR(32) NOT NULL,
    location geometry(Point, 4326),
    status VARCHAR(32) NOT NULL DEFAULT 'TRIGGERED',
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    CONSTRAINT chk_sos_status CHECK (status IN ('TRIGGERED', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_ALARM'))
);

CREATE INDEX IF NOT EXISTS idx_sos_ride ON mobility_sos_events(ride_id);
CREATE INDEX IF NOT EXISTS idx_sos_status ON mobility_sos_events(status);

COMMIT;
