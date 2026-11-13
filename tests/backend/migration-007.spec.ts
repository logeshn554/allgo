import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const ROOT_DIR = path.resolve(import.meta.dirname, '../..');
const MIGRATION_PATH = path.join(ROOT_DIR, 'database/migrations/007_phase5_customer_cart_orders_and_payments.sql');
const ROLLBACK_PATH = path.join(ROOT_DIR, 'database/rollbacks/007_phase5_customer_cart_orders_and_payments_rollback.sql');

describe('Phase 5: Database Migration 007 & Rollback Verification', () => {
  it('should verify migration 007 and rollback 007 files exist and conform to SQL transaction safety', () => {
    assert.strictEqual(fs.existsSync(MIGRATION_PATH), true, 'Migration 007 must exist');
    assert.strictEqual(fs.existsSync(ROLLBACK_PATH), true, 'Rollback 007 must exist');

    const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');
    const rollbackSql = fs.readFileSync(ROLLBACK_PATH, 'utf8');

    assert.match(migrationSql, /BEGIN;/i, 'Migration must start with transaction BEGIN');
    assert.match(migrationSql, /COMMIT;/i, 'Migration must end with transaction COMMIT');
    assert.match(rollbackSql, /BEGIN;/i, 'Rollback must start with transaction BEGIN');
    assert.match(rollbackSql, /COMMIT;/i, 'Rollback must end with transaction COMMIT');
  });

  it('should apply and rollback migration 007 symmetrically on an isolated disposable database', async () => {
    const adminClient = new pg.Client({
      connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/postgres',
    });

    try {
      await adminClient.connect();
    } catch {
      console.log('Skipping isolated DB test because PostgreSQL is unavailable in this environment');
      return;
    }

    const testDbName = `allgo_test_mig007_${Date.now()}`;
    await adminClient.query(`CREATE DATABASE "${testDbName}";`);

    const testClient = new pg.Client({
      connectionString: `postgresql://postgres:postgres@127.0.0.1:5432/${testDbName}`,
    });

    try {
      await testClient.connect();

      // 1. Apply baseline migrations 001 - 006
      const migFiles = [
        '001_initial_schema.sql',
        '002_postgis_indexes.sql',
        '003_phase2_kyc_and_onboarding.sql',
        '004_phase3_catalog_and_operating_hours.sql',
        '005_phase4_dispatch_and_delivery.sql',
        '006_phase5_mobility_and_parcels.sql',
      ];

      for (const f of migFiles) {
        const filePath = path.join(ROOT_DIR, 'database/migrations', f);
        if (fs.existsSync(filePath)) {
          const sql = fs.readFileSync(filePath, 'utf8');
          await testClient.query(sql);
        }
      }

      // 2. Apply Migration 007
      const mig007Sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
      await testClient.query(mig007Sql);

      // Verify tables and columns created
      const savedAddressesRes = await testClient.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'customer_saved_addresses';"
      );
      assert.strictEqual(savedAddressesRes.rows.length > 0, true);

      const payTransRes = await testClient.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'payment_transactions';"
      );
      assert.strictEqual(payTransRes.rows.length > 0, true);

      const subOrdersRes = await testClient.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'sub_orders' AND column_name = 'delivery_fee_inr';"
      );
      assert.strictEqual(subOrdersRes.rows.length, 1);

      // 3. Apply Rollback 007
      const rollbackSql = fs.readFileSync(ROLLBACK_PATH, 'utf8');
      await testClient.query(rollbackSql);

      const rolledBackTableRes = await testClient.query(
        "SELECT table_name FROM information_schema.tables WHERE table_name = 'customer_saved_addresses';"
      );
      assert.strictEqual(rolledBackTableRes.rows.length, 0, 'customer_saved_addresses should be dropped on rollback');

      const rolledBackColumnRes = await testClient.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'sub_orders' AND column_name = 'delivery_fee_inr';"
      );
      assert.strictEqual(rolledBackColumnRes.rows.length, 0, 'delivery_fee_inr column should be removed on rollback');
    } finally {
      await testClient.end();
      await adminClient.query(`DROP DATABASE IF EXISTS "${testDbName}";`);
      await adminClient.end();
    }
  });
});
