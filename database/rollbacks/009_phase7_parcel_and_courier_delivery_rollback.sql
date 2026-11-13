-- ============================================================================
-- ALLGO DATABASE ROLLBACK 009: PHASE 7 PARCEL & COURIER DELIVERY ROLLBACK
-- ============================================================================

BEGIN;

-- 1. DROP IMMUTABILITY TRIGGER & FUNCTION
DROP TRIGGER IF EXISTS trg_prevent_parcel_events_mutation ON parcel_delivery_events;
DROP FUNCTION IF EXISTS prevent_parcel_events_mutation();

-- 2. DROP PHASE 7 DEDICATED TABLES
DROP TABLE IF EXISTS parcel_policy_audit_logs CASCADE;
DROP TABLE IF EXISTS parcel_delivery_events CASCADE;
DROP TABLE IF EXISTS parcel_assignments CASCADE;
DROP TABLE IF EXISTS parcel_restrictions_config CASCADE;
DROP TABLE IF EXISTS parcel_service_configs CASCADE;

-- 2b. REVERT PARCEL FARES CONFIGURATION
DELETE FROM parcel_fares_config WHERE package_category = 'MEDICINE';
ALTER TABLE parcel_fares_config DROP CONSTRAINT IF EXISTS chk_parcel_cat;
ALTER TABLE parcel_fares_config ADD CONSTRAINT chk_parcel_cat CHECK (
    package_category IN ('DOCUMENTS', 'FOOD_BOX', 'ELECTRONICS', 'CLOTHES_ITEMS', 'GENERAL')
);

-- 3. REVERT ADDITIVE COLUMNS ON PARCELS TABLE
ALTER TABLE parcels DROP COLUMN IF EXISTS otp_expires_at;
ALTER TABLE parcels DROP COLUMN IF EXISTS return_completed_at;
ALTER TABLE parcels DROP COLUMN IF EXISTS return_initiated_at;
ALTER TABLE parcels DROP COLUMN IF EXISTS return_assigned_partner_id;
ALTER TABLE parcels DROP COLUMN IF EXISTS return_reason;
ALTER TABLE parcels DROP COLUMN IF EXISTS failed_attempt_reason;
ALTER TABLE parcels DROP COLUMN IF EXISTS delivery_proof_photo_url;
ALTER TABLE parcels DROP COLUMN IF EXISTS delivery_otp_attempts;
ALTER TABLE parcels DROP COLUMN IF EXISTS delivery_otp_hash;
ALTER TABLE parcels DROP COLUMN IF EXISTS pickup_otp_attempts;
ALTER TABLE parcels DROP COLUMN IF EXISTS pickup_otp_hash;
ALTER TABLE parcels DROP COLUMN IF EXISTS payment_method;
ALTER TABLE parcels DROP COLUMN IF EXISTS payment_reference;
ALTER TABLE parcels DROP COLUMN IF EXISTS price_snapshot;
ALTER TABLE parcels DROP COLUMN IF EXISTS requested_pickup_time;
ALTER TABLE parcels DROP COLUMN IF EXISTS service_type;
ALTER TABLE parcels DROP COLUMN IF EXISTS handling_instructions;
ALTER TABLE parcels DROP COLUMN IF EXISTS declared_value_inr;
ALTER TABLE parcels DROP COLUMN IF EXISTS height_cm;
ALTER TABLE parcels DROP COLUMN IF EXISTS width_cm;
ALTER TABLE parcels DROP COLUMN IF EXISTS length_cm;
ALTER TABLE parcels DROP COLUMN IF EXISTS package_quantity;
ALTER TABLE parcels DROP COLUMN IF EXISTS customer_id;

-- 4. REVERT STATUS CONSTRAINT TO PHASE 5 / INITIAL STATUSES
ALTER TABLE parcels DROP CONSTRAINT IF EXISTS chk_parcel_status;
ALTER TABLE parcels ADD CONSTRAINT chk_parcel_status CHECK (
    status IN ('CREATED', 'OFFERED', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'RETURNED', 'CANCELLED')
);

DROP INDEX IF EXISTS idx_parcels_customer_id;
DROP INDEX IF EXISTS idx_parcels_service_type;

COMMIT;
