import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

@Injectable()
export class OverrideRepository {
  constructor(private readonly db: DatabaseService) {}

  async upsertOverride(outletId: string, productId: string, customPriceInr: number | null, isAvailable: boolean): Promise<any> {
    const res = await this.db.query(
      `INSERT INTO outlet_item_overrides (outlet_id, item_id, custom_price_inr, is_available)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (outlet_id, item_id) DO UPDATE
       SET custom_price_inr = COALESCE($3, outlet_item_overrides.custom_price_inr),
           is_available = COALESCE($4, outlet_item_overrides.is_available),
           updated_at = NOW()
       RETURNING *;`,
      [outletId, productId, customPriceInr, isAvailable]
    );
    return res.rows[0];
  }

  async findOverridesByOutlet(outletId: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT oio.*, i.name as product_name, i.base_price_inr
       FROM outlet_item_overrides oio
       JOIN items i ON i.id = oio.item_id
       WHERE oio.outlet_id = $1;`,
      [outletId]
    );
    return res.rows;
  }

  async deleteOverride(outletId: string, productId: string): Promise<void> {
    await this.db.query('DELETE FROM outlet_item_overrides WHERE outlet_id = $1 AND item_id = $2;', [outletId, productId]);
  }

  async findInventory(productId: string, outletId: string): Promise<any> {
    const res = await this.db.query('SELECT stock_quantity, is_in_stock FROM inventory WHERE item_id = $1 AND outlet_id = $2;', [
      productId,
      outletId,
    ]);
    return res.rows[0] || null;
  }

  async findOutletOverride(productId: string, outletId: string): Promise<any> {
    const res = await this.db.query('SELECT custom_price_inr, is_available FROM outlet_item_overrides WHERE item_id = $1 AND outlet_id = $2;', [
      productId,
      outletId,
    ]);
    return res.rows[0] || null;
  }

  async upsertStock(outletId: string, productId: string, stockQuantity: number, lowStockThreshold: number): Promise<any> {
    const res = await this.db.query(
      `INSERT INTO inventory (outlet_id, item_id, stock_quantity, is_in_stock, low_stock_threshold, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (outlet_id, item_id) DO UPDATE
       SET stock_quantity = $3,
           is_in_stock = $4,
           low_stock_threshold = COALESCE($5, inventory.low_stock_threshold),
           updated_at = NOW()
       RETURNING *;`,
      [outletId, productId, stockQuantity, stockQuantity > 0, lowStockThreshold]
    );
    return res.rows[0];
  }

  async recordStockAudit(productId: string, userId: string, outletId: string, stockQuantity: number): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO audit_logs (entity_type, entity_id, actor_id, action, new_state, reason)
         VALUES ('INVENTORY', $1, $2, 'UPDATE_STOCK', $3, 'Merchant stock adjustment');`,
        [productId, userId, JSON.stringify({ outletId, stockQuantity })]
      );
    } catch {}
  }

  async findStockHistory(productId: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT id, entity_type, entity_id, actor_id, action, new_state, reason, created_at
       FROM audit_logs
       WHERE entity_type = 'INVENTORY' AND entity_id = $1
       ORDER BY created_at DESC
       LIMIT 50;`,
      [productId]
    );
    return res.rows;
  }
}
