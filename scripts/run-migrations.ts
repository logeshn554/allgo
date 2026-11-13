import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const ROOT_DIR = path.resolve(import.meta.dirname, '..');
const MIGRATIONS_DIR = path.join(ROOT_DIR, 'database/migrations');

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/allgo_dev';

export async function runMigrations(): Promise<{ success: boolean; applied: string[]; error?: string }> {
  console.log('--- AllGo Migration Runner ---');
  console.log(`Connecting to: ${DATABASE_URL.replace(/:[^:@]*@/, ':****@')}`);

  const client = new pg.Client({
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 3000,
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
    console.log('\nTo execute live migrations, ensure Docker is running and execute:');
    console.log('  docker compose up -d postgres');
    console.log('  node --experimental-transform-types scripts/run-migrations.ts');
    console.log('======================================================\n');
    return { success: false, applied: [], error: errorMsg };
  }

  try {
    // Ensure migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _allgo_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Fetch already applied migrations
    const res = await client.query('SELECT filename FROM _allgo_migrations;');
    const appliedSet = new Set(res.rows.map((r: any) => r.filename));

    // Discover migration files
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const newlyApplied: string[] = [];

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`[SKIPPED] Already applied: ${file}`);
        continue;
      }

      console.log(`[APPLYING] ${file}...`);
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _allgo_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`[SUCCESS] Applied ${file}`);
        newlyApplied.push(file);
      } catch (migrationErr) {
        await client.query('ROLLBACK');
        console.error(`[ERROR] Failed to apply ${file}:`, migrationErr);
        throw migrationErr;
      }
    }

    console.log('\n[COMPLETE] All database migrations applied successfully.');
    return { success: true, applied: newlyApplied };
  } finally {
    await client.end();
  }
}

// Allow direct CLI invocation
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  runMigrations()
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

