import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { PartnerContinuityService } from '../partner-continuity.service.js';
import { UpdatePartnerModeDto } from '../dto/mobility.dto.js';

@Controller('v1/partner/continuity')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PARTNER')
export class PartnerContinuityController {
  constructor(private readonly continuityService: PartnerContinuityService) {}

  @Get('mode')
  async getMode(@Request() req: any) {
    const partner = await this.continuityService.getPartnerByUserId(req.user.userId);
    return this.continuityService.getPartnerMode(partner.id);
  }

  @Post('mode')
  async updateMode(@Request() req: any, @Body() dto: UpdatePartnerModeDto) {
    return this.continuityService.updatePartnerMode(req.user.userId, dto.mode);
  }
}
