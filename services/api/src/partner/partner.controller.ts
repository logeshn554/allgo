import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { ApplyServiceDto } from './dto/apply-service.dto.js';
import { RegisterPartnerDto } from './dto/register-partner.dto.js';
import { SubmitPartnerDocumentDto } from './dto/submit-document.dto.js';
import { PartnerService } from './partner.service.js';

@ApiTags('partner')
@Controller('v1/partner')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PartnerController {
  constructor(private readonly partnerService: PartnerService) {}

  @Post('register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register or update partner profile & primary vehicle' })
  @ApiResponse({ status: 200, description: 'Partner profile saved successfully' })
  async register(@Req() req: any, @Body() dto: RegisterPartnerDto) {
    return this.partnerService.registerOrUpdate(req.user.userId, dto);
  }

  @Get('profile')
  @ApiOperation({
    summary: 'Retrieve partner profile, vehicles, documents, and service approval statuses',
  })
  @ApiResponse({ status: 200, description: 'Partner dossier details' })
  async getProfile(@Req() req: any) {
    return this.partnerService.getProfile(req.user.userId);
  }

  @Post('services/apply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Apply for a specific service category with vehicle compatibility check',
  })
  @ApiResponse({ status: 200, description: 'Service application submitted' })
  async applyService(@Req() req: any, @Body() dto: ApplyServiceDto) {
    return this.partnerService.applyForService(req.user.userId, dto.serviceType);
  }

  @Post('documents')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit and version a verified KYC document linked to an upload ticket',
  })
  @ApiResponse({ status: 201, description: 'Document linked and active version created' })
  async submitDocument(@Req() req: any, @Body() dto: SubmitPartnerDocumentDto) {
    return this.partnerService.submitDocument(req.user.userId, dto);
  }

  @Post('submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit full onboarding application for admin review' })
  @ApiResponse({ status: 200, description: 'Partner status transitioned to DOCS_SUBMITTED' })
  async submitForReview(@Req() req: any) {
    return this.partnerService.submitForReview(req.user.userId);
  }
}
