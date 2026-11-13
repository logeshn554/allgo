#!/bin/sh
set -e

DB="allgo_disposable_test"
echo "=== Step 1: Applying baseline migrations 001 to 008 ==="
for f in 001_initial_schema.sql 002_postgis_indexes.sql 003_phase2_kyc_and_onboarding.sql 004_phase3_catalog_and_operating_hours.sql 005_phase4_dispatch_and_delivery.sql 006_phase5_mobility_and_parcels.sql 007_phase5_customer_cart_orders_and_payments.sql 008_phase6_search_zones_pricing_and_promotions.sql; do
    echo "Applying $f..."
    psql -U postgres -d "$DB" -f "/tmp/migrations/migrations/$f" > /dev/null
done

echo "=== Step 2: Applying Migration 009 ==="
psql -U postgres -d "$DB" -f "/tmp/migrations/migrations/009_phase7_parcel_and_courier_delivery.sql" > /dev/null

echo "=== Step 3: Verifying Phase 7 tables exist ==="
TABLE_COUNT=$(psql -U postgres -d "$DB" -t -A -c "
    SELECT count(*) FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('parcel_service_configs', 'parcel_restrictions_config', 'parcel_assignments', 'parcel_delivery_events', 'parcel_policy_audit_logs');
")
echo "Phase 7 tables count: $TABLE_COUNT (expected 5)"
if [ "$TABLE_COUNT" -ne 5 ]; then
    echo "ERROR: Table count mismatch!"
    exit 1
fi

echo "=== Step 4: Verifying additive columns on parcels table ==="
COL_COUNT=$(psql -U postgres -d "$DB" -t -A -c "
    SELECT count(*) FROM information_schema.columns 
    WHERE table_name = 'parcels' AND column_name IN (
      'customer_id', 'service_type', 'pickup_otp_hash', 'delivery_otp_hash',
      'package_quantity', 'declared_value_inr', 'price_snapshot', 'return_assigned_partner_id'
    );
")
echo "Additive columns count: $COL_COUNT (expected 8)"
if [ "$COL_COUNT" -ne 8 ]; then
    echo "ERROR: Column count mismatch!"
    exit 1
fi

echo "=== Step 5: Testing event immutability trigger ==="
psql -U postgres -d "$DB" -c "
    INSERT INTO states (code, state_code, name, status) VALUES ('TN', 33, 'Tamil Nadu', 'PILOT') ON CONFLICT DO NOTHING;
    INSERT INTO cities (state_id, name, slug, status) SELECT id, 'Chennai', 'chennai', 'PILOT' FROM states WHERE code = 'TN' LIMIT 1 ON CONFLICT DO NOTHING;
    INSERT INTO users (phone, full_name, firebase_uid, status) VALUES ('+919999999999', 'Mig Test User', 'fb_mig009_test', 'ACTIVE') ON CONFLICT DO NOTHING;
    INSERT INTO parcels (
      parcel_number, sender_id, customer_id, city_id, status,
      pickup_address, pickup_location, pickup_contact_name, pickup_contact_phone,
      drop_address, drop_location, drop_contact_name, drop_contact_phone,
      package_category, estimated_weight_kg, pickup_otp, delivery_otp,
      delivery_fee_inr, total_amount_inr, partner_payout_inr
    ) VALUES (
      'PCL-MIG009-TEST',
      (SELECT id FROM users WHERE firebase_uid = 'fb_mig009_test'),
      (SELECT id FROM users WHERE firebase_uid = 'fb_mig009_test'),
      (SELECT id FROM cities WHERE slug = 'chennai'),
      'BOOKED',
      'Pickup 1', ST_SetSRID(ST_MakePoint(80.2, 13.0), 4326), 'Sender', '9999999999',
      'Drop 1', ST_SetSRID(ST_MakePoint(80.25, 13.05), 4326), 'Recipient', '8888888888',
      'DOCUMENTS', 1.0, '1234', '5678',
      40.0, 40.0, 32.0
    );
    INSERT INTO parcel_delivery_events (parcel_id, event_type, from_status, to_status)
    SELECT id, 'BOOKED', NULL, 'BOOKED' FROM parcels WHERE parcel_number = 'PCL-MIG009-TEST';
" > /dev/null

EVENT_ID=$(psql -U postgres -d "$DB" -t -A -c "SELECT id FROM parcel_delivery_events LIMIT 1;")

# Test UPDATE rejection
if psql -U postgres -d "$DB" -c "UPDATE parcel_delivery_events SET reason = 'Tampered' WHERE id = '$EVENT_ID';" 2>&1 | grep -q "append-only"; then
    echo "SUCCESS: UPDATE was blocked by append-only trigger"
else
    echo "ERROR: UPDATE was not blocked!"
    exit 1
fi

# Test DELETE rejection
if psql -U postgres -d "$DB" -c "DELETE FROM parcel_delivery_events WHERE id = '$EVENT_ID';" 2>&1 | grep -q "append-only"; then
    echo "SUCCESS: DELETE was blocked by append-only trigger"
else
    echo "ERROR: DELETE was not blocked!"
    exit 1
fi

echo "=== Step 6: Applying Rollback 009 ==="
# Revert status of test parcel to pre-Phase-7 status
psql -U postgres -d "$DB" -c "UPDATE parcels SET status = 'CREATED' WHERE parcel_number = 'PCL-MIG009-TEST';" > /dev/null
psql -U postgres -d "$DB" -f "/tmp/rollbacks/009_phase7_parcel_and_courier_delivery_rollback.sql" > /dev/null

echo "=== Step 7: Verifying Phase 7 tables dropped after rollback ==="
POST_TABLE_COUNT=$(psql -U postgres -d "$DB" -t -A -c "
    SELECT count(*) FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('parcel_service_configs', 'parcel_restrictions_config', 'parcel_assignments', 'parcel_delivery_events', 'parcel_policy_audit_logs');
")
echo "Post-rollback tables count: $POST_TABLE_COUNT (expected 0)"
if [ "$POST_TABLE_COUNT" -ne 0 ]; then
    echo "ERROR: Tables still exist after rollback!"
    exit 1
fi

echo "=== Step 8: Verifying additive columns dropped after rollback ==="
POST_COL_COUNT=$(psql -U postgres -d "$DB" -t -A -c "
    SELECT count(*) FROM information_schema.columns 
    WHERE table_name = 'parcels' AND column_name IN (
      'service_type', 'pickup_otp_hash', 'delivery_otp_hash', 'return_assigned_partner_id'
    );
")
echo "Post-rollback columns count: $POST_COL_COUNT (expected 0)"
if [ "$POST_COL_COUNT" -ne 0 ]; then
    echo "ERROR: Columns still exist after rollback!"
    exit 1
fi

echo "SYMMETRIC_ROLLBACK_VERIFIED_SUCCESSFULLY"
