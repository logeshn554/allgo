import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import pg from 'pg';

describe('Phase 4: Database Migration 005 & Rollback Verification', () => {
  const rootDir = process.cwd();
  const migrationsDir = path.join(rootDir, 'database/migrations');
  const rollbacksDir = path.join(rootDir, 'database/rollbacks');

  const file001 = path.join(migrationsDir, '001_initial_schema.sql');
  const file002 = path.join(migrationsDir, '002_postgis_indexes.sql');
  const file003 = path.join(migrationsDir, '003_phase2_kyc_and_onboarding.sql');
  const file004 = path.join(migrationsDir, '004_phase3_catalog_and_operating_hours.sql');
  const file005 = path.join(migrationsDir, '005_phase4_dispatch_and_delivery.sql');
  const fileRollback005 = path.join(rollbacksDir, '005_phase4_dispatch_and_delivery_rollback.sql');

  it('should verify migration 005 and rollback 005 files exist and conform to SQL transaction safety', () => {
    assert.ok(fs.existsSync(file005), '005_phase4_dispatch_and_delivery.sql must exist');
    assert.ok(
      fs.existsSync(fileRollback005),
      '005_phase4_dispatch_and_delivery_rollback.sql must exist',
    );

    const sql005 = fs.readFileSync(file005, 'utf8');
    assert.ok(sql005.includes('BEGIN;'), 'Migration 005 must be enclosed in BEGIN');
    assert.ok(sql005.trim().endsWith('COMMIT;'), 'Migration 005 must end with COMMIT');

    const rollback005 = fs.readFileSync(fileRollback005, 'utf8');
    assert.ok(rollback005.includes('BEGIN;'), 'Rollback 005 must be enclosed in BEGIN');
    assert.ok(rollback005.trim().endsWith('COMMIT;'), 'Rollback 005 must end with COMMIT');
  });

  it('should apply and rollback migration 005 symmetrically on an isolated disposable database', async () => {
    const adminUrl =
      process.env.DATABASE_ADMIN_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';
    const adminClient = new pg.Client({
      connectionString: adminUrl,
      connectionTimeoutMillis: 3000,
    });

    let connected = false;
    const disposableDbName = `allgo_disp_005_${Date.now()}`;
    try {
      await adminClient.connect();
      connected = true;
    } catch {
      console.log(
        'Skipping isolated DB test because PostgreSQL is unavailable in this environment',
      );
      return;
    }

    try {
      // 1. Create disposable database
      await adminClient.query(`CREATE DATABASE ${disposableDbName};`);

      const dispClient = new pg.Client({
        connectionString: `postgresql://postgres:postgres@127.0.0.1:5432/${disposableDbName}`,
      });
      await dispClient.connect();

      try {
        // 2. Apply baseline migrations 001, 002, 003, 004
        const sql001 = fs.readFileSync(file001, 'utf8');
        await dispClient.query(sql001);

        if (fs.existsSync(file002)) {
          const sql002 = fs.readFileSync(file002, 'utf8');
          await dispClient.query(sql002);
        }

        if (fs.existsSync(file003)) {
          const sql003 = fs.readFileSync(file003, 'utf8');
          await dispClient.query(sql003);
        }

        if (fs.existsSync(file004)) {
          const sql004 = fs.readFileSync(file004, 'utf8');
          await dispClient.query(sql004);
        }

        // 3. Apply Migration 005
        const sql005 = fs.readFileSync(file005, 'utf8');
        await dispClient.query(sql005);

        // 4. Assert Phase 4 tables exist
        const tablesRes = await dispClient.query(`
          SELECT table_name FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name IN (
            'delivery_jobs',
            'delivery_status_events',
            'partner_availability_sessions',
            'partner_location_history',
            'dispatch_attempts',
            'delivery_proofs',
            'delivery_cancellation_records',
            'delivery_exception_records',
            'partner_earnings_entries',
            'dispatch_configurations'
          );
        `);
        assert.equal(tablesRes.rows.length, 10, 'All 10 Phase 4 tables must be created');

        // Assert default configuration exists
        const configRes = await dispClient.query('SELECT * FROM dispatch_configurations LIMIT 1;');
        assert.equal(configRes.rows.length, 1, 'Default dispatch configuration must be seeded');
        assert.equal(Number(configRes.rows[0].max_search_radius_meters), 5000);

        // 5. Test Check Constraints (e.g. invalid status rejection)
        await assert.rejects(
          async () => {
            await dispClient.query(`
              INSERT INTO delivery_jobs (
                job_number, status, outlet_id, pickup_location, pickup_address,
                pickup_contact_phone, dropoff_location, dropoff_address, dropoff_contact_phone,
                handover_otp, delivery_pin
              ) VALUES (
                'JOB-FAIL-1', 'INVALID_STATUS', gen_random_uuid(),
                ST_SetSRID(ST_MakePoint(80.2, 13.0), 4326), 'Outlet',
                '9999999999', ST_SetSRID(ST_MakePoint(80.21, 13.01), 4326), 'Home',
                '9999999998', '1234', '5678'
              );
            `);
          },
          /chk_job_status/,
          'Invalid delivery status must violate chk_job_status',
        );

        // 6. Apply Rollback 005
        const rollback005 = fs.readFileSync(fileRollback005, 'utf8');
        await dispClient.query(rollback005);

        // 7. Verify Phase 4 tables removed cleanly
        const postRollback = await dispClient.query(`
          SELECT table_name FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name IN (
            'delivery_jobs',
            'delivery_status_events',
            'partner_availability_sessions',
            'partner_location_history',
            'dispatch_attempts',
            'delivery_proofs',
            'delivery_cancellation_records',
            'delivery_exception_records',
            'partner_earnings_entries',
            'dispatch_configurations'
          );
        `);
        assert.equal(
          postRollback.rows.length,
          0,
          'All Phase 4 tables must be removed after rollback',
        );
      } finally {
        await dispClient.end();
      }
    } finally {
      if (connected) {
        try {
          await adminClient.query(`DROP DATABASE IF EXISTS ${disposableDbName} WITH (FORCE);`);
        } catch {}
        await adminClient.end();
      }
    }
  });
});
