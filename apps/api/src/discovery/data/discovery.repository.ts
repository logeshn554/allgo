import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { SearchQueryDto } from '../dto/discovery.dto.js';

@Injectable()
export class DiscoveryRepository {
  constructor(private readonly db: DatabaseService) {}

  async recordSearchHistory(customerId: string, rawQ: string, vertical: string | null, filtersJson: string): Promise<void> {
    await this.db.query(
      `INSERT INTO customer_search_history (customer_id, query_text, vertical_type, filters_applied)
       VALUES ($1, $2, $3, $4);`,
      [customerId, rawQ, vertical, filtersJson]
    );
  }

  async searchItems(dto: SearchQueryDto, rawQ: string, lat: number | null, lng: number | null, radiusKm: number, limit: number, offset: number): Promise<any[]> {
    let itemsQuery = `
      SELECT i.id, i.name, i.description, i.base_price_inr, i.is_veg, i.barcode,
             i.image_url, i.category_id,
             cat.name as category_name, c.vertical_type,
             o.id as outlet_id, o.outlet_name, o.address_line1 as outlet_address,
             COALESCE(oio.custom_price_inr, i.base_price_inr) as effective_price_inr,
             COALESCE(oio.is_available, true) as outlet_available,
             similarity(i.name, $1) as trgm_sim
    `;

    if (lat !== null && lng !== null) {
      itemsQuery += `, ROUND((ST_Distance(o.location::geography, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography) / 1000.0)::numeric, 2) as distance_km`;
    } else {
      itemsQuery += `, 0.0 as distance_km`;
    }

    itemsQuery += `
      FROM items i
      JOIN categories cat ON cat.id = i.category_id
      JOIN catalogs c ON c.id = cat.catalog_id
      JOIN outlets o ON o.id = c.outlet_id
      JOIN merchants m ON m.id = o.merchant_id
      LEFT JOIN outlet_item_overrides oio ON oio.item_id = i.id AND oio.outlet_id = o.id
      WHERE i.is_active = TRUE
        AND i.deleted_at IS NULL
        AND COALESCE(o.outlet_status, 'ACTIVE') = 'ACTIVE'
        AND m.status IN ('APPROVED', 'LIVE')
        AND (
          i.barcode = $1
          OR i.name ILIKE ('%' || $1 || '%')
          OR similarity(i.name, $1) > 0.15
          OR (i.description IS NOT NULL AND i.description ILIKE ('%' || $1 || '%'))
          OR cat.name ILIKE ('%' || $1 || '%')
        )
    `;

    const itemParams: any[] = [rawQ];
    if (lat !== null && lng !== null) {
      itemParams.push(lng, lat);
    }
    if (dto.verticalType) {
      itemParams.push(dto.verticalType);
      itemsQuery += ` AND c.vertical_type = $${itemParams.length}`;
    }
    if (dto.isVeg !== undefined && dto.isVeg) {
      itemsQuery += ` AND i.is_veg = TRUE`;
    }
    if (dto.minPrice !== undefined) {
      itemParams.push(dto.minPrice);
      itemsQuery += ` AND COALESCE(oio.custom_price_inr, i.base_price_inr) >= $${itemParams.length}`;
    }
    if (dto.maxPrice !== undefined) {
      itemParams.push(dto.maxPrice);
      itemsQuery += ` AND COALESCE(oio.custom_price_inr, i.base_price_inr) <= $${itemParams.length}`;
    }
    if (lat !== null && lng !== null && radiusKm > 0) {
      itemParams.push(radiusKm * 1000.0);
      itemsQuery += ` AND ST_Distance(o.location::geography, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography) <= $${itemParams.length}`;
    }

    if (dto.sortBy === 'distance' && lat !== null && lng !== null) {
      itemsQuery += ` ORDER BY distance_km ASC, trgm_sim DESC`;
    } else if (dto.sortBy === 'price_low_high') {
      itemsQuery += ` ORDER BY effective_price_inr ASC`;
    } else if (dto.sortBy === 'price_high_low') {
      itemsQuery += ` ORDER BY effective_price_inr DESC`;
    } else {
      itemsQuery += ` ORDER BY trgm_sim DESC, effective_price_inr ASC`;
    }

    itemsQuery += ` LIMIT $${itemParams.length + 1} OFFSET $${itemParams.length + 2};`;
    const res = await this.db.query(itemsQuery, [...itemParams, limit, offset]);
    return res.rows;
  }

  async searchOutlets(rawQ: string, lat: number | null, lng: number | null, radiusKm: number): Promise<any[]> {
    let outletsQuery = `
      SELECT o.id, o.merchant_id, o.outlet_name, o.address_line1 as address, o.phone,
             o.outlet_status, o.is_open,
             ST_Y(o.location::geometry) as latitude,
             ST_X(o.location::geometry) as longitude,
             m.business_name, m.merchant_type,
             similarity(o.outlet_name, $1) as trgm_sim
    `;
    if (lat !== null && lng !== null) {
      outletsQuery += `, ROUND((ST_Distance(o.location::geography, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography) / 1000.0)::numeric, 2) as distance_km`;
    } else {
      outletsQuery += `, 0.0 as distance_km`;
    }
    outletsQuery += `
      FROM outlets o
      JOIN merchants m ON m.id = o.merchant_id
      WHERE COALESCE(o.outlet_status, 'ACTIVE') = 'ACTIVE'
        AND m.status IN ('APPROVED', 'LIVE')
        AND (
          o.outlet_name ILIKE ('%' || $1 || '%')
          OR similarity(o.outlet_name, $1) > 0.15
          OR m.business_name ILIKE ('%' || $1 || '%')
          OR similarity(m.business_name, $1) > 0.15
        )
    `;
    const outletParams: any[] = [rawQ];
    if (lat !== null && lng !== null) {
      outletParams.push(lng, lat);
    }
    if (lat !== null && lng !== null && radiusKm > 0) {
      outletParams.push(radiusKm * 1000.0);
      outletsQuery += ` AND ST_Distance(o.location::geography, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography) <= $${outletParams.length}`;
    }
    outletsQuery += ` ORDER BY trgm_sim DESC, o.created_at DESC LIMIT 10;`;
    const res = await this.db.query(outletsQuery, outletParams);
    return res.rows;
  }

  async searchCategories(rawQ: string, vertical?: string): Promise<any[]> {
    const catQuery = `
      SELECT DISTINCT cat.id, cat.name, c.vertical_type
      FROM categories cat
      JOIN catalogs c ON c.id = cat.catalog_id
      JOIN outlets o ON o.id = c.outlet_id
      JOIN merchants m ON m.id = o.merchant_id
      WHERE cat.is_active = TRUE
        AND COALESCE(o.outlet_status, 'ACTIVE') = 'ACTIVE'
        AND m.status IN ('APPROVED', 'LIVE')
        AND (
          cat.name ILIKE ('%' || $1 || '%')
          OR similarity(cat.name, $1) > 0.15
        )
        ${vertical ? 'AND c.vertical_type = $2' : ''}
      LIMIT 10;
    `;
    const res = await this.db.query(catQuery, vertical ? [rawQ, vertical] : [rawQ]);
    return res.rows;
  }

  async getSuggestionItems(rawQ: string, verticalType?: string): Promise<any[]> {
    const res = await this.db.query(
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
      verticalType ? [rawQ, verticalType] : [rawQ]
    );
    return res.rows;
  }

  async getSuggestionOutlets(rawQ: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT DISTINCT o.id, o.outlet_name as text, 'OUTLET' as type
       FROM outlets o
       JOIN merchants m ON m.id = o.merchant_id
       WHERE COALESCE(o.outlet_status, 'ACTIVE') = 'ACTIVE'
         AND m.status IN ('APPROVED', 'LIVE')
         AND (o.outlet_name ILIKE ('%' || $1 || '%') OR similarity(o.outlet_name, $1) > 0.2)
       LIMIT 3;`,
      [rawQ]
    );
    return res.rows;
  }

  async getSuggestionCategories(rawQ: string, verticalType?: string): Promise<any[]> {
    const res = await this.db.query(
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
      verticalType ? [rawQ, verticalType] : [rawQ]
    );
    return res.rows;
  }

  async getSearchHistory(customerId: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT id, query_text, vertical_type, filters_applied, created_at
       FROM customer_search_history
       WHERE customer_id = $1
       ORDER BY created_at DESC
       LIMIT 10;`,
      [customerId]
    );
    return res.rows;
  }

  async clearSearchHistory(customerId: string): Promise<void> {
    await this.db.query(`DELETE FROM customer_search_history WHERE customer_id = $1;`, [customerId]);
  }

  async listOutlets(verticalType = 'FOOD', lat?: number, lng?: number, radiusKm = 15.0): Promise<any[]> {
    let query = `
      SELECT DISTINCT o.id, o.merchant_id, o.outlet_name, o.address_line1 as address, o.phone,
             o.outlet_status, o.is_open,
             ST_Y(o.location::geometry) as latitude,
             ST_X(o.location::geometry) as longitude,
             m.business_name, m.merchant_type
    `;
    const params: any[] = [];
    if (lat !== undefined && lng !== undefined) {
      params.push(lng, lat);
      query += `, ROUND((ST_Distance(o.location::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) / 1000.0)::numeric, 2) as distance_km`;
    } else {
      query += `, 0.0 as distance_km`;
    }
    query += `
      FROM outlets o
      JOIN merchants m ON m.id = o.merchant_id
      LEFT JOIN catalogs c ON c.outlet_id = o.id
      WHERE COALESCE(o.outlet_status, 'ACTIVE') = 'ACTIVE'
        AND m.status IN ('APPROVED', 'LIVE')
    `;
    if (verticalType) {
      params.push(verticalType);
      query += ` AND c.vertical_type = $${params.length}`;
    }
    if (lat !== undefined && lng !== undefined && radiusKm > 0) {
      params.push(radiusKm * 1000.0);
      query += ` AND ST_Distance(o.location::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) <= $${params.length}`;
      query += ` ORDER BY distance_km ASC`;
    } else {
      query += ` ORDER BY o.outlet_name ASC`;
    }
    query += ` LIMIT 50;`;
    const res = await this.db.query(query, params);
    return res.rows;
  }

  async listCategories(verticalType = 'FOOD'): Promise<any[]> {
    const res = await this.db.query(
      `SELECT DISTINCT cat.id, cat.name, cat.display_order, c.vertical_type
       FROM categories cat
       JOIN catalogs c ON c.id = cat.catalog_id
       JOIN outlets o ON o.id = c.outlet_id
       JOIN merchants m ON m.id = o.merchant_id
       WHERE cat.is_active = TRUE
         AND COALESCE(o.outlet_status, 'ACTIVE') = 'ACTIVE'
         AND m.status IN ('APPROVED', 'LIVE')
         AND c.vertical_type = $1
       ORDER BY cat.display_order ASC, cat.name ASC;`,
      [verticalType]
    );
    return res.rows;
  }
}
