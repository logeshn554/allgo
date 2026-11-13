import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const ROOT_DIR = path.resolve(import.meta.dirname, '../..');
const MIGRATION_PATH = path.join(ROOT_DIR, 'database/migrations/008_phase6_search_zones_pricing_and_promotions.sql');
const ROLLBACK_PATH = path.join(ROOT_DIR, 'database/rollbacks/008_phase6_search_zones_pricing_and_promotions_rollback.sql');

describe('Phase 6: Database Migration 008 & Rollback Verification', () => {
  it('should verify migration 008 and rollback 008 files exist and conform to SQL transaction safety', () => {
    assert.strictEqual(fs.existsSync(MIGRATION_PATH), true, 'Migration 008 must exist');
    assert.strictEqual(fs.existsSync(ROLLBACK_PATH), true, 'Rollback 008 must exist');

    const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');
    const rollbackSql = fs.readFileSync(ROLLBACK_PATH, 'utf8');

    assert.match(migrationSql, /BEGIN;/i, 'Migration must start with transaction BEGIN');
    assert.match(migrationSql, /COMMIT;/i, 'Migration must end with transaction COMMIT');
    assert.match(rollbackSql, /BEGIN;/i, 'Rollback must start with transaction BEGIN');
    assert.match(rollbackSql, /COMMIT;/i, 'Rollback must end with transaction COMMIT');
  });

  it('should apply and rollback migration 008 symmetrically on an isolated disposable database', async () => {
    const adminClient = new pg.Client({
      connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/postgres',
    });

    try {
      await adminClient.connect();
    } catch {
      console.log('Skipping isolated DB test because PostgreSQL is unavailable in this environment');
      return;
    }

    const testDbName = `allgo_test_mig008_${Date.now()}`;
    await adminClient.query(`CREATE DATABASE "${testDbName}";`);

    const testClient = new pg.Client({
      connectionString: `postgresql://postgres:postgres@127.0.0.1:5432/${testDbName}`,
    });

    try {
      await testClient.connect();

      // 1. Apply baseline migrations 001 - 007
      const migFiles = [
        '001_initial_schema.sql',
        '002_postgis_indexes.sql',
        '003_phase2_kyc_and_onboarding.sql',
        '004_phase3_catalog_and_operating_hours.sql',
        '005_phase4_dispatch_and_delivery.sql',
        '006_phase5_mobility_and_parcels.sql',
        '007_phase5_customer_cart_orders_and_payments.sql',
      ];

      for (const f of migFiles) {
        const sql = fs.readFileSync(path.join(ROOT_DIR, 'database/migrations', f), 'utf8');
        await testClient.query(sql);
      }

      // 2. Apply Migration 008
      const mig008Sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
      await testClient.query(mig008Sql);

      // Verify tables created
      const tablesRes = await testClient.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN ('zone_service_settings', 'outlet_zone_assignments', 'customer_search_history', 'promotion_pricing_audit_logs');
      `);
      assert.strictEqual(tablesRes.rows.length, 4, 'All 4 Phase 6 tables must exist');

      // Verify extended columns in coupons
      const colsRes = await testClient.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'coupons' AND column_name IN ('is_auto_applied', 'new_customer_only', 'max_total_redemptions', 'total_redeemed_count');
      `);
      assert.strictEqual(colsRes.rows.length, 4, 'All 4 promotional columns in coupons must exist');

      // 3. Apply Rollback 008
      const rollback008Sql = fs.readFileSync(ROLLBACK_PATH, 'utf8');
      await testClient.query(rollback008Sql);

      // Verify tables removed
      const postRollbackTables = await testClient.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN ('zone_service_settings', 'outlet_zone_assignments', 'customer_search_history', 'promotion_pricing_audit_logs');
      `);
      assert.strictEqual(postRollbackTables.rows.length, 0, 'Phase 6 tables must be dropped after rollback');

      // Verify extended columns removed
      const postRollbackCols = await testClient.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'coupons' AND column_name IN ('is_auto_applied', 'new_customer_only', 'max_total_redemptions', 'total_redeemed_count');
      `);
      assert.strictEqual(postRollbackCols.rows.length, 0, 'Promotional columns in coupons must be dropped after rollback');
    } finally {
      await testClient.end();
      await adminClient.query(`DROP DATABASE IF EXISTS "${testDbName}";`);
      await adminClient.end();
    }
  });
});
