import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const ROOT_DIR = path.resolve(import.meta.dirname, '..');
const SEED_FILE = path.join(ROOT_DIR, 'database/seeds/dev_seed_chennai.sql');

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/allgo_dev';

export async function runSeeds(): Promise<{ success: boolean; error?: string }> {
  console.log('--- AllGo Development Seed Runner ---');
  console.log(`Connecting to: ${DATABASE_URL.replace(/:[^:@]*@/, ':****@')}`);

  const client = new pg.Client({
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 15000,
    ssl: DATABASE_URL.includes('sslmode=') ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await client.connect();
    console.log('[CONNECTED] Successfully connected to PostgreSQL.');
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.log('\n======================================================');
    console.log('[BLOCKED / PENDING LIVE CONTAINER EXECUTION]');
    console.log('PostgreSQL server is not reachable at 127.0.0.1:5432.');
    console.log('Underlying error:', errorMsg);
    console.log('\nTo execute live seeds, ensure Docker is running and execute:');
    console.log('  docker compose up -d postgres');
    console.log('  node --experimental-transform-types scripts/run-seeds.ts');
    console.log('======================================================\n');
    return { success: false, error: errorMsg };
  }

  try {
    if (!fs.existsSync(SEED_FILE)) {
      throw new Error(`Seed file not found at ${SEED_FILE}`);
    }

    console.log(`[SEEDING] Executing dev seed: ${path.basename(SEED_FILE)}...`);
    const sql = fs.readFileSync(SEED_FILE, 'utf-8');

    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('COMMIT');
      console.log('[SUCCESS] Development seeds loaded successfully.');
      return { success: true };
    } catch (seedErr) {
      await client.query('ROLLBACK');
      console.error('[ERROR] Failed executing seed script:', seedErr);
      throw seedErr;
    }
  } finally {
    await client.end();
  }
}

// Allow direct CLI invocation
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  runSeeds()
    .then((result) => {
      if (!result.success) {
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error('[FATAL]', err);
      process.exit(1);
    });
}
