import { DatabaseService } from '../../database/database.service.js';

export async function querySuggestionItems(
  db: DatabaseService,
  rawQ: string,
  verticalType?: string,
): Promise<any[]> {
  const res = await db.query(
    `SELECT DISTINCT i.id, i.name as text, 'ITEM' as type
     FROM items i
     JOIN categories cat ON cat.id = i.category_id
     JOIN catalogs c ON c.id = cat.catalog_id
     JOIN outlets o ON o.id = c.outlet_id
     JOIN merchants m ON m.id = o.merchant_id
     WHERE i.is_active = TRUE AND i.deleted_at IS NULL
       AND COALESCE(o.outlet_status, 'ACTIVE') = 'ACTIVE'
       AND m.status IN ('APPROVED', 'LIVE')
       AND (i.name ILIKE ('%' || $1 || '%') OR similarity(i.name, $1) > 0.2)
       ${verticalType ? 'AND c.vertical_type = $2' : ''}
     LIMIT 5;`,
    verticalType ? [rawQ, verticalType] : [rawQ],
  );
  return res.rows;
}

export async function querySuggestionOutlets(db: DatabaseService, rawQ: string): Promise<any[]> {
  const res = await db.query(
    `SELECT DISTINCT o.id, o.outlet_name as text, 'OUTLET' as type
     FROM outlets o
     JOIN merchants m ON m.id = o.merchant_id
     WHERE COALESCE(o.outlet_status, 'ACTIVE') = 'ACTIVE'
       AND m.status IN ('APPROVED', 'LIVE')
       AND (o.outlet_name ILIKE ('%' || $1 || '%') OR similarity(o.outlet_name, $1) > 0.2)
     LIMIT 3;`,
    [rawQ],
  );
  return res.rows;
}

export async function querySuggestionCategories(
  db: DatabaseService,
  rawQ: string,
  verticalType?: string,
): Promise<any[]> {
  const res = await db.query(
    `SELECT DISTINCT cat.id, cat.name as text, 'CATEGORY' as type
     FROM categories cat
     JOIN catalogs c ON c.id = cat.catalog_id
     JOIN outlets o ON o.id = c.outlet_id
     JOIN merchants m ON m.id = o.merchant_id
     WHERE cat.is_active = TRUE
       AND COALESCE(o.outlet_status, 'ACTIVE') = 'ACTIVE'
       AND m.status IN ('APPROVED', 'LIVE')
       AND (cat.name ILIKE ('%' || $1 || '%') OR similarity(cat.name, $1) > 0.2)
       ${verticalType ? 'AND c.vertical_type = $2' : ''}
     LIMIT 2;`,
    verticalType ? [rawQ, verticalType] : [rawQ],
  );
  return res.rows;
}
