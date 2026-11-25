import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { UpdatePartnerModeDto } from '../dto/mobility.dto.js';
import { PartnerContinuityExtensionService } from '../partner-continuity-extension.service.js';
import { PartnerContinuityService } from '../partner-continuity.service.js';

@Controller('v1/partner/continuity')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PARTNER')
export class PartnerContinuityController {
  constructor(
    private readonly continuityService: PartnerContinuityService,
    private readonly extensionService: PartnerContinuityExtensionService,
  ) {}

  @Get('mode')
  async getMode(@Request() req: any) {
    const partner = await this.continuityService.getPartnerByUserId(req.user.userId);
    return this.continuityService.getPartnerMode(partner.id);
  }

  @Post('mode')
  async updateMode(@Request() req: any, @Body() dto: UpdatePartnerModeDto) {
    return this.continuityService.updatePartnerMode(req.user.userId, dto.mode);
  }

  @Get('unified-earnings')
  async getUnifiedEarnings(@Request() req: any) {
    return this.extensionService.getUnifiedEarnings(req.user.userId);
  }

  @Get('next-job-near-drop')
  async getNextJobNearDrop(
    @Request() req: any,
    @Query('lat') lat: string,
    @Query('lon') lon: string,
    @Query('radiusKm') radiusKm?: string,
  ) {
    const partner = await this.continuityService.getPartnerByUserId(req.user.userId);
    return this.extensionService.findNextJobNearLastDrop(
      partner.id,
      Number.parseFloat(lat),
      Number.parseFloat(lon),
      radiusKm ? Number.parseFloat(radiusKm) : 3.0,
    );
  }
}
