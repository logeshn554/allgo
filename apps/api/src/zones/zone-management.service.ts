import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ZoneRepository } from './data/zone.repository.js';
import { ZoneSettingsRepository } from './data/zone-settings.repository.js';
import {
  CreateZoneDto,
  UpdateZoneDto,
  ZoneServiceSettingDto,
} from './dto/zones.dto.js';

@Injectable()
export class ZoneManagementService {
  constructor(
    private readonly zoneRepo: ZoneRepository,
    private readonly settingsRepo: ZoneSettingsRepository,
  ) {}

  public normalizePolygonGeoJson(input: any): any {
    let geojson = input;
    if (typeof input === 'string') {
      try {
        geojson = JSON.parse(input);
      } catch {
        throw new BadRequestException('Invalid GeoJSON string format');
      }
    }

    if (Array.isArray(geojson)) {
      geojson = {
        type: 'Polygon',
        coordinates: Array.isArray(geojson[0][0]) ? geojson : [geojson],
      };
    }

    if (!geojson || geojson.type !== 'Polygon' || !Array.isArray(geojson.coordinates)) {
      throw new BadRequestException('GeoJSON must be a valid Polygon geometry');
    }

    const ring = geojson.coordinates[0];
    if (!ring || ring.length < 3) {
      throw new BadRequestException('Polygon ring must contain at least 3 distinct coordinates');
    }

    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      geojson.coordinates[0] = [...ring, [first[0], first[1]]];
    }

    if (geojson.coordinates[0].length < 4) {
      throw new BadRequestException('Closed polygon ring must contain at least 4 coordinates');
    }

    return geojson;
  }

  async createZone(dto: CreateZoneDto, adminUserId?: string): Promise<any> {
    const geojson = this.normalizePolygonGeoJson(dto.polygonGeoJson);
    const geojsonStr = JSON.stringify(geojson);

    const validity = await this.zoneRepo.validateGeometry(geojsonStr);
    if (!validity.isValid) {
      throw new BadRequestException(
        `Invalid polygon geometry: ${validity.reason || 'Self-intersecting or malformed geometry'}`
      );
    }

    const zone = await this.zoneRepo.insertZone(
      dto.cityId,
      dto.name.trim(),
      dto.code.trim().toUpperCase(),
      geojsonStr
    );

    const verticals = ['FOOD', 'GROCERY', 'PARCEL', 'RIDE', 'HIRE_DRIVER', 'HOME_MADE'];
    const settingsMap = new Map<string, ZoneServiceSettingDto>();
    if (dto.serviceSettings && Array.isArray(dto.serviceSettings)) {
      for (const s of dto.serviceSettings) {
        settingsMap.set(s.verticalType, s);
      }
    }

    await this.settingsRepo.insertDefaultSettings(zone.id, verticals, settingsMap);

    if (adminUserId) {
      await this.zoneRepo.recordAuditLog(
        adminUserId,
        'SERVICE_ZONE',
        zone.id,
        'CREATED',
        undefined,
        zone,
        'Initial service zone creation'
      );
    }

    return this.getZoneById(zone.id);
  }

  async getZones(cityId?: string, isActive?: boolean): Promise<any[]> {
    return this.zoneRepo.findAll(cityId, isActive);
  }

  async getZoneById(zoneId: string): Promise<any> {
    const zone = await this.zoneRepo.findById(zoneId);
    if (!zone) {
      throw new NotFoundException(`Zone ${zoneId} not found`);
    }

    zone.serviceSettings = await this.settingsRepo.findByZoneId(zoneId);
    zone.assignedOutlets = await this.settingsRepo.findAssignedOutlets(zoneId);

    return zone;
  }

  async updateZone(zoneId: string, dto: UpdateZoneDto, adminUserId?: string): Promise<any> {
    const existing = await this.getZoneById(zoneId);
    let polygonSql = '';
    const params: any[] = [zoneId];

    if (dto.polygonGeoJson) {
      const geojson = this.normalizePolygonGeoJson(dto.polygonGeoJson);
      const geojsonStr = JSON.stringify(geojson);

      const validity = await this.zoneRepo.validateGeometry(geojsonStr);
      if (!validity.isValid) {
        throw new BadRequestException(
          `Invalid polygon geometry: ${validity.reason || 'Malformed geometry'}`
        );
      }

      params.push(geojsonStr);
      polygonSql = `, polygon = ST_SetSRID(ST_GeomFromGeoJSON($${params.length}), 4326)`;
    }

    if (dto.name) {
      params.push(dto.name.trim());
      polygonSql += `, name = $${params.length}`;
    }
    if (dto.code) {
      params.push(dto.code.trim().toUpperCase());
      polygonSql += `, code = $${params.length}`;
    }
    if (dto.isActive !== undefined) {
      params.push(dto.isActive);
      polygonSql += `, is_active = $${params.length}`;
    }

    const updatedZone = await this.zoneRepo.updateZone(polygonSql, params);

    if (adminUserId) {
      await this.zoneRepo.recordAuditLog(
        adminUserId,
        'SERVICE_ZONE',
        zoneId,
        'UPDATED',
        existing,
        updatedZone,
        'Zone geometry/attributes updated'
      );
    }

    return this.getZoneById(zoneId);
  }

  async assignOutletsToZone(zoneId: string, outletIds: string[], isPrimary = false): Promise<any> {
    await this.settingsRepo.assignOutlets(zoneId, outletIds, isPrimary);
    return { success: true, assignedCount: outletIds.length };
  }
}
