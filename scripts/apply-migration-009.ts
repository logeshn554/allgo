import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/allgo_dev';
  const client = new pg.Client(dbUrl);
  await client.connect();
  console.log(`[CONNECTED] Connected to PostgreSQL ${dbUrl.replace(/:[^:@]*@/, ':****@')}`);

  const migPath = path.resolve(import.meta.dirname, '../database/migrations/009_phase7_parcel_and_courier_delivery.sql');
  const sql = fs.readFileSync(migPath, 'utf8');

  await client.query(sql);
  console.log('[SUCCESS] Applied migration 009_phase7_parcel_and_courier_delivery.sql');

  const check = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('parcel_service_configs', 'parcel_restrictions_config', 'parcel_assignments', 'parcel_delivery_events', 'parcel_policy_audit_logs');
  `);
  console.log('[VERIFIED TABLES]:', check.rows.map(r => r.table_name));

  await client.end();
}

main().catch(err => {
  console.error('[FAILED]', err);
  process.exit(1);
});
