import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

@Injectable()
export class PricingRepository {
  constructor(private readonly db: DatabaseService) {}

  async getOutletLocation(outletId: string): Promise<any | null> {
    const res = await this.db.query(
      `SELECT id, outlet_name, ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng
       FROM outlets WHERE id = $1;`,
      [outletId],
    );
    return res.rows[0] ?? null;
  }

  async getItemsWithOverrides(outletId: string, itemIds: string[]): Promise<any[]> {
    const res = await this.db.query(
      `SELECT i.id, i.name, i.base_price_inr, COALESCE(i.is_active, true) as is_active,
              oio.custom_price_inr as price_override_inr, oio.is_available as outlet_available
       FROM items i
       LEFT JOIN outlet_item_overrides oio ON oio.item_id = i.id AND oio.outlet_id = $1
       WHERE i.id = ANY($2::uuid[]);`,
      [outletId, itemIds],
    );
    return res.rows;
  }

  async getItemVariant(variantId: string, itemId: string): Promise<any | null> {
    const res = await this.db.query(
      `SELECT id, variant_name, additional_price_inr, is_available
       FROM item_variants WHERE id = $1 AND item_id = $2;`,
      [variantId, itemId],
    );
    return res.rows[0] ?? null;
  }

  async getItemOptions(optionIds: string[]): Promise<any[]> {
    const res = await this.db.query(
      `SELECT id, name, price_inr, is_available FROM item_options WHERE id = ANY($1::uuid[]);`,
      [optionIds],
    );
    return res.rows;
  }

  async findZoneDeliverySettings(
    longitude: number,
    latitude: number,
    verticalType = 'FOOD',
  ): Promise<any | null> {
    const res = await this.db.query(
      `SELECT z.id as zone_id, z.name as zone_name,
              zss.base_delivery_fee_inr, zss.per_km_fee_inr, zss.free_delivery_distance_km,
              zss.surge_multiplier, zss.is_surge_active, zss.surge_reason, zss.surge_expires_at
       FROM zones z
       JOIN zone_service_settings zss ON zss.zone_id = z.id AND zss.vertical_type = $3
       WHERE z.is_active = TRUE
         AND ST_Contains(z.polygon, ST_SetSRID(ST_MakePoint($1, $2), 4326))
       ORDER BY COALESCE(zss.priority, 0) DESC, ST_Area(z.polygon) ASC
       LIMIT 1;`,
      [longitude, latitude, verticalType],
    );
    return res.rows[0] ?? null;
  }
}
