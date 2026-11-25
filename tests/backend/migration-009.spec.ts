import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import pg from 'pg';

const ROOT_DIR = path.resolve(import.meta.dirname, '../..');
const MIGRATION_PATH = path.join(
  ROOT_DIR,
  'database/migrations/009_phase7_parcel_and_courier_delivery.sql',
);
const ROLLBACK_PATH = path.join(
  ROOT_DIR,
  'database/rollbacks/009_phase7_parcel_and_courier_delivery_rollback.sql',
);

describe('Phase 7: Database Migration 009 & Rollback Verification', () => {
  it('should verify migration 009 and rollback 009 files exist and conform to SQL transaction safety', () => {
    assert.strictEqual(fs.existsSync(MIGRATION_PATH), true, 'Migration 009 must exist');
    assert.strictEqual(fs.existsSync(ROLLBACK_PATH), true, 'Rollback 009 must exist');

    const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');
    const rollbackSql = fs.readFileSync(ROLLBACK_PATH, 'utf8');

    assert.match(migrationSql, /BEGIN;/i, 'Migration must start with transaction BEGIN');
    assert.match(migrationSql, /COMMIT;/i, 'Migration must end with transaction COMMIT');
    assert.match(rollbackSql, /BEGIN;/i, 'Rollback must start with transaction BEGIN');
    assert.match(rollbackSql, /COMMIT;/i, 'Rollback must end with transaction COMMIT');
  });

  it('should apply and rollback migration 009 symmetrically on an isolated disposable database', async () => {
    const baseDevUrl =
      process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/allgo_dev';
    const adminUrlObj = new URL(baseDevUrl);
    adminUrlObj.pathname = '/postgres';
    const adminUrl = process.env.DATABASE_ADMIN_URL || adminUrlObj.toString();

    const adminClient = new pg.Client({
      connectionString: adminUrl,
    });

    try {
      await adminClient.connect();
    } catch {
      console.log(
        'Skipping isolated DB test because PostgreSQL is unavailable in this environment',
      );
      return;
    }

    // Apply migration 009 to local allgo_dev database
    const devClient = new pg.Client({
      connectionString: baseDevUrl,
    });
    try {
      await devClient.connect();
      const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');
      await devClient.query(migrationSql);
      console.log('[MIGRATION 009] Successfully applied to allgo_dev database');
    } catch (e: any) {
      console.warn('[MIGRATION 009] Note on dev application:', e.message);
    } finally {
      await devClient.end();
    }

    const testDbName = `allgo_test_mig009_${Date.now()}`;
    await adminClient.query(`CREATE DATABASE "${testDbName}";`);

    const testUrlObj = new URL(baseDevUrl);
    testUrlObj.pathname = `/${testDbName}`;

    const testClient = new pg.Client({
      connectionString: testUrlObj.toString(),
    });

    try {
      await testClient.connect();

      // 1. Apply baseline migrations 001 - 008
      const migFiles = [
        '001_initial_schema.sql',
        '002_postgis_indexes.sql',
        '003_phase2_kyc_and_onboarding.sql',
        '004_phase3_catalog_and_operating_hours.sql',
        '005_phase4_dispatch_and_delivery.sql',
        '006_phase5_mobility_and_parcels.sql',
        '007_phase5_customer_cart_orders_and_payments.sql',
        '008_phase6_search_zones_pricing_and_promotions.sql',
      ];

      for (const f of migFiles) {
        const sql = fs.readFileSync(path.join(ROOT_DIR, 'database/migrations', f), 'utf8');
        await testClient.query(sql);
      }

      // 2. Apply Migration 009
      const mig009Sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
      await testClient.query(mig009Sql);

      // Verify dedicated tables created
      const tablesRes = await testClient.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN ('parcel_service_configs', 'parcel_restrictions_config', 'parcel_assignments', 'parcel_delivery_events', 'parcel_policy_audit_logs');
      `);
      assert.strictEqual(tablesRes.rows.length, 5, 'All 5 Phase 7 tables must exist');

      // Verify additive columns on parcels
      const colsRes = await testClient.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'parcels' AND column_name IN (
          'customer_id', 'service_type', 'pickup_otp_hash', 'delivery_otp_hash',
          'package_quantity', 'declared_value_inr', 'price_snapshot', 'return_assigned_partner_id'
        );
      `);
      assert.strictEqual(colsRes.rows.length, 8, 'Additive parcel columns must exist');

      // Verify event immutability trigger
      const stateRes = await testClient.query(`
        INSERT INTO states (code, state_code, name, status)
        VALUES ('TN', 33, 'Tamil Nadu', 'PILOT')
        RETURNING id;
      `);
      const stateId = stateRes.rows[0].id;

      const cityRes = await testClient.query(
        `
        INSERT INTO cities (state_id, name, slug, status)
        VALUES ($1, 'Chennai', 'chennai', 'PILOT')
        RETURNING id;
      `,
        [stateId],
      );
      const cityId = cityRes.rows[0].id;

      const userRes = await testClient.query(`
        INSERT INTO users (phone, full_name, firebase_uid, status)
        VALUES ('+919999999999', 'Mig Test User', 'fb_mig009_test', 'ACTIVE')
        RETURNING id;
      `);
      const userId = userRes.rows[0].id;

      const parcelRes = await testClient.query(
        `
        INSERT INTO parcels (
          parcel_number, sender_id, customer_id, city_id, status,
          pickup_address, pickup_location, pickup_contact_name, pickup_contact_phone,
          drop_address, drop_location, drop_contact_name, drop_contact_phone,
          package_category, estimated_weight_kg, pickup_otp, delivery_otp,
          delivery_fee_inr, total_amount_inr, partner_payout_inr
        ) VALUES (
          'PCL-MIG009-TEST', $1, $1, $2, 'BOOKED',
          'Pickup 1', ST_SetSRID(ST_MakePoint(80.2, 13.0), 4326), 'Sender', '9999999999',
          'Drop 1', ST_SetSRID(ST_MakePoint(80.25, 13.05), 4326), 'Recipient', '8888888888',
          'DOCUMENTS', 1.0, '1234', '5678',
          40.0, 40.0, 32.0
        ) RETURNING id;
      `,
        [userId, cityId],
      );
      const parcelId = parcelRes.rows[0].id;

      const testEvent = await testClient.query(
        `
        INSERT INTO parcel_delivery_events (parcel_id, event_type, from_status, to_status)
        VALUES ($1, 'BOOKED', NULL, 'BOOKED')
        RETURNING id;
      `,
        [parcelId],
      );
      const eventId = testEvent.rows[0].id;

      let updateBlocked = false;
      try {
        await testClient.query(
          `UPDATE parcel_delivery_events SET reason = 'Tampered' WHERE id = $1;`,
          [eventId],
        );
      } catch (err: any) {
        if (err.message.includes('append-only')) {
          updateBlocked = true;
        }
      }
      assert.strictEqual(
        updateBlocked,
        true,
        'Trigger must block UPDATE on parcel_delivery_events',
      );

      let deleteBlocked = false;
      try {
        await testClient.query(`DELETE FROM parcel_delivery_events WHERE id = $1;`, [eventId]);
      } catch (err: any) {
        if (err.message.includes('append-only')) {
          deleteBlocked = true;
        }
      }
      assert.strictEqual(
        deleteBlocked,
        true,
        'Trigger must block DELETE on parcel_delivery_events',
      );

      // Revert test parcel status to pre-Phase-7 status so legacy constraint check passes on rollback
      await testClient.query(`UPDATE parcels SET status = 'CREATED' WHERE id = $1;`, [parcelId]);

      // 3. Apply Rollback 009
      const rollback009Sql = fs.readFileSync(ROLLBACK_PATH, 'utf8');
      await testClient.query(rollback009Sql);

      // Verify tables removed
      const postRollbackTables = await testClient.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN ('parcel_service_configs', 'parcel_restrictions_config', 'parcel_assignments', 'parcel_delivery_events', 'parcel_policy_audit_logs');
      `);
      assert.strictEqual(
        postRollbackTables.rows.length,
        0,
        'Phase 7 tables must be dropped after rollback',
      );

      // Verify additive columns removed
      const postRollbackCols = await testClient.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'parcels' AND column_name IN (
          'service_type', 'pickup_otp_hash', 'delivery_otp_hash', 'return_assigned_partner_id'
        );
      `);
      assert.strictEqual(
        postRollbackCols.rows.length,
        0,
        'Phase 7 columns must be dropped after rollback',
      );
    } finally {
      await testClient.end();
      await adminClient.query(`DROP DATABASE IF EXISTS "${testDbName}";`);
      await adminClient.end();
    }
  });
});
