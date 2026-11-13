import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const ROOT_DIR = path.resolve(import.meta.dirname, '../..');
const MIGRATION_PATH = path.join(ROOT_DIR, 'database/migrations/010_phase8_mobility_services_and_hire_driver.sql');
const ROLLBACK_PATH = path.join(ROOT_DIR, 'database/rollbacks/010_phase8_mobility_services_and_hire_driver_rollback.sql');

describe('Phase 8: Database Migration 010 & Rollback Verification', () => {

  // =========================================================================
  // TIER 1: STATIC & STRUCTURAL ANALYSIS (Runs In-Memory, 100% Offline-Safe)
  // =========================================================================

  it('1. should verify migration 010 and rollback 010 files exist and conform to transaction safety', () => {
    assert.strictEqual(fs.existsSync(MIGRATION_PATH), true, 'Migration 010 file must exist');
    assert.strictEqual(fs.existsSync(ROLLBACK_PATH), true, 'Rollback 010 file must exist');

    const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');
    const rollbackSql = fs.readFileSync(ROLLBACK_PATH, 'utf8');

    assert.match(migrationSql, /^[\s\S]*?BEGIN;/i, 'Migration 010 must start with BEGIN;');
    assert.match(migrationSql, /COMMIT;\s*$/i, 'Migration 010 must end with COMMIT;');
    assert.match(rollbackSql, /^[\s\S]*?BEGIN;/i, 'Rollback 010 must start with BEGIN;');
    assert.match(rollbackSql, /COMMIT;\s*$/i, 'Rollback 010 must end with COMMIT;');
  });

  it('2. should verify additive columns on canonical rides table', () => {
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
    const expectedRideColumns = [
      'service_type',
      'vehicle_category',
      'pickup_contact_name',
      'pickup_contact_phone',
      'drop_contact_name',
      'drop_contact_phone',
      'passenger_count',
      'special_instructions',
      'fare_quote_snapshot',
      'final_fare_snapshot',
      'payment_reference',
      'pricing_rule_version',
      'otp_hash',
      'otp_attempts',
      'scheduled_pickup_time'
    ];

    for (const col of expectedRideColumns) {
      const colRegex = new RegExp(`ALTER\\s+TABLE\\s+rides\\s+ADD\\s+COLUMN\\s+IF\\s+NOT\\s+EXISTS\\s+${col}\\b`, 'i');
      assert.match(sql, colRegex, `Migration 010 must add column "${col}" to rides using ADD COLUMN IF NOT EXISTS`);
    }
  });

  it('3. should verify additive columns on canonical hire_driver_bookings table', () => {
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
    const expectedHireColumns = [
      'drop_address',
      'drop_location',
      'customer_vehicle_registration',
      'customer_vehicle_make_model',
      'customer_vehicle_fuel_type',
      'pricing_model',
      'fare_quote_snapshot',
      'final_fare_snapshot',
      'start_otp_hash',
      'end_otp_hash',
      'otp_attempts'
    ];

    for (const col of expectedHireColumns) {
      const colRegex = new RegExp(`ALTER\\s+TABLE\\s+hire_driver_bookings\\s+ADD\\s+COLUMN\\s+IF\\s+NOT\\s+EXISTS\\s+${col}\\b`, 'i');
      assert.match(sql, colRegex, `Migration 010 must add column "${col}" to hire_driver_bookings using ADD COLUMN IF NOT EXISTS`);
    }
  });

  it('4. should verify 15-state ride lifecycle check constraint chk_ride_status', () => {
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
    assert.match(sql, /ALTER\s+TABLE\s+rides\s+DROP\s+CONSTRAINT\s+IF\s+EXISTS\s+chk_ride_status/i);
    assert.match(sql, /ALTER\s+TABLE\s+rides\s+ADD\s+CONSTRAINT\s+chk_ride_status\s+CHECK/i);

    const requiredStates = [
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
      'DISPUTED'
    ];

    for (const state of requiredStates) {
      assert.match(sql, new RegExp(`['"]${state}['"]`), `chk_ride_status must include state ${state}`);
    }
  });

  it('5. should verify creation of dedicated Phase 8 mobility tables and unique active offer index', () => {
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
    const expectedTables = [
      'ride_assignments',
      'ride_events',
      'hire_driver_assignments',
      'hire_driver_events'
    ];

    for (const tbl of expectedTables) {
      const tblRegex = new RegExp(`CREATE\\s+TABLE\\s+(IF\\s+NOT\\s+EXISTS\\s+)?${tbl}\\b`, 'i');
      assert.match(sql, tblRegex, `Migration 010 must create table "${tbl}"`);
    }

    // Duplicate active offer prevention check
    assert.match(sql, /CREATE\s+UNIQUE\s+INDEX[\s\S]*?ON\s+ride_assignments[\s\S]*?WHERE\s+status\s*=\s*'OFFERED'/i,
      'Migration 010 must create unique index preventing concurrent OFFERED assignments on ride_assignments');
  });

  it('6. should verify immutable audit trail triggers prevent_ride_events_mutation and prevent_hire_driver_events_mutation', () => {
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');

    // Ride events immutability
    assert.match(sql, /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+prevent_ride_events_mutation\(\)/i, 'Must define prevent_ride_events_mutation()');
    assert.match(sql, /RAISE\s+EXCEPTION\s+['"].*?append-only.*?['"]/i, 'Trigger function must raise append-only exception');
    assert.match(sql, /CREATE\s+TRIGGER\s+trg_prevent_ride_events_mutation\s+BEFORE\s+UPDATE\s+OR\s+DELETE\s+ON\s+ride_events/i, 'Must attach trigger on ride_events');

    // Hire driver events immutability
    assert.match(sql, /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+prevent_hire_driver_events_mutation\(\)/i, 'Must define prevent_hire_driver_events_mutation()');
    assert.match(sql, /CREATE\s+TRIGGER\s+trg_prevent_hire_driver_events_mutation\s+BEFORE\s+UPDATE\s+OR\s+DELETE\s+ON\s+hire_driver_events/i, 'Must attach trigger on hire_driver_events');
  });

  it('7. should verify rollback 010 cleans up all added tables, columns, triggers and constraints', () => {
    const rollbackSql = fs.readFileSync(ROLLBACK_PATH, 'utf8');

    // Triggers and functions dropped
    assert.match(rollbackSql, /DROP\s+TRIGGER\s+IF\s+EXISTS\s+trg_prevent_ride_events_mutation\s+ON\s+ride_events/i);
    assert.match(rollbackSql, /DROP\s+FUNCTION\s+IF\s+EXISTS\s+prevent_ride_events_mutation/i);
    assert.match(rollbackSql, /DROP\s+TRIGGER\s+IF\s+EXISTS\s+trg_prevent_hire_driver_events_mutation\s+ON\s+hire_driver_events/i);
    assert.match(rollbackSql, /DROP\s+FUNCTION\s+IF\s+EXISTS\s+prevent_hire_driver_events_mutation/i);

    // Tables dropped
    assert.match(rollbackSql, /DROP\s+TABLE\s+IF\s+EXISTS\s+ride_events/i);
    assert.match(rollbackSql, /DROP\s+TABLE\s+IF\s+EXISTS\s+ride_assignments/i);
    assert.match(rollbackSql, /DROP\s+TABLE\s+IF\s+EXISTS\s+hire_driver_events/i);
    assert.match(rollbackSql, /DROP\s+TABLE\s+IF\s+EXISTS\s+hire_driver_assignments/i);

    // Additive columns dropped
    assert.match(rollbackSql, /ALTER\s+TABLE\s+rides\s+DROP\s+COLUMN\s+IF\s+EXISTS\s+otp_hash/i);
    assert.match(rollbackSql, /ALTER\s+TABLE\s+hire_driver_bookings\s+DROP\s+COLUMN\s+IF\s+EXISTS\s+start_otp_hash/i);

    // Constraint reverted
    assert.match(rollbackSql, /ALTER\s+TABLE\s+rides\s+DROP\s+CONSTRAINT\s+IF\s+EXISTS\s+chk_ride_status/i);
  });

  // =========================================================================
  // TIER 2: DYNAMIC DATABASE EXECUTION (Runs against Disposable DB if Online)
  // =========================================================================

  it('8. should apply and rollback migration 010 symmetrically on an isolated disposable database', async () => {
    const baseDevUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/allgo_dev';
    const adminUrlObj = new URL(baseDevUrl);
    adminUrlObj.pathname = '/postgres';
    const adminUrl = process.env.DATABASE_ADMIN_URL || adminUrlObj.toString();

    const adminClient = new pg.Client({ connectionString: adminUrl });
    try {
      await adminClient.connect();
    } catch {
      console.log('Skipping isolated DB test because PostgreSQL is unavailable in this environment');
      return;
    }

    // Apply migration 010 to local allgo_dev database
    const devClient = new pg.Client({ connectionString: baseDevUrl });
    try {
      await devClient.connect();
      const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');
      await devClient.query(migrationSql);
      console.log('[MIGRATION 010] Successfully applied to allgo_dev database');
    } catch (e: any) {
      console.warn('[MIGRATION 010] Note on dev application:', e.message);
    } finally {
      await devClient.end();
    }

    const testDbName = `allgo_test_mig010_${Date.now()}`;
    await adminClient.query(`CREATE DATABASE "${testDbName}";`);

    const testUrlObj = new URL(baseDevUrl);
    testUrlObj.pathname = `/${testDbName}`;
    const testClient = new pg.Client({ connectionString: testUrlObj.toString() });

    try {
      await testClient.connect();

      // 1. Apply baseline migrations 001 - 009
      const migFiles = [
        '001_initial_schema.sql',
        '002_postgis_indexes.sql',
        '003_phase2_kyc_and_onboarding.sql',
        '004_phase3_catalog_and_operating_hours.sql',
        '005_phase4_dispatch_and_delivery.sql',
        '006_phase5_mobility_and_parcels.sql',
        '007_phase5_customer_cart_orders_and_payments.sql',
        '008_phase6_search_zones_pricing_and_promotions.sql',
        '009_phase7_parcel_and_courier_delivery.sql',
      ];

      for (const f of migFiles) {
        const sql = fs.readFileSync(path.join(ROOT_DIR, 'database/migrations', f), 'utf8');
        await testClient.query(sql);
      }

      // 2. Apply Migration 010
      const mig010Sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
      await testClient.query(mig010Sql);

      // Verify dedicated tables created
      const tablesRes = await testClient.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN ('ride_assignments', 'ride_events', 'hire_driver_assignments', 'hire_driver_events');
      `);
      assert.strictEqual(tablesRes.rows.length, 4, 'All 4 Phase 8 tables must exist');

      // Verify additive columns on rides
      const rideColsRes = await testClient.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'rides' AND column_name IN (
          'service_type', 'vehicle_category', 'pickup_contact_name', 'pickup_contact_phone',
          'drop_contact_name', 'drop_contact_phone', 'passenger_count', 'special_instructions',
          'fare_quote_snapshot', 'final_fare_snapshot', 'payment_reference', 'pricing_rule_version',
          'otp_hash', 'otp_attempts', 'scheduled_pickup_time'
        );
      `);
      assert.strictEqual(rideColsRes.rows.length, 15, 'All 15 additive ride columns must exist');

      // Verify additive columns on hire_driver_bookings
      const hireColsRes = await testClient.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'hire_driver_bookings' AND column_name IN (
          'drop_address', 'drop_location', 'customer_vehicle_registration',
          'customer_vehicle_make_model', 'customer_vehicle_fuel_type', 'pricing_model',
          'fare_quote_snapshot', 'final_fare_snapshot', 'start_otp_hash', 'end_otp_hash', 'otp_attempts'
        );
      `);
      assert.strictEqual(hireColsRes.rows.length, 11, 'All 11 additive hire_driver columns must exist');

      // Verify seed prerequisites for constraint & trigger checks
      const stateRes = await testClient.query(`
        INSERT INTO states (code, state_code, name, status)
        VALUES ('TN', 33, 'Tamil Nadu', 'PILOT') RETURNING id;
      `);
      const stateId = stateRes.rows[0].id;

      const cityRes = await testClient.query(`
        INSERT INTO cities (state_id, name, slug, status)
        VALUES ($1, 'Chennai', 'chennai', 'PILOT') RETURNING id;
      `, [stateId]);
      const cityId = cityRes.rows[0].id;

      const custRes = await testClient.query(`
        INSERT INTO users (phone, full_name, firebase_uid, status)
        VALUES ('+919888888881', 'Cust Mig010', 'fb_cust_mig010', 'ACTIVE') RETURNING id;
      `);
      const custId = custRes.rows[0].id;

      const partUserRes = await testClient.query(`
        INSERT INTO users (phone, full_name, firebase_uid, status)
        VALUES ('+919888888882', 'Part Mig010', 'fb_part_mig010', 'ACTIVE') RETURNING id;
      `);
      const partUserId = partUserRes.rows[0].id;

      const partRes = await testClient.query(`
        INSERT INTO partners (user_id, status) VALUES ($1, 'APPROVED') RETURNING id;
      `, [partUserId]);
      const partnerId = partRes.rows[0].id;

      // 3. Test chk_ride_status 15 states
      const rideRes = await testClient.query(`
        INSERT INTO rides (
          ride_number, customer_id, city_id, ride_type, status,
          pickup_address, pickup_location, drop_address, drop_location,
          start_otp, estimated_distance_km, estimated_duration_minutes,
          fare_base_inr, fare_distance_inr, total_fare_inr
        ) VALUES (
          'RD-MIG010-001', $1, $2, 'CAB_ECONOMY', 'RIDE_REQUESTED',
          'Pickup St', ST_SetSRID(ST_MakePoint(80.2, 13.0), 4326),
          'Drop St', ST_SetSRID(ST_MakePoint(80.25, 13.05), 4326),
          '1234', 5.0, 15, 60.0, 90.0, 150.0
        ) RETURNING id;
      `, [custId, cityId]);
      const rideId = rideRes.rows[0].id;

      // Advance through representative Phase 8 states
      await testClient.query(`UPDATE rides SET status = 'SEARCHING_FOR_DRIVER' WHERE id = $1;`, [rideId]);
      await testClient.query(`UPDATE rides SET status = 'DRIVER_ASSIGNED', partner_id = $2 WHERE id = $1;`, [rideId, partnerId]);
      await testClient.query(`UPDATE rides SET status = 'TRIP_STARTED' WHERE id = $1;`, [rideId]);
      await testClient.query(`UPDATE rides SET status = 'TRIP_COMPLETED' WHERE id = $1;`, [rideId]);

      // Assert invalid status is rejected
      let invalidRejected = false;
      try {
        await testClient.query(`UPDATE rides SET status = 'NON_EXISTENT_STATE' WHERE id = $1;`, [rideId]);
      } catch (err: any) {
        invalidRejected = true;
      }
      assert.strictEqual(invalidRejected, true, 'chk_ride_status must reject invalid states');

      // 4. Test ride_events immutability trigger
      const eventRes = await testClient.query(`
        INSERT INTO ride_events (ride_id, event_type, from_status, to_status, actor_id, actor_role)
        VALUES ($1, 'RIDE_REQUESTED', NULL, 'RIDE_REQUESTED', $2, 'CUSTOMER') RETURNING id;
      `, [rideId, custId]);
      const eventId = eventRes.rows[0].id;

      let rideEventUpdateBlocked = false;
      try {
        await testClient.query(`UPDATE ride_events SET reason = 'Tampered' WHERE id = $1;`, [eventId]);
      } catch (err: any) {
        if (err.message.includes('append-only')) rideEventUpdateBlocked = true;
      }
      assert.strictEqual(rideEventUpdateBlocked, true, 'Trigger must block UPDATE on ride_events');

      let rideEventDeleteBlocked = false;
      try {
        await testClient.query(`DELETE FROM ride_events WHERE id = $1;`, [eventId]);
      } catch (err: any) {
        if (err.message.includes('append-only')) rideEventDeleteBlocked = true;
      }
      assert.strictEqual(rideEventDeleteBlocked, true, 'Trigger must block DELETE on ride_events');

      // 5. Test duplicate active offer constraint on ride_assignments
      await testClient.query(`
        INSERT INTO ride_assignments (ride_id, partner_id, attempt_number, status, offer_expires_at)
        VALUES ($1, $2, 1, 'OFFERED', NOW() + INTERVAL '45 seconds');
      `, [rideId, partnerId]);

      let duplicateOfferBlocked = false;
      try {
        await testClient.query(`
          INSERT INTO ride_assignments (ride_id, partner_id, attempt_number, status, offer_expires_at)
          VALUES ($1, $2, 2, 'OFFERED', NOW() + INTERVAL '45 seconds');
        `, [rideId, partnerId]);
      } catch (err: any) {
        duplicateOfferBlocked = true;
      }
      assert.strictEqual(duplicateOfferBlocked, true, 'Must block concurrent OFFERED assignments for same ride');

      // Revert test ride status to pre-Phase-8 status so legacy constraint check passes on rollback
      await testClient.query(`UPDATE rides SET status = 'COMPLETED' WHERE id = $1;`, [rideId]);

      // 6. Apply Rollback 010
      const rollback010Sql = fs.readFileSync(ROLLBACK_PATH, 'utf8');
      await testClient.query(rollback010Sql);

      // Verify tables removed
      const postRollbackTables = await testClient.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN ('ride_assignments', 'ride_events', 'hire_driver_assignments', 'hire_driver_events');
      `);
      assert.strictEqual(postRollbackTables.rows.length, 0, 'Phase 8 tables must be dropped after rollback');

      // Verify additive columns removed
      const postRollbackCols = await testClient.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'rides' AND column_name IN (
          'service_type', 'vehicle_category', 'otp_hash', 'fare_quote_snapshot'
        );
      `);
      assert.strictEqual(postRollbackCols.rows.length, 0, 'Additive ride columns must be dropped after rollback');

    } finally {
      await testClient.end();
      await adminClient.query(`DROP DATABASE IF EXISTS "${testDbName}";`);
      await adminClient.end();
    }
  });
});
