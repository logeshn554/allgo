import { ConfigService } from '../apps/api/dist/config/config.service.js';
import { DatabaseService } from '../apps/api/dist/database/database.service.js';

async function main() {
  const config = new ConfigService();
  const db = new DatabaseService(config);
  await db.onModuleInit();

  console.log('--- 1. EXTENSIONS ---');
  const exts = await db.query(
    `SELECT extname, extversion FROM pg_extension WHERE extname IN ('pg_trgm', 'btree_gist', 'postgis');`
  );
  console.log(JSON.stringify(exts.rows, null, 2));

  console.log('--- 2. DEDICATED TABLES ---');
  const tables = await db.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name IN ('zone_service_settings', 'outlet_zone_assignments', 'customer_search_history', 'promotion_pricing_audit_logs');`
  );
  console.log(JSON.stringify(tables.rows.map((r: any) => r.table_name), null, 2));

  console.log('--- 3. EXTENDED COUPONS COLUMNS ---');
  const couponCols = await db.query(
    `SELECT column_name, data_type, is_nullable FROM information_schema.columns
     WHERE table_name = 'coupons'
       AND column_name IN ('is_auto_applied', 'new_customer_only', 'max_total_redemptions', 'total_redeemed_count', 'outlet_id', 'category_id', 'title');`
  );
  console.log(JSON.stringify(couponCols.rows, null, 2));

  console.log('--- 4. TRIGRAM & SEARCH INDEXES ---');
  const indexes = await db.query(
    `SELECT tablename, indexname FROM pg_indexes WHERE indexname LIKE '%trgm%' OR indexname LIKE '%barcode%';`
  );
  console.log(JSON.stringify(indexes.rows, null, 2));

  console.log('--- 5. LIVE SPATIAL POINT-IN-POLYGON RESOLUTION ---');
  const spatialRes = await db.query(
    `SELECT z.id, z.name, z.code,
            zss.vertical_type, zss.base_delivery_fee_inr, zss.per_km_fee_inr,
            zss.free_delivery_distance_km, zss.surge_multiplier, zss.is_surge_active
     FROM zones z
     JOIN zone_service_settings zss ON zss.zone_id = z.id AND zss.vertical_type = 'FOOD'
     WHERE z.is_active = TRUE
       AND ST_Contains(z.polygon, ST_SetSRID(ST_MakePoint(80.2150, 13.0850), 4326))
     LIMIT 1;`
  );
  console.log(JSON.stringify(spatialRes.rows, null, 2));

  await db.onModuleDestroy();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
