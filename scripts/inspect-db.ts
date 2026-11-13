import pg from 'pg';

async function main() {
  const client = new pg.Client('postgresql://postgres:postgres@127.0.0.1:5432/allgo_dev');
  await client.connect();
  console.log('[CONNECTED] Connected to PostgreSQL 16 on 127.0.0.1:5432');
  
  let migRows: any[] = [];
  try {
    const migs = await client.query('SELECT * FROM _allgo_migrations ORDER BY id;');
    migRows = migs.rows;
  } catch (err: any) {
    console.log('_allgo_migrations does not exist yet:', err.message);
  }
  console.log('Applied migrations:', migRows);

  const tables = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
  );
  console.log('Existing tables in public schema:', tables.rows.map(r => r.table_name));

  await client.end();
}

main().catch(console.error);
