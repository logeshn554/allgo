import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { PartnerContinuityService } from '../partner-continuity.service.js';
import { PartnerContinuityExtensionService } from '../partner-continuity-extension.service.js';
import { UpdatePartnerModeDto } from '../dto/mobility.dto.js';

@Controller('v1/partner/continuity')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PARTNER')
export class PartnerContinuityController {
  constructor(
    private readonly continuityService: PartnerContinuityService,
    private readonly extensionService: PartnerContinuityExtensionService
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
    @Query('radiusKm') radiusKm?: string
  ) {
    const partner = await this.continuityService.getPartnerByUserId(req.user.userId);
    return this.extensionService.findNextJobNearLastDrop(
      partner.id,
      parseFloat(lat),
      parseFloat(lon),
      radiusKm ? parseFloat(radiusKm) : 3.0
    );
  }
}
