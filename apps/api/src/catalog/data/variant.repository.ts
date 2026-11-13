import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { CreateVariantDto } from '../dto/variant.dto.js';

@Injectable()
export class VariantRepository {
  constructor(private readonly db: DatabaseService) {}

  async insertVariant(productId: string, dto: CreateVariantDto): Promise<any> {
    const res = await this.db.query(
      `INSERT INTO item_variants (
         item_id, variant_name, additional_price_inr, sale_price_inr, sku,
         variant_type, display_order, is_available
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *;`,
      [
        productId,
        dto.variantName.trim(),
        dto.additionalPriceInr,
        dto.salePriceInr || null,
        dto.sku || null,
        dto.variantType || 'SIZE',
        dto.displayOrder || 0,
        dto.isAvailable ?? true,
      ]
    );
    return res.rows[0];
  }

  async findVariantsByProduct(productId: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT * FROM item_variants
       WHERE item_id = $1 AND deleted_at IS NULL
       ORDER BY display_order ASC, variant_name ASC;`,
      [productId]
    );
    return res.rows;
  }

  async findVariantItemId(variantId: string): Promise<string> {
    const varCheck = await this.db.query('SELECT item_id FROM item_variants WHERE id = $1;', [variantId]);
    if (varCheck.rows.length === 0) throw new NotFoundException('Variant not found');
    return varCheck.rows[0].item_id;
  }

  async updateVariant(variantId: string, updates: Record<string, any>): Promise<any> {
    const clauses: string[] = [];
    const params: any[] = [];

    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) {
        params.push(val);
        clauses.push(`${key} = $${params.length}`);
      }
    }

    if (clauses.length === 0) return { id: variantId };

    params.push(variantId);
    const res = await this.db.query(
      `UPDATE item_variants SET ${clauses.join(', ')} WHERE id = $${params.length} RETURNING *;`,
      params
    );
    return res.rows[0];
  }

  async softDeleteVariant(variantId: string): Promise<void> {
    await this.db.query('UPDATE item_variants SET deleted_at = NOW(), is_available = FALSE WHERE id = $1;', [variantId]);
  }
}
