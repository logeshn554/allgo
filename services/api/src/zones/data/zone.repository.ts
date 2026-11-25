import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

@Injectable()
export class ZoneRepository {
  constructor(private readonly db: DatabaseService) {}

  async validateGeometry(geojsonStr: string): Promise<{ isValid: boolean; reason?: string }> {
    const validityRes = await this.db.query(
      `SELECT ST_IsValid(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)) as is_valid,
              ST_IsValidReason(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)) as reason;`,
      [geojsonStr],
    );
    return {
      isValid: Boolean(validityRes.rows[0]?.is_valid),
      reason: validityRes.rows[0]?.reason,
    };
  }

  async insertZone(cityId: string, name: string, code: string, geojsonStr: string): Promise<any> {
    const insertRes = await this.db.query(
      `INSERT INTO zones (city_id, name, code, polygon, is_active)
       VALUES ($1, $2, $3, ST_SetSRID(ST_GeomFromGeoJSON($4), 4326), TRUE)
       RETURNING id, city_id, name, code, is_active, ST_AsGeoJSON(polygon)::json as polygon, created_at, updated_at;`,
      [cityId, name, code, geojsonStr],
    );
    return insertRes.rows[0];
  }

  async findAll(cityId?: string, isActive?: boolean): Promise<any[]> {
    let query = `
      SELECT z.id, z.city_id, z.name, z.code, z.is_active,
             ST_AsGeoJSON(z.polygon)::json as polygon,
             ST_Area(z.polygon::geography) / 1000000.0 as area_sq_km,
             z.created_at, z.updated_at,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', zss.id,
                   'verticalType', zss.vertical_type,
                   'isServiceEnabled', zss.is_service_enabled,
                   'minOrderValueInr', zss.min_order_value_inr,
                   'baseDeliveryFeeInr', zss.base_delivery_fee_inr,
                   'perKmFeeInr', zss.per_km_fee_inr,
                   'freeDeliveryDistanceKm', zss.free_delivery_distance_km,
                   'maxServiceRadiusKm', zss.max_service_radius_km,
                   'surgeMultiplier', zss.surge_multiplier,
                   'surgeReason', zss.surge_reason,
                   'isSurgeActive', zss.is_surge_active,
                   'surgeExpiresAt', zss.surge_expires_at,
                   'priority', zss.priority
                 )
               ) FILTER (WHERE zss.id IS NOT NULL), '[]'::json
             ) as service_settings
      FROM zones z
      LEFT JOIN zone_service_settings zss ON zss.zone_id = z.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (cityId) {
      params.push(cityId);
      query += ` AND z.city_id = $${params.length}`;
    }
    if (isActive !== undefined) {
      params.push(isActive);
      query += ` AND z.is_active = $${params.length}`;
    }
    query += ` GROUP BY z.id ORDER BY z.name ASC;`;

    const res = await this.db.query(query, params);
    return res.rows;
  }

  async findById(zoneId: string): Promise<any> {
    const res = await this.db.query(
      `SELECT z.id, z.city_id, z.name, z.code, z.is_active,
              ST_AsGeoJSON(z.polygon)::json as polygon,
              ST_Area(z.polygon::geography) / 1000000.0 as area_sq_km,
              z.created_at, z.updated_at
       FROM zones z
       WHERE z.id = $1;`,
      [zoneId],
    );
    return res.rows[0] || null;
  }

  async updateZone(polygonSql: string, params: any[]): Promise<any> {
    const query = `
      UPDATE zones
      SET updated_at = NOW() ${polygonSql}
      WHERE id = $1
      RETURNING id, name, code, is_active, ST_AsGeoJSON(polygon)::json as polygon;
    `;
    const res = await this.db.query(query, params);
    return res.rows[0];
  }

  async findZoneContainingPoint(lng: number, lat: number, verticalType: string): Promise<any> {
    const zoneQuery = `
      SELECT z.id as zone_id, z.name as zone_name, z.code as zone_code, z.city_id, z.is_active,
             zss.id as setting_id, zss.vertical_type, zss.is_service_enabled,
             zss.min_order_value_inr, zss.base_delivery_fee_inr, zss.per_km_fee_inr,
             zss.free_delivery_distance_km, zss.max_service_radius_km,
             zss.surge_multiplier, zss.is_surge_active, zss.surge_reason, zss.surge_expires_at,
             COALESCE(zss.priority, 0) as priority
      FROM zones z
      LEFT JOIN zone_service_settings zss ON zss.zone_id = z.id AND zss.vertical_type = $3
      WHERE z.is_active = TRUE
        AND ST_Contains(z.polygon, ST_SetSRID(ST_MakePoint($1, $2), 4326))
      ORDER BY COALESCE(zss.priority, 0) DESC, ST_Area(z.polygon) ASC
      LIMIT 1;
    `;
    const res = await this.db.query(zoneQuery, [lng, lat, verticalType]);
    return res.rows[0] || null;
  }

  async recordAuditLog(
    actorId: string,
    targetType: string,
    targetId: string,
    action: string,
    prevState?: any,
    newState?: any,
    reason?: string,
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO promotion_pricing_audit_logs (actor_id, target_type, target_id, action, previous_state, new_state, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7);`,
      [
        actorId,
        targetType,
        targetId,
        action,
        prevState ? JSON.stringify(prevState) : null,
        newState ? JSON.stringify(newState) : null,
        reason || null,
      ],
    );
  }
}
