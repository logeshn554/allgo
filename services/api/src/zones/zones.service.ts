import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { ZoneSettingsRepository } from './data/zone-settings.repository.js';
import { ZoneRepository } from './data/zone.repository.js';
import {
  CreateZoneDto,
  UpdateSurgeDto,
  UpdateZoneDto,
  ZoneServiceSettingDto,
} from './dto/zones.dto.js';
import { ZoneManagementService } from './zone-management.service.js';
import { ZoneServiceabilityService } from './zone-serviceability.service.js';
import { ZoneSurgeService } from './zone-surge.service.js';

@Injectable()
export class ZonesService {
  private readonly managementService: ZoneManagementService;
  private readonly surgeService: ZoneSurgeService;
  private readonly serviceabilityService: ZoneServiceabilityService;

  constructor(
    private readonly db: DatabaseService,
    managementService?: ZoneManagementService,
    surgeService?: ZoneSurgeService,
    serviceabilityService?: ZoneServiceabilityService,
  ) {
    if (managementService && surgeService && serviceabilityService) {
      this.managementService = managementService;
      this.surgeService = surgeService;
      this.serviceabilityService = serviceabilityService;
    } else {
      const zoneRepo = new ZoneRepository(this.db);
      const settingsRepo = new ZoneSettingsRepository(this.db);
      this.managementService = new ZoneManagementService(zoneRepo, settingsRepo);
      this.surgeService = new ZoneSurgeService(zoneRepo, settingsRepo);
      this.serviceabilityService = new ZoneServiceabilityService(zoneRepo, settingsRepo);
    }
  }

  async createZone(dto: CreateZoneDto, adminUserId?: string): Promise<any> {
    return this.managementService.createZone(dto, adminUserId);
  }

  async getZones(cityId?: string, isActive?: boolean): Promise<any[]> {
    return this.managementService.getZones(cityId, isActive);
  }

  async getZoneById(zoneId: string): Promise<any> {
    return this.managementService.getZoneById(zoneId);
  }

  async updateZone(zoneId: string, dto: UpdateZoneDto, adminUserId?: string): Promise<any> {
    return this.managementService.updateZone(zoneId, dto, adminUserId);
  }

  async upsertZoneServiceSettings(
    zoneId: string,
    settings: ZoneServiceSettingDto,
    adminUserId?: string,
  ): Promise<any> {
    return this.surgeService.upsertZoneServiceSettings(zoneId, settings, adminUserId);
  }

  async updateSurgePricing(zoneId: string, dto: UpdateSurgeDto, adminUserId: string): Promise<any> {
    return this.surgeService.updateSurgePricing(zoneId, dto, adminUserId);
  }

  async assignOutletsToZone(zoneId: string, outletIds: string[], isPrimary = false): Promise<any> {
    return this.managementService.assignOutletsToZone(zoneId, outletIds, isPrimary);
  }

  async checkServiceability(lat: number, lng: number, verticalType = 'FOOD'): Promise<any> {
    return this.serviceabilityService.checkServiceability(lat, lng, verticalType);
  }
}
