import pg from 'pg';

export async function verifySchemaAndTables() {
  console.log('>>> [VERIFYING MIGRATED SCHEMA & TABLES]...');
  const client = new pg.Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/allgo_dev',
  });

  await client.connect();

  const migRes = await client.query(
    'SELECT filename, applied_at FROM _allgo_migrations ORDER BY id;',
  );
  console.log('  [MIGRATIONS APPLIED]:', migRes.rows);

  const tblRes = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;",
  );
  const tables = tblRes.rows.map((r: any) => r.table_name);
  console.log(`  [TABLES COUNT]: ${tables.length}`);
  console.log('  [TABLES]:', tables);

  const gistRes = await client.query(
    "SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE '%gist%';",
  );
  console.log(`  [SPATIAL GIST INDEXES COUNT]: ${gistRes.rows.length}`);
  console.log('  [GIST INDEXES]:', gistRes.rows);

  await client.end();
}

verifySchemaAndTables().catch(console.error);
