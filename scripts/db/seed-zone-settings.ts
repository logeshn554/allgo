import { ConfigService } from '../../services/api/dist/config/config.service.js';
import { DatabaseService } from '../../services/api/dist/database/database.service.js';

async function seed() {
  const db = new DatabaseService(new ConfigService());
  await db.onModuleInit();

  const verticals = ['FOOD', 'GROCERY'];
  const zones = await db.query('SELECT id, code, name FROM zones;');

  for (const z of zones.rows) {
    for (const v of verticals) {
      await db.query(
        `INSERT INTO zone_service_settings (zone_id, vertical_type, is_service_enabled, min_order_value_inr, base_delivery_fee_inr, per_km_fee_inr, free_delivery_distance_km, surge_multiplier, is_surge_active)
         VALUES ($1, $2, TRUE, 99.00, 35.00, 12.00, 3.00, 1.00, FALSE)
         ON CONFLICT (zone_id, vertical_type) DO NOTHING;`,
        [z.id, v],
      );
    }
  }

  console.log(`Seeded default zone_service_settings for ${zones.rows.length} zones.`);
  await db.onModuleDestroy();
}

seed().catch(console.error);
