-- ============================================================================
-- ALLGO DATABASE ROLLBACK 010: PHASE 8 MOBILITY SERVICES & HIRE DRIVER ROLLBACK
-- CLEANLY REVERSES MIGRATION 010 RESTORING SCHEMA TO MIGRATION 009 BASELINE
-- ============================================================================

BEGIN;

-- 1. DROP IMMUTABILITY TRIGGERS & FUNCTIONS
DROP TRIGGER IF EXISTS trg_prevent_hire_driver_events_mutation ON hire_driver_events;
DROP FUNCTION IF EXISTS prevent_hire_driver_events_mutation();

DROP TRIGGER IF EXISTS trg_prevent_ride_events_mutation ON ride_events;
DROP FUNCTION IF EXISTS prevent_ride_events_mutation();

-- 2. DROP PHASE 8 DEDICATED TABLES
DROP TABLE IF EXISTS hire_driver_events CASCADE;
DROP TABLE IF EXISTS hire_driver_assignments CASCADE;
DROP TABLE IF EXISTS ride_events CASCADE;
DROP TABLE IF EXISTS ride_assignments CASCADE;

-- 3. REVERT ADDITIVE COLUMNS & CONSTRAINTS ON `hire_driver_bookings`
DROP INDEX IF EXISTS idx_hire_pricing_model;
DROP INDEX IF EXISTS idx_hire_driver_drop_gist;
DROP INDEX IF EXISTS idx_hire_cust_veh;
DROP INDEX IF EXISTS idx_hire_payment_ref;

ALTER TABLE hire_driver_bookings DROP CONSTRAINT IF EXISTS chk_hire_driver_pricing_model;
ALTER TABLE hire_driver_bookings DROP CONSTRAINT IF EXISTS chk_hire_driver_status;
ALTER TABLE hire_driver_bookings ADD CONSTRAINT chk_hire_driver_status CHECK (
    status IN ('BOOKED', 'ASSIGNED', 'ARRIVED', 'STARTED', 'COMPLETED', 'CANCELLED')
);

ALTER TABLE hire_driver_bookings DROP COLUMN IF EXISTS end_otp_attempts;
ALTER TABLE hire_driver_bookings DROP COLUMN IF EXISTS start_otp_attempts;
ALTER TABLE hire_driver_bookings DROP COLUMN IF EXISTS otp_attempts;
ALTER TABLE hire_driver_bookings DROP COLUMN IF EXISTS end_otp_hash;
ALTER TABLE hire_driver_bookings DROP COLUMN IF EXISTS start_otp_hash;
ALTER TABLE hire_driver_bookings DROP COLUMN IF EXISTS payment_reference;
ALTER TABLE hire_driver_bookings DROP COLUMN IF EXISTS final_fare_snapshot;
ALTER TABLE hire_driver_bookings DROP COLUMN IF EXISTS fare_quote_snapshot;
ALTER TABLE hire_driver_bookings DROP COLUMN IF EXISTS pricing_model;
ALTER TABLE hire_driver_bookings DROP COLUMN IF EXISTS customer_vehicle_transmission;
ALTER TABLE hire_driver_bookings DROP COLUMN IF EXISTS customer_vehicle_fuel_type;
ALTER TABLE hire_driver_bookings DROP COLUMN IF EXISTS customer_vehicle_make_model;
ALTER TABLE hire_driver_bookings DROP COLUMN IF EXISTS customer_vehicle_registration;
ALTER TABLE hire_driver_bookings DROP COLUMN IF EXISTS drop_location;
ALTER TABLE hire_driver_bookings DROP COLUMN IF EXISTS drop_address;

-- Revert widened monetary columns on `hire_driver_bookings`
ALTER TABLE hire_driver_bookings ALTER COLUMN total_amount_inr TYPE NUMERIC(10,2);
ALTER TABLE hire_driver_bookings ALTER COLUMN base_fee_inr TYPE NUMERIC(10,2);
ALTER TABLE hire_driver_bookings ALTER COLUMN extra_hours_fee_inr TYPE NUMERIC(10,2);
ALTER TABLE hire_driver_bookings ALTER COLUMN night_allowance_inr TYPE NUMERIC(10,2);
ALTER TABLE hire_driver_bookings ALTER COLUMN platform_fee_inr TYPE NUMERIC(10,2);
ALTER TABLE hire_driver_bookings ALTER COLUMN tax_total_inr TYPE NUMERIC(10,2);
ALTER TABLE hire_driver_bookings ALTER COLUMN partner_payout_inr TYPE NUMERIC(10,2);

-- 4. REVERT ADDITIVE COLUMNS & CONSTRAINTS ON `rides`
DROP INDEX IF EXISTS idx_rides_service_type;
DROP INDEX IF EXISTS idx_rides_vehicle_category;
DROP INDEX IF EXISTS idx_rides_payment_ref;
DROP INDEX IF EXISTS idx_rides_scheduled_pickup;

ALTER TABLE rides DROP CONSTRAINT IF EXISTS chk_rides_service_type;
ALTER TABLE rides DROP CONSTRAINT IF EXISTS chk_ride_status;
ALTER TABLE rides ADD CONSTRAINT chk_ride_status CHECK (
    status IN ('REQUESTED', 'OFFERED', 'ACCEPTED', 'ARRIVING', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')
);

ALTER TABLE rides DROP COLUMN IF EXISTS scheduled_pickup_time;
ALTER TABLE rides DROP COLUMN IF EXISTS otp_attempts;
ALTER TABLE rides DROP COLUMN IF EXISTS otp_hash;
ALTER TABLE rides DROP COLUMN IF EXISTS pricing_rule_version;
ALTER TABLE rides DROP COLUMN IF EXISTS payment_reference;
ALTER TABLE rides DROP COLUMN IF EXISTS final_fare_snapshot;
ALTER TABLE rides DROP COLUMN IF EXISTS fare_quote_snapshot;
ALTER TABLE rides DROP COLUMN IF EXISTS special_instructions;
ALTER TABLE rides DROP COLUMN IF EXISTS passenger_count;
ALTER TABLE rides DROP COLUMN IF EXISTS drop_contact_phone;
ALTER TABLE rides DROP COLUMN IF EXISTS drop_contact_name;
ALTER TABLE rides DROP COLUMN IF EXISTS pickup_contact_phone;
ALTER TABLE rides DROP COLUMN IF EXISTS pickup_contact_name;
ALTER TABLE rides DROP COLUMN IF EXISTS vehicle_category;
ALTER TABLE rides DROP COLUMN IF EXISTS service_type;

-- Revert widened monetary columns on `rides`
ALTER TABLE rides ALTER COLUMN total_fare_inr TYPE NUMERIC(10,2);
ALTER TABLE rides ALTER COLUMN fare_base_inr TYPE NUMERIC(10,2);
ALTER TABLE rides ALTER COLUMN fare_distance_inr TYPE NUMERIC(10,2);
ALTER TABLE rides ALTER COLUMN fare_time_inr TYPE NUMERIC(10,2);
ALTER TABLE rides ALTER COLUMN platform_fee_inr TYPE NUMERIC(10,2);
ALTER TABLE rides ALTER COLUMN tax_total_inr TYPE NUMERIC(10,2);
ALTER TABLE rides ALTER COLUMN discount_inr TYPE NUMERIC(10,2);
ALTER TABLE rides ALTER COLUMN partner_payout_inr TYPE NUMERIC(10,2);

COMMIT;
