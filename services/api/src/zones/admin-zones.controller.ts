import { Body, Controller, Get, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import {
  AssignOutletsDto,
  CreateZoneDto,
  UpdateSurgeDto,
  UpdateZoneDto,
  ZoneServiceSettingDto,
} from './dto/zones.dto.js';
import { ZonesService } from './zones.service.js';

@Controller('v1/admin/zones')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @Get()
  async listAllZones(@Query('cityId') cityId?: string, @Query('isActive') isActiveStr?: string) {
    const isActive = isActiveStr !== undefined ? isActiveStr === 'true' : undefined;
    return this.zonesService.getZones(cityId, isActive);
  }

  @Get(':id')
  async getZoneDetails(@Param('id') zoneId: string) {
    return this.zonesService.getZoneById(zoneId);
  }

  @Post()
  async createZone(@Request() req: any, @Body() dto: CreateZoneDto) {
    return this.zonesService.createZone(dto, req.user?.id);
  }

  @Put(':id')
  async updateZone(@Request() req: any, @Param('id') zoneId: string, @Body() dto: UpdateZoneDto) {
    return this.zonesService.updateZone(zoneId, dto, req.user?.id);
  }

  @Post(':id/settings')
  async upsertSettings(
    @Request() req: any,
    @Param('id') zoneId: string,
    @Body() dto: ZoneServiceSettingDto,
  ) {
    return this.zonesService.upsertZoneServiceSettings(zoneId, dto, req.user?.id);
  }

  @Put(':id/surge')
  async updateSurge(@Request() req: any, @Param('id') zoneId: string, @Body() dto: UpdateSurgeDto) {
    return this.zonesService.updateSurgePricing(zoneId, dto, req.user?.id);
  }

  @Post(':id/outlets')
  async assignOutlets(@Param('id') zoneId: string, @Body() dto: AssignOutletsDto) {
    return this.zonesService.assignOutletsToZone(zoneId, dto.outletIds, dto.isPrimary ?? false);
  }
}
