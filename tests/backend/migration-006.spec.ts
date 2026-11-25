import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import pg from 'pg';

describe('Phase 5: Database Migration 006 & Rollback Verification', () => {
  const rootDir = process.cwd();
  const migrationsDir = path.join(rootDir, 'database/migrations');
  const rollbacksDir = path.join(rootDir, 'database/rollbacks');

  const file001 = path.join(migrationsDir, '001_initial_schema.sql');
  const file002 = path.join(migrationsDir, '002_postgis_indexes.sql');
  const file003 = path.join(migrationsDir, '003_phase2_kyc_and_onboarding.sql');
  const file004 = path.join(migrationsDir, '004_phase3_catalog_and_operating_hours.sql');
  const file005 = path.join(migrationsDir, '005_phase4_dispatch_and_delivery.sql');
  const file006 = path.join(migrationsDir, '006_phase5_mobility_and_parcels.sql');
  const fileRollback006 = path.join(rollbacksDir, '006_phase5_mobility_and_parcels_rollback.sql');

  it('should verify migration 006 and rollback 006 files exist and conform to SQL transaction safety', () => {
    assert.ok(fs.existsSync(file006), '006_phase5_mobility_and_parcels.sql must exist');
    assert.ok(
      fs.existsSync(fileRollback006),
      '006_phase5_mobility_and_parcels_rollback.sql must exist',
    );

    const sql006 = fs.readFileSync(file006, 'utf8');
    assert.ok(sql006.includes('BEGIN;'), 'Migration 006 must be enclosed in BEGIN');
    assert.ok(sql006.trim().endsWith('COMMIT;'), 'Migration 006 must end with COMMIT');

    const rollback006 = fs.readFileSync(fileRollback006, 'utf8');
    assert.ok(rollback006.includes('BEGIN;'), 'Rollback 006 must be enclosed in BEGIN');
    assert.ok(rollback006.trim().endsWith('COMMIT;'), 'Rollback 006 must end with COMMIT');
  });

  it('should apply and rollback migration 006 symmetrically on an isolated disposable database', async () => {
    const adminUrl =
      process.env.DATABASE_ADMIN_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';
    const adminClient = new pg.Client({
      connectionString: adminUrl,
      connectionTimeoutMillis: 3000,
    });

    const disposableDbName = `allgo_disp_006_${Date.now()}`;
    try {
      await adminClient.connect();
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
        // 2. Apply baseline migrations 001 through 005
        await dispClient.query(fs.readFileSync(file001, 'utf8'));
        if (fs.existsSync(file002)) await dispClient.query(fs.readFileSync(file002, 'utf8'));
        if (fs.existsSync(file003)) await dispClient.query(fs.readFileSync(file003, 'utf8'));
        if (fs.existsSync(file004)) await dispClient.query(fs.readFileSync(file004, 'utf8'));
        if (fs.existsSync(file005)) await dispClient.query(fs.readFileSync(file005, 'utf8'));

        // 3. Apply Migration 006
        await dispClient.query(fs.readFileSync(file006, 'utf8'));

        // 4. Verify Phase 5 tables and configurations
        const flagsRes = await dispClient.query(
          'SELECT * FROM mobility_feature_flags WHERE state_code = $1;',
          ['TN'],
        );
        assert.equal(flagsRes.rows.length, 1);
        assert.equal(flagsRes.rows[0].rides_enabled, true);

        const rideFaresRes = await dispClient.query('SELECT * FROM ride_fares_config;');
        assert.equal(rideFaresRes.rows.length, 4, 'Must seed BIKE, AUTO, CAB_ECONOMY, CAB_PREMIUM');

        const parcelFaresRes = await dispClient.query('SELECT * FROM parcel_fares_config;');
        assert.equal(parcelFaresRes.rows.length, 5, 'Must seed 5 package categories');

        const sosTableRes = await dispClient.query(`
          SELECT table_name FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'mobility_sos_events';
        `);
        assert.equal(sosTableRes.rows.length, 1);

        // 5. Test check constraints (e.g. invalid vehicle category)
        await assert.rejects(async () => {
          await dispClient.query(`
              INSERT INTO ride_fares_config (vehicle_category, base_fare_inr, per_km_rate_inr, minimum_fare_inr)
              VALUES ('HOVERBOARD', 100, 50, 150);
            `);
        }, /chk_vehicle_cat/);

        // 6. Test Rollback 006
        await dispClient.query(fs.readFileSync(fileRollback006, 'utf8'));

        // Verify tables are dropped
        const rolledBackTables = await dispClient.query(`
          SELECT table_name FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name IN ('mobility_feature_flags', 'ride_fares_config', 'parcel_fares_config', 'mobility_sos_events');
        `);
        assert.equal(
          rolledBackTables.rows.length,
          0,
          'Phase 5 specific tables must be dropped cleanly',
        );
      } finally {
        await dispClient.end();
      }
    } finally {
      await adminClient.query(`DROP DATABASE IF EXISTS ${disposableDbName};`);
      await adminClient.end();
    }
  });
});
