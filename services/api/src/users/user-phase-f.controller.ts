import { Body, Controller, ForbiddenException, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { DpdpComplianceService } from './dpdp-compliance.service.js';
import { DpdpConsentDto, DpdpDeletionRequestDto } from './dto/dpdp.dto.js';
import { ApplyReferralDto } from './dto/referral.dto.js';
import { ReferralService } from './referral.service.js';

@ApiTags('users-phase-f')
@Controller('v1/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UserPhaseFController {
  constructor(
    private readonly referralService: ReferralService,
    private readonly dpdpService: DpdpComplianceService,
  ) {}

  @Get('referrals/profile')
  @ApiOperation({ summary: 'Get user referral code and earnings' })
  async getReferralProfile(@Req() req: any) {
    const userId = req.user?.userId || req.user?.sub;
    if (!userId) throw new ForbiddenException('User context is missing');
    return this.referralService.getReferralProfile(userId);
  }

  @Post('referrals/apply')
  @ApiOperation({ summary: 'Apply a referral code with abuse checks' })
  async applyReferral(@Req() req: any, @Body() dto: ApplyReferralDto) {
    const userId = req.user?.userId || req.user?.sub;
    if (!userId) throw new ForbiddenException('User context is missing');
    return this.referralService.validateAndApplyReferral(userId, dto.code, dto.deviceId);
  }

  @Post('dpdp/consent')
  @ApiOperation({ summary: 'Record DPDP user consent' })
  async recordConsent(@Req() req: any, @Body() dto: DpdpConsentDto) {
    const userId = req.user?.userId || req.user?.sub;
    if (!userId) throw new ForbiddenException('User context is missing');
    const ip = req.ip || req.connection?.remoteAddress;
    const ua = req.headers['user-agent'];
    return this.dpdpService.recordConsent(userId, dto, ip, ua);
  }

  @Get('dpdp/consents')
  @ApiOperation({ summary: 'Get current DPDP consents' })
  async getConsents(@Req() req: any) {
    const userId = req.user?.userId || req.user?.sub;
    if (!userId) throw new ForbiddenException('User context is missing');
    return this.dpdpService.getConsents(userId);
  }

  @Get('dpdp/export')
  @ApiOperation({ summary: 'Export user personal data under DPDP Act' })
  async exportData(@Req() req: any) {
    const userId = req.user?.userId || req.user?.sub;
    if (!userId) throw new ForbiddenException('User context is missing');
    return this.dpdpService.exportUserData(userId);
  }

  @Post('dpdp/delete-account')
  @ApiOperation({ summary: 'Initiate account deletion under DPDP Act' })
  async deleteAccount(@Req() req: any, @Body() dto: DpdpDeletionRequestDto) {
    const userId = req.user?.userId || req.user?.sub;
    if (!userId) throw new ForbiddenException('User context is missing');
    return this.dpdpService.requestAccountDeletion(userId, dto.reason);
  }
}
