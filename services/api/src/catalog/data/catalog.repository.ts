import { ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

@Injectable()
export class CatalogRepository {
  constructor(private readonly db: DatabaseService) {}

  async verifyOutletOwnership(
    userId: string,
    outletId: string,
  ): Promise<{ merchantId: string; outletId: string }> {
    const res = await this.db.query(
      `SELECT o.id as outlet_id, o.merchant_id, o.outlet_status, m.status as merchant_status
       FROM outlets o
       JOIN merchants m ON m.id = o.merchant_id
       WHERE o.id = $1 AND m.owner_id = $2;`,
      [outletId, userId],
    );
    if (res.rows.length === 0) {
      throw new ForbiddenException(`Outlet ${outletId} not found or not owned by user`);
    }
    return {
      merchantId: res.rows[0].merchant_id,
      outletId: res.rows[0].outlet_id,
    };
  }

  async verifyProductOwnership(
    userId: string,
    productId: string,
  ): Promise<{ productId: string; outletId: string; merchantId: string }> {
    const res = await this.db.query(
      `SELECT i.id as product_id, cat.outlet_id, o.merchant_id
       FROM items i
       JOIN categories c ON c.id = i.category_id
       JOIN catalogs cat ON cat.id = c.catalog_id
       JOIN outlets o ON o.id = cat.outlet_id
       JOIN merchants m ON m.id = o.merchant_id
       WHERE i.id = $1 AND m.owner_id = $2;`,
      [productId, userId],
    );
    if (res.rows.length === 0) {
      throw new ForbiddenException(`Product ${productId} not found or not owned by user`);
    }
    return {
      productId: res.rows[0].product_id,
      outletId: res.rows[0].outlet_id,
      merchantId: res.rows[0].merchant_id,
    };
  }

  async findCatalogByOutletId(outletId: string): Promise<string | null> {
    const res = await this.db.query('SELECT id FROM catalogs WHERE outlet_id = $1 LIMIT 1;', [
      outletId,
    ]);
    return res.rows.length > 0 ? res.rows[0].id : null;
  }

  async getOutletMerchantType(
    outletId: string,
  ): Promise<{ outletName: string; merchantType: string }> {
    const outRes = await this.db.query(
      `SELECT o.outlet_name, m.merchant_type
       FROM outlets o
       JOIN merchants m ON m.id = o.merchant_id
       WHERE o.id = $1;`,
      [outletId],
    );
    return {
      outletName: outRes.rows[0]?.outlet_name || 'Outlet',
      merchantType: outRes.rows[0]?.merchant_type || 'RESTAURANT',
    };
  }

  async createCatalog(outletId: string, name: string, verticalType: string): Promise<string> {
    const ins = await this.db.query(
      `INSERT INTO catalogs (outlet_id, name, vertical_type, is_active)
       VALUES ($1, $2, $3, TRUE) RETURNING id;`,
      [outletId, name, verticalType],
    );
    return ins.rows[0].id;
  }

  async findFirstCatalogId(): Promise<string | null> {
    const catRes = await this.db.query(`SELECT id FROM catalogs ORDER BY created_at ASC LIMIT 1;`);
    return catRes.rows.length > 0 ? catRes.rows[0].id : null;
  }

  async getOrCreateOutletCatalog(outletId: string): Promise<string> {
    const existing = await this.findCatalogByOutletId(outletId);
    if (existing) return existing;
    const { outletName, merchantType } = await this.getOutletMerchantType(outletId);
    const vertical =
      merchantType === 'GROCERY_STORE' || merchantType === 'DARK_STORE' ? 'GROCERY' : 'FOOD';
    return this.createCatalog(outletId, `${outletName} Catalog`, vertical);
  }
}
