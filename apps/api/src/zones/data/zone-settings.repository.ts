import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { ZoneServiceSettingDto } from '../dto/zones.dto.js';

@Injectable()
export class ZoneSettingsRepository {
  constructor(private readonly db: DatabaseService) {}

  async insertDefaultSettings(
    zoneId: string,
    verticals: string[],
    settingsMap: Map<string, ZoneServiceSettingDto>
  ): Promise<void> {
    for (const v of verticals) {
      const s = settingsMap.get(v);
      await this.db.query(
        `INSERT INTO zone_service_settings (
           zone_id, vertical_type, is_service_enabled, min_order_value_inr,
           base_delivery_fee_inr, per_km_fee_inr, free_delivery_distance_km,
           max_service_radius_km, surge_multiplier, is_surge_active, priority
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (zone_id, vertical_type) DO NOTHING;`,
        [
          zoneId,
          v,
          s?.isServiceEnabled ?? true,
          s?.minOrderValueInr ?? 99.0,
          s?.baseDeliveryFeeInr ?? 30.0,
          s?.perKmFeeInr ?? 10.0,
          s?.freeDeliveryDistanceKm ?? 3.0,
          s?.maxServiceRadiusKm ?? 15.0,
          s?.surgeMultiplier ?? 1.0,
          s?.isSurgeActive ?? false,
          s?.priority ?? 0,
        ]
      );
    }
  }

  async findByZoneId(zoneId: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT * FROM zone_service_settings WHERE zone_id = $1 ORDER BY vertical_type ASC;`,
      [zoneId]
    );
    return res.rows;
  }

  async findByZoneAndVertical(zoneId: string, verticalType?: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT * FROM zone_service_settings WHERE zone_id = $1 ${verticalType ? 'AND vertical_type = $2' : ''};`,
      verticalType ? [zoneId, verticalType] : [zoneId]
    );
    return res.rows;
  }

  async upsertSettings(zoneId: string, settings: ZoneServiceSettingDto): Promise<any> {
    const res = await this.db.query(
      `INSERT INTO zone_service_settings (
         zone_id, vertical_type, is_service_enabled, min_order_value_inr,
         base_delivery_fee_inr, per_km_fee_inr, free_delivery_distance_km,
         max_service_radius_km, surge_multiplier, surge_reason, is_surge_active,
         surge_expires_at, priority, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
       ON CONFLICT (zone_id, vertical_type) DO UPDATE SET
         is_service_enabled = EXCLUDED.is_service_enabled,
         min_order_value_inr = EXCLUDED.min_order_value_inr,
         base_delivery_fee_inr = EXCLUDED.base_delivery_fee_inr,
         per_km_fee_inr = EXCLUDED.per_km_fee_inr,
         free_delivery_distance_km = EXCLUDED.free_delivery_distance_km,
         max_service_radius_km = EXCLUDED.max_service_radius_km,
         surge_multiplier = EXCLUDED.surge_multiplier,
         surge_reason = EXCLUDED.surge_reason,
         is_surge_active = EXCLUDED.is_surge_active,
         surge_expires_at = EXCLUDED.surge_expires_at,
         priority = EXCLUDED.priority,
         updated_at = NOW()
       RETURNING *;`,
      [
        zoneId,
        settings.verticalType,
        settings.isServiceEnabled ?? true,
        settings.minOrderValueInr ?? 99.0,
        settings.baseDeliveryFeeInr ?? 30.0,
        settings.perKmFeeInr ?? 10.0,
        settings.freeDeliveryDistanceKm ?? 3.0,
        settings.maxServiceRadiusKm ?? 15.0,
        settings.surgeMultiplier ?? 1.0,
        settings.surgeReason ?? null,
        settings.isSurgeActive ?? false,
        settings.surgeExpiresAt ?? null,
        settings.priority ?? 0,
      ]
    );
    return res.rows[0];
  }

  async updateSurge(
    zoneId: string,
    multiplier: number,
    isActive: boolean,
    reason: string,
    expiresAt: Date | null,
    verticalType?: string
  ): Promise<any[]> {
    let updateSql = `
      UPDATE zone_service_settings
      SET surge_multiplier = $1,
          is_surge_active = $2,
          surge_reason = $3,
          surge_expires_at = $4,
          updated_at = NOW()
      WHERE zone_id = $5
    `;
    const params: any[] = [multiplier, isActive, reason.trim(), expiresAt, zoneId];

    if (verticalType) {
      params.push(verticalType);
      updateSql += ` AND vertical_type = $${params.length}`;
    }
    updateSql += ` RETURNING *;`;

    const res = await this.db.query(updateSql, params);
    return res.rows;
  }

  async assignOutlets(zoneId: string, outletIds: string[], isPrimary = false): Promise<void> {
    for (const outletId of outletIds) {
      await this.db.query(
        `INSERT INTO outlet_zone_assignments (outlet_id, zone_id, is_primary)
         VALUES ($1, $2, $3)
         ON CONFLICT (outlet_id, zone_id) DO UPDATE SET is_primary = EXCLUDED.is_primary;`,
        [outletId, zoneId, isPrimary]
      );
    }
  }

  async findAssignedOutlets(zoneId: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT o.id, o.outlet_name, o.address_line1 as address, o.outlet_status, oza.is_primary,
              ST_Y(o.location::geometry) as lat, ST_X(o.location::geometry) as lng
       FROM outlet_zone_assignments oza
       JOIN outlets o ON o.id = oza.outlet_id
       WHERE oza.zone_id = $1;`,
      [zoneId]
    );
    return res.rows;
  }

  async findEligibleOutlets(lng: number, lat: number, zoneId: string, maxRadiusKm: number): Promise<any[]> {
    const outletsQuery = `
      SELECT o.id, o.merchant_id, o.outlet_name, o.address_line1 as address, o.phone,
             o.outlet_status, o.is_open,
             ST_Y(o.location::geometry) as latitude,
             ST_X(o.location::geometry) as longitude,
             ROUND((ST_Distance(o.location::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) / 1000.0)::numeric, 2) as distance_km,
             m.business_name, m.merchant_type, m.status as merchant_status
      FROM outlets o
      JOIN merchants m ON m.id = o.merchant_id
      LEFT JOIN outlet_zone_assignments oza ON oza.outlet_id = o.id AND oza.zone_id = $3
      WHERE COALESCE(o.outlet_status, 'ACTIVE') = 'ACTIVE'
        AND m.status IN ('APPROVED', 'LIVE')
        AND (
          oza.id IS NOT NULL
          OR ST_Distance(o.location::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) <= ($4 * 1000)
        )
      ORDER BY distance_km ASC
      LIMIT 50;
    `;
    const res = await this.db.query(outletsQuery, [lng, lat, zoneId, maxRadiusKm]);
    return res.rows;
  }
}
