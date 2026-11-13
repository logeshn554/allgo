import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { CreateProductDto } from '../dto/product.dto.js';

@Injectable()
export class ProductRepository {
  constructor(private readonly db: DatabaseService) {}

  async getOutletAndMerchantStatus(outletId: string): Promise<any> {
    const res = await this.db.query(
      `SELECT o.outlet_status, m.status as merchant_status
       FROM outlets o
       JOIN merchants m ON m.id = o.merchant_id
       WHERE o.id = $1;`,
      [outletId]
    );
    return res.rows[0] || null;
  }

  async verifyCategoryBelongsToOutlet(categoryId: string, outletId: string): Promise<boolean> {
    const catRes = await this.db.query(
      `SELECT c.id FROM categories c
       JOIN catalogs cat ON cat.id = c.catalog_id
       WHERE c.id = $1 AND cat.outlet_id = $2;`,
      [categoryId, outletId]
    );
    return catRes.rows.length > 0;
  }

  async insertProduct(dto: CreateProductDto, productStatus: string, imagesJson: string, dietaryJson: string): Promise<any> {
    const itemRes = await this.db.query(
      `INSERT INTO items (
         category_id, name, description, base_price_inr, sale_price_inr, sku, barcode,
         is_veg, is_perishable, preparation_time_minutes, image_url, images,
         hsn_sac_code, gst_rate_percentage, display_order, product_status, admin_status,
         dietary_flags, is_active
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'APPROVED', $17, TRUE)
       RETURNING *;`,
      [
        dto.categoryId,
        dto.name.trim(),
        dto.description || null,
        dto.basePriceInr,
        dto.salePriceInr || null,
        dto.sku || null,
        dto.barcode || null,
        dto.isVeg ?? true,
        dto.isPerishable ?? false,
        dto.preparationTimeMinutes ?? 15,
        dto.imageUrl || (dto.images && dto.images[0]) || null,
        imagesJson,
        dto.hsnSacCode || null,
        dto.gstRatePercentage ?? 5.0,
        dto.displayOrder || 0,
        productStatus,
        dietaryJson,
      ]
    );
    return itemRes.rows[0];
  }

  async countProducts(baseSql: string, params: any[]): Promise<number> {
    const countRes = await this.db.query(`SELECT COUNT(*)::int as total ${baseSql};`, params);
    return countRes.rows[0]?.total || 0;
  }

  async queryProducts(dataSql: string, params: any[]): Promise<any[]> {
    const res = await this.db.query(dataSql, params);
    return res.rows;
  }

  async findProductRaw(productId: string): Promise<any> {
    const res = await this.db.query(
      `SELECT i.*, c.name as category_name, cat.outlet_id
       FROM items i
       JOIN categories c ON c.id = i.category_id
       JOIN catalogs cat ON cat.id = c.catalog_id
       WHERE i.id = $1 AND i.deleted_at IS NULL;`,
      [productId]
    );
    return res.rows[0] || null;
  }

  async findProductBasePrices(productId: string): Promise<any> {
    const res = await this.db.query('SELECT base_price_inr, sale_price_inr FROM items WHERE id = $1;', [productId]);
    return res.rows[0] || null;
  }

  async updateProduct(productId: string, updates: Record<string, any>): Promise<any> {
    const clauses: string[] = ['updated_at = NOW()'];
    const params: any[] = [];

    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) {
        params.push(val);
        clauses.push(`${key} = $${params.length}`);
      }
    }

    params.push(productId);
    const res = await this.db.query(
      `UPDATE items SET ${clauses.join(', ')} WHERE id = $${params.length} RETURNING *;`,
      params
    );
    return res.rows[0];
  }

  async archiveProduct(productId: string): Promise<any> {
    const res = await this.db.query(
      `UPDATE items
       SET product_status = 'ARCHIVED', is_active = FALSE, updated_at = NOW()
       WHERE id = $1
       RETURNING *;`,
      [productId]
    );
    return res.rows[0];
  }

  async softDeleteProduct(productId: string): Promise<void> {
    await this.db.query(
      `UPDATE items
       SET deleted_at = NOW(), is_active = FALSE, product_status = 'ARCHIVED', updated_at = NOW()
       WHERE id = $1;`,
      [productId]
    );
  }

  async moderateProduct(productId: string, adminStatus: string, rejectionReason?: string, isActive = false): Promise<any> {
    const res = await this.db.query(
      `UPDATE items
       SET admin_status = $1,
           rejection_reason = $2,
           is_active = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *;`,
      [adminStatus, rejectionReason || null, isActive, productId]
    );
    if (res.rows.length === 0) throw new NotFoundException(`Product ${productId} not found`);
    return res.rows[0];
  }

  async recordProductAuditLog(productId: string, adminId: string, action: string, newState: string, reason: string): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO audit_logs (entity_type, entity_id, actor_id, action, new_state, reason)
         VALUES ('ITEM', $1, $2, $3, $4, $5);`,
        [productId, adminId, action, newState, reason]
      );
    } catch {}
  }
}
