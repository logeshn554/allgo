import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { CreateCategoryDto } from '../dto/category.dto.js';

@Injectable()
export class CategoryRepository {
  constructor(private readonly db: DatabaseService) {}

  async insertCategory(catalogId: string, dto: CreateCategoryDto): Promise<any> {
    const res = await this.db.query(
      `INSERT INTO categories (catalog_id, name, parent_id, display_order, image_url, description, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING *;`,
      [
        catalogId,
        dto.name.trim(),
        dto.parentId || null,
        dto.displayOrder || 0,
        dto.imageUrl || null,
        dto.description || null,
      ],
    );
    return res.rows[0];
  }

  async findCategoriesByOutlet(outletId: string, includeInactive = false): Promise<any[]> {
    const whereClause = includeInactive
      ? 'cat.outlet_id = $1'
      : 'cat.outlet_id = $1 AND c.is_active = TRUE';
    const res = await this.db.query(
      `SELECT c.*, p.name as parent_name,
              (SELECT COUNT(*) FROM items i WHERE i.category_id = c.id AND i.deleted_at IS NULL)::int as product_count
       FROM categories c
       JOIN catalogs cat ON cat.id = c.catalog_id
       LEFT JOIN categories p ON p.id = c.parent_id
       WHERE ${whereClause}
       ORDER BY c.display_order ASC, c.name ASC;`,
      [outletId],
    );
    return res.rows;
  }

  async verifyCategoryOwnership(categoryId: string, userId: string): Promise<any> {
    const catCheck = await this.db.query(
      `SELECT c.id, cat.outlet_id
       FROM categories c
       JOIN catalogs cat ON cat.id = c.catalog_id
       JOIN outlets o ON o.id = cat.outlet_id
       JOIN merchants m ON m.id = o.merchant_id
       WHERE c.id = $1 AND m.owner_id = $2;`,
      [categoryId, userId],
    );
    if (catCheck.rows.length === 0)
      throw new ForbiddenException('Category not found or access denied');
    return catCheck.rows[0];
  }

  async updateCategory(categoryId: string, updates: Record<string, any>): Promise<any> {
    const clauses: string[] = ['updated_at = NOW()'];
    const params: any[] = [];

    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) {
        params.push(val);
        clauses.push(`${key} = $${params.length}`);
      }
    }

    params.push(categoryId);
    const res = await this.db.query(
      `UPDATE categories SET ${clauses.join(', ')} WHERE id = $${params.length} RETURNING *;`,
      params,
    );
    return res.rows[0];
  }

  async softDeleteCategory(categoryId: string): Promise<void> {
    await this.db.query(
      'UPDATE categories SET is_active = FALSE, updated_at = NOW() WHERE id = $1;',
      [categoryId],
    );
  }

  async findAdminCategories(verticalType?: string): Promise<any[]> {
    let sql = `
      SELECT c.*, cat.name as catalog_name, cat.vertical_type, o.outlet_name, m.business_name,
             p.name as parent_name,
             (SELECT COUNT(*) FROM items i WHERE i.category_id = c.id AND i.deleted_at IS NULL)::int as product_count
      FROM categories c
      JOIN catalogs cat ON cat.id = c.catalog_id
      LEFT JOIN outlets o ON o.id = cat.outlet_id
      LEFT JOIN merchants m ON m.id = o.merchant_id
      LEFT JOIN categories p ON p.id = c.parent_id
    `;
    const params: any[] = [];
    if (verticalType) {
      params.push(verticalType);
      sql += ` WHERE cat.vertical_type = $${params.length}`;
    }
    sql += ` ORDER BY c.display_order ASC, c.name ASC;`;

    const res = await this.db.query(sql, params);
    return res.rows;
  }

  async insertAdminCategory(catalogId: string, dto: CreateCategoryDto): Promise<any> {
    const res = await this.db.query(
      `INSERT INTO categories (catalog_id, name, parent_id, display_order, image_url, description, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING *;`,
      [
        catalogId,
        dto.name.trim(),
        dto.parentId || null,
        dto.displayOrder || 0,
        dto.imageUrl || null,
        dto.description || null,
      ],
    );
    return res.rows[0];
  }

  async updateAdminCategory(categoryId: string, updates: Record<string, any>): Promise<any> {
    const clauses: string[] = ['updated_at = NOW()'];
    const params: any[] = [];

    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) {
        params.push(val);
        clauses.push(`${key} = $${params.length}`);
      }
    }

    params.push(categoryId);
    const res = await this.db.query(
      `UPDATE categories SET ${clauses.join(', ')} WHERE id = $${params.length} RETURNING *;`,
      params,
    );
    if (res.rows.length === 0) throw new NotFoundException('Category not found');
    return res.rows[0];
  }

  async deactivateAdminCategory(categoryId: string): Promise<any> {
    const res = await this.db.query(
      'UPDATE categories SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id;',
      [categoryId],
    );
    if (res.rows.length === 0) throw new NotFoundException('Category not found');
    return res.rows[0];
  }

  async recordCategoryAuditLog(
    categoryId: string,
    adminId: string,
    action: string,
    newState: string,
    reason: string,
  ): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO audit_logs (entity_type, entity_id, actor_id, action, new_state, reason)
         VALUES ('CATEGORY', $1, $2, $3, $4, $5);`,
        [categoryId, adminId, action, newState, reason],
      );
    } catch {}
  }
}
