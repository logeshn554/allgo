import { DatabaseService } from '../../database/database.service.js';

export async function recordStoreView(
  db: DatabaseService,
  customerId: string,
  outletId: string,
): Promise<void> {
  try {
    await db.query(
      `CREATE TABLE IF NOT EXISTS customer_outlet_views (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         customer_id UUID NOT NULL,
         outlet_id UUID NOT NULL,
         viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
         CONSTRAINT uq_customer_outlet_view UNIQUE (customer_id, outlet_id)
       );`,
    );
    await db.query(
      `INSERT INTO customer_outlet_views (customer_id, outlet_id, viewed_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (customer_id, outlet_id) DO UPDATE SET viewed_at = NOW();`,
      [customerId, outletId],
    );
  } catch {
    // safe fallback
  }
}

export async function getRecentlyViewedStores(
  db: DatabaseService,
  customerId: string,
): Promise<any[]> {
  try {
    await db.query(
      `CREATE TABLE IF NOT EXISTS customer_outlet_views (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         customer_id UUID NOT NULL,
         outlet_id UUID NOT NULL,
         viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
         CONSTRAINT uq_customer_outlet_view UNIQUE (customer_id, outlet_id)
       );`,
    );
    const res = await db.query(
      `SELECT o.id, o.merchant_id, o.outlet_name, o.address_line1 as address, o.phone,
              o.outlet_status, o.is_open,
              ST_Y(o.location::geometry) as latitude,
              ST_X(o.location::geometry) as longitude,
              m.business_name, m.merchant_type,
              v.viewed_at
       FROM customer_outlet_views v
       JOIN outlets o ON o.id = v.outlet_id
       JOIN merchants m ON m.id = o.merchant_id
       WHERE v.customer_id = $1
       ORDER BY v.viewed_at DESC
       LIMIT 10;`,
      [customerId],
    );
    return res.rows;
  } catch {
    return [];
  }
}

export async function toggleFavoriteStore(
  db: DatabaseService,
  customerId: string,
  outletId: string,
): Promise<{ isFavorite: boolean }> {
  try {
    await db.query(
      `CREATE TABLE IF NOT EXISTS customer_favorite_outlets (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         customer_id UUID NOT NULL,
         outlet_id UUID NOT NULL,
         created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
         CONSTRAINT uq_customer_fav_outlet UNIQUE (customer_id, outlet_id)
       );`,
    );
    const existing = await db.query(
      `SELECT id FROM customer_favorite_outlets WHERE customer_id = $1 AND outlet_id = $2;`,
      [customerId, outletId],
    );
    if (existing.rows.length > 0) {
      await db.query(
        `DELETE FROM customer_favorite_outlets WHERE customer_id = $1 AND outlet_id = $2;`,
        [customerId, outletId],
      );
      return { isFavorite: false };
    } else {
      await db.query(
        `INSERT INTO customer_favorite_outlets (customer_id, outlet_id) VALUES ($1, $2);`,
        [customerId, outletId],
      );
      return { isFavorite: true };
    }
  } catch {
    return { isFavorite: false };
  }
}

export async function getFavoriteStores(db: DatabaseService, customerId: string): Promise<any[]> {
  try {
    await db.query(
      `CREATE TABLE IF NOT EXISTS customer_favorite_outlets (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         customer_id UUID NOT NULL,
         outlet_id UUID NOT NULL,
         created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
         CONSTRAINT uq_customer_fav_outlet UNIQUE (customer_id, outlet_id)
       );`,
    );
    const res = await db.query(
      `SELECT o.id, o.merchant_id, o.outlet_name, o.address_line1 as address, o.phone,
              o.outlet_status, o.is_open,
              ST_Y(o.location::geometry) as latitude,
              ST_X(o.location::geometry) as longitude,
              m.business_name, m.merchant_type,
              f.created_at as favorited_at
       FROM customer_favorite_outlets f
       JOIN outlets o ON o.id = f.outlet_id
       JOIN merchants m ON m.id = o.merchant_id
       WHERE f.customer_id = $1
       ORDER BY f.created_at DESC
       LIMIT 20;`,
      [customerId],
    );
    return res.rows;
  } catch {
    return [];
  }
}
