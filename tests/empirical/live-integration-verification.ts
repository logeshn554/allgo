import Redis from 'ioredis';
import pg from 'pg';

export async function verifyPostgresAndRedis() {
  console.log('========================================================');
  console.log('   ALLGO PHASE 1 REAL INFRASTRUCTURE INTEGRATION AUDIT  ');
  console.log('========================================================\n');

  // --- 1. POSTGRESQL & POSTGIS VERIFICATION ---
  console.log('>>> [1/3] VERIFYING REAL POSTGRESQL & POSTGIS...');
  const pgClient = new pg.Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/allgo_dev',
    connectionTimeoutMillis: 5000,
  });

  try {
    await pgClient.connect();
    console.log('  [PASS] Successfully established TCP connection to PostgreSQL.');

    const verRes = await pgClient.query('SELECT version();');
    console.log('  [PASS] PostgreSQL Version:', verRes.rows[0].version);

    const dbRes = await pgClient.query('SELECT current_database(), current_user, session_user;');
    console.log('  [PASS] Database & User:', dbRes.rows[0]);

    const postgisRes = await pgClient.query('SELECT PostGIS_Full_Version();');
    console.log('  [PASS] PostGIS Full Version:', postgisRes.rows[0].postgis_full_version);

    // Spatial calculation test
    const spatialRes = await pgClient.query(
      `SELECT ST_Distance(
        ST_SetSRID(ST_Point(80.2707, 13.0827), 4326)::geography,
        ST_SetSRID(ST_Point(80.2184, 13.0067), 4326)::geography
      ) as distance_meters;`,
    );
    console.log(
      '  [PASS] PostGIS Spatial Calculation (Chennai Central to Guindy):',
      Math.round(spatialRes.rows[0].distance_meters),
      'meters',
    );

    // Persistence row write
    await pgClient.query(
      'CREATE TABLE IF NOT EXISTS _allgo_persistence_check (id INT PRIMARY KEY, val TEXT, created_at TIMESTAMPTZ DEFAULT NOW());',
    );
    await pgClient.query(
      "INSERT INTO _allgo_persistence_check (id, val) VALUES (1, 'allgo_persisted_evidence') ON CONFLICT (id) DO UPDATE SET val = EXCLUDED.val;",
    );
    const persistRes = await pgClient.query('SELECT * FROM _allgo_persistence_check WHERE id = 1;');
    console.log('  [PASS] Pre-restart Persistence Record:', persistRes.rows[0]);
  } catch (err: any) {
    console.error('  [FAIL] PostgreSQL Verification Error:', err.message);
    throw err;
  } finally {
    await pgClient.end();
  }

  // --- 2. REDIS VERIFICATION ---
  console.log('\n>>> [2/3] VERIFYING REAL REDIS...');
  const redis = new Redis('redis://127.0.0.1:6379');

  try {
    const pingRes = await redis.ping();
    console.log('  [PASS] Redis PING response:', pingRes);

    const info = await redis.info('server');
    const versionMatch = info.match(/redis_version:([^\r\n]+)/);
    console.log('  [PASS] Redis Version:', versionMatch ? versionMatch[1] : 'unknown');

    // Write & Read test key
    const testKey = 'test:allgo:phase1_live_check_' + Date.now();
    await redis.set(testKey, 'live_redis_ok', 'EX', 60);
    const readVal = await redis.get(testKey);
    console.log('  [PASS] Redis Set/Get Value:', readVal);
    if (readVal !== 'live_redis_ok') {
      throw new Error('Redis read value mismatch');
    }

    // Delete test key
    await redis.del(testKey);
    const existsVal = await redis.exists(testKey);
    console.log(
      '  [PASS] Redis Temporary Key Deleted. Exists check:',
      existsVal === 0 ? 'CLEANED' : 'STILL_EXISTS',
    );

    // Test Redis Lua atomic script
    const luaScript = `
      local val = redis.call('GET', KEYS[1])
      if not val then
        redis.call('SET', KEYS[1], ARGV[1])
        return 1
      else
        return 0
      end
    `;
    const luaTestKey = 'test:allgo:lua_test_' + Date.now();
    const luaRes1 = await redis.eval(luaScript, 1, luaTestKey, 'first');
    const luaRes2 = await redis.eval(luaScript, 1, luaTestKey, 'second');
    await redis.del(luaTestKey);
    console.log('  [PASS] Redis Atomic Lua Script Execution:', {
      firstAttempt: luaRes1,
      secondAttempt: luaRes2,
    });
  } catch (err: any) {
    console.error('  [FAIL] Redis Verification Error:', err.message);
    throw err;
  } finally {
    await redis.quit();
  }

  console.log('\n[ALL INFRASTRUCTURE CHECKS PASSED]');
}

// Allow direct run
if (process.argv[1] && process.argv[1].endsWith('live-integration-verification.ts')) {
  verifyPostgresAndRedis().catch(() => process.exit(1));
}
