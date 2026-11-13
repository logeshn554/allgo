BEGIN;

-- =========================================================================
-- Phase 5 Rollback: Reverses Migration 006
-- =========================================================================

DROP TABLE IF EXISTS mobility_sos_events CASCADE;

DROP INDEX IF EXISTS idx_hire_status;
DROP INDEX IF EXISTS idx_hire_partner;
DROP INDEX IF EXISTS idx_hire_customer;
ALTER TABLE hire_driver_bookings DROP COLUMN IF EXISTS cancellation_reason;
ALTER TABLE hire_driver_bookings DROP COLUMN IF EXISTS duty_completed_at;
ALTER TABLE hire_driver_bookings DROP COLUMN IF EXISTS duty_started_at;
ALTER TABLE hire_driver_bookings DROP COLUMN IF EXISTS end_odometer_km;
ALTER TABLE hire_driver_bookings DROP COLUMN IF EXISTS start_odometer_km;

DROP INDEX IF EXISTS idx_parcels_status;
DROP INDEX IF EXISTS idx_parcels_partner;
DROP INDEX IF EXISTS idx_parcels_sender;
ALTER TABLE parcels DROP COLUMN IF EXISTS cancellation_reason;
ALTER TABLE parcels DROP COLUMN IF EXISTS delivered_at;
ALTER TABLE parcels DROP COLUMN IF EXISTS picked_up_at;
ALTER TABLE parcels DROP COLUMN IF EXISTS is_fragile;
ALTER TABLE parcels DROP COLUMN IF EXISTS package_description;

DROP INDEX IF EXISTS idx_rides_status;
DROP INDEX IF EXISTS idx_rides_partner;
DROP INDEX IF EXISTS idx_rides_customer;
ALTER TABLE rides DROP COLUMN IF EXISTS cancelled_by_user_id;
ALTER TABLE rides DROP COLUMN IF EXISTS cancellation_reason;
ALTER TABLE rides DROP COLUMN IF EXISTS sos_status;
ALTER TABLE rides DROP COLUMN IF EXISTS sos_triggered_at;

DROP TABLE IF EXISTS parcel_fares_config CASCADE;
DROP TABLE IF EXISTS ride_fares_config CASCADE;
DROP TABLE IF EXISTS mobility_feature_flags CASCADE;

COMMIT;
