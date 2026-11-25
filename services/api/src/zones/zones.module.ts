import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { AdminZonesController } from './admin-zones.controller.js';
import { ZoneSettingsRepository } from './data/zone-settings.repository.js';
import { ZoneRepository } from './data/zone.repository.js';
import { ZoneManagementService } from './zone-management.service.js';
import { ZoneServiceabilityService } from './zone-serviceability.service.js';
import { ZoneSurgeService } from './zone-surge.service.js';
import { ZonesController } from './zones.controller.js';
import { ZonesService } from './zones.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ZonesController, AdminZonesController],
  providers: [
    ZoneRepository,
    ZoneSettingsRepository,
    ZoneManagementService,
    ZoneSurgeService,
    ZoneServiceabilityService,
    ZonesService,
  ],
  exports: [ZonesService, ZoneRepository, ZoneSettingsRepository],
})
export class ZonesModule {}
