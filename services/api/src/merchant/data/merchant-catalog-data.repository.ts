import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { CreateProductDto } from '../dto/create-product.dto.js';

@Injectable()
export class MerchantCatalogDataRepository {
  constructor(private readonly db: DatabaseService) {}

  async findOrCreateCatalog(
    outletId: string,
    outletName: string,
    verticalType: string,
  ): Promise<string> {
    const catRes = await this.db.query('SELECT id FROM catalogs WHERE outlet_id = $1 LIMIT 1;', [
      outletId,
    ]);
    if (catRes.rows.length > 0) {
      return catRes.rows[0].id;
    }
    const newCatRes = await this.db.query(
      `INSERT INTO catalogs (outlet_id, name, vertical_type, is_active) VALUES ($1, $2, $3, TRUE) RETURNING id;`,
      [outletId, `${outletName} Catalog`, verticalType],
    );
    return newCatRes.rows[0].id;
  }

  async findCategories(outletId: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT c.* FROM categories c
       JOIN catalogs cat ON cat.id = c.catalog_id
       WHERE cat.outlet_id = $1 AND c.is_active = TRUE
       ORDER BY c.display_order ASC, c.created_at ASC;`,
      [outletId],
    );
    return res.rows;
  }

  async findOrCreateCategory(catalogId: string, categoryName: string): Promise<string> {
    const categoryRes = await this.db.query(
      'SELECT id FROM categories WHERE catalog_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1;',
      [catalogId, categoryName.trim()],
    );
    if (categoryRes.rows.length > 0) {
      return categoryRes.rows[0].id;
    }
    const newCatRes = await this.db.query(
      'INSERT INTO categories (catalog_id, name, display_order, is_active) VALUES ($1, $2, 0, TRUE) RETURNING id;',
      [catalogId, categoryName.trim()],
    );
    return newCatRes.rows[0].id;
  }

  async listProducts(outletId: string, categoryId?: string, search?: string): Promise<any[]> {
    let query = `
      SELECT i.*, c.name as category_name, inv.stock_quantity, inv.is_in_stock, inv.low_stock_threshold
      FROM items i
      JOIN categories c ON c.id = i.category_id
      JOIN catalogs cat ON cat.id = c.catalog_id
      LEFT JOIN inventory inv ON inv.item_id = i.id AND inv.outlet_id = cat.outlet_id
      WHERE cat.outlet_id = $1 AND i.is_active = TRUE
    `;
    const params: any[] = [outletId];

    if (categoryId) {
      params.push(categoryId);
      query += ` AND i.category_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND LOWER(i.name) LIKE $${params.length}`;
    }

    query += ` ORDER BY c.display_order ASC, i.name ASC;`;
    const res = await this.db.query(query, params);
    return res.rows;
  }

  async insertItem(categoryId: string, dto: CreateProductDto): Promise<any> {
    const itemRes = await this.db.query(
      `INSERT INTO items (
         category_id, name, description, base_price_inr, is_veg, is_perishable,
         preparation_time_minutes, image_url, is_active
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
       RETURNING *;`,
      [
        categoryId,
        dto.name,
        dto.description || null,
        dto.basePriceInr,
        dto.isVeg,
        dto.isPerishable ?? false,
        dto.preparationTimeMinutes ?? 15,
        dto.imageUrl || null,
      ],
    );
    return itemRes.rows[0];
  }

  async upsertInventory(
    outletId: string,
    itemId: string,
    stockQuantity: number,
    isInStock: boolean,
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO inventory (outlet_id, item_id, stock_quantity, is_in_stock, low_stock_threshold)
       VALUES ($1, $2, $3, $4, 5)
       ON CONFLICT (outlet_id, item_id) DO UPDATE SET stock_quantity = $3, is_in_stock = $4;`,
      [outletId, itemId, stockQuantity, isInStock],
    );
  }

  async checkProductBelongsToOutlet(productId: string, outletId: string): Promise<boolean> {
    const itemCheck = await this.db.query(
      `SELECT i.id FROM items i
       JOIN categories c ON c.id = i.category_id
       JOIN catalogs cat ON cat.id = c.catalog_id
       WHERE i.id = $1 AND cat.outlet_id = $2;`,
      [productId, outletId],
    );
    return itemCheck.rows.length > 0;
  }

  async updateItem(productId: string, updates: Record<string, any>): Promise<any> {
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
      params,
    );
    if (res.rows.length === 0) throw new NotFoundException('Product not found');
    return res.rows[0];
  }

  async softDeleteItem(productId: string): Promise<void> {
    await this.db.query('UPDATE items SET is_active = FALSE, updated_at = NOW() WHERE id = $1;', [
      productId,
    ]);
  }

  async updateInventoryFields(
    outletId: string,
    itemId: string,
    updates: Record<string, any>,
  ): Promise<any> {
    const clauses: string[] = ['updated_at = NOW()'];
    const params: any[] = [];

    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) {
        params.push(val);
        clauses.push(`${key} = $${params.length}`);
      }
    }

    params.push(outletId, itemId);
    const res = await this.db.query(
      `UPDATE inventory
       SET ${clauses.join(', ')}
       WHERE outlet_id = $${params.length - 1} AND item_id = $${params.length}
       RETURNING *;`,
      params,
    );
    return res.rows[0];
  }
}
