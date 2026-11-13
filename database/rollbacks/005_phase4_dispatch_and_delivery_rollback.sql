-- ALLGO PHASE 4 ROLLBACK: DISPATCH ENGINE, DELIVERY PARTNER ASSIGNMENT, LIVE GPS TRACKING & DELIVERY OPERATIONS
-- File: database/rollbacks/005_phase4_dispatch_and_delivery_rollback.sql

BEGIN;

DROP TABLE IF EXISTS dispatch_configurations CASCADE;
DROP TABLE IF EXISTS partner_earnings_entries CASCADE;
DROP TABLE IF EXISTS delivery_exception_records CASCADE;
DROP TABLE IF EXISTS delivery_cancellation_records CASCADE;
DROP TABLE IF EXISTS delivery_proofs CASCADE;
DROP TABLE IF EXISTS dispatch_attempts CASCADE;
DROP TABLE IF EXISTS partner_location_history CASCADE;
DROP TABLE IF EXISTS partner_availability_sessions CASCADE;
DROP TABLE IF EXISTS delivery_status_events CASCADE;
DROP TABLE IF EXISTS delivery_jobs CASCADE;

COMMIT;
