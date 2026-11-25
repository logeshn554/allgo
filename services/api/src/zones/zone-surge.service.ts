import { BadRequestException, Injectable } from '@nestjs/common';
import { ZoneSettingsRepository } from './data/zone-settings.repository.js';
import { ZoneRepository } from './data/zone.repository.js';
import { UpdateSurgeDto, ZoneServiceSettingDto } from './dto/zones.dto.js';

@Injectable()
export class ZoneSurgeService {
  constructor(
    private readonly zoneRepo: ZoneRepository,
    private readonly settingsRepo: ZoneSettingsRepository,
  ) {}

  async upsertZoneServiceSettings(
    zoneId: string,
    settings: ZoneServiceSettingDto,
    adminUserId?: string,
  ): Promise<any> {
    const existing = await this.settingsRepo.findByZoneAndVertical(zoneId, settings.verticalType);
    const updated = await this.settingsRepo.upsertSettings(zoneId, settings);

    if (adminUserId) {
      await this.zoneRepo.recordAuditLog(
        adminUserId,
        'DYNAMIC_PRICING',
        zoneId,
        'UPDATED',
        existing[0] || null,
        updated,
        'Zone service settings modified',
      );
    }

    return updated;
  }

  async updateSurgePricing(zoneId: string, dto: UpdateSurgeDto, adminUserId: string): Promise<any> {
    if (dto.surgeMultiplier < 1.0 || dto.surgeMultiplier > 3.0) {
      throw new BadRequestException('Surge multiplier must be between 1.00x and 3.00x');
    }
    if (!dto.reason || dto.reason.trim().length === 0) {
      throw new BadRequestException('Reason is mandatory for any surge pricing change');
    }

    const prevRes = await this.settingsRepo.findByZoneAndVertical(zoneId, dto.verticalType);
    const updatedRows = await this.settingsRepo.updateSurge(
      zoneId,
      dto.surgeMultiplier,
      dto.isSurgeActive,
      dto.reason.trim(),
      dto.surgeExpiresAt ? new Date(dto.surgeExpiresAt) : null,
      dto.verticalType,
    );

    await this.zoneRepo.recordAuditLog(
      adminUserId,
      'ZONE_SURGE',
      zoneId,
      dto.isSurgeActive ? 'SURGE_ACTIVATED' : 'SURGE_DEACTIVATED',
      prevRes,
      updatedRows,
      dto.reason.trim(),
    );

    return updatedRows;
  }
}
