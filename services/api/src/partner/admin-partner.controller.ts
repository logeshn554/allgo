import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { UpdatePartnerStatusDto, UpdateServiceStatusDto } from './dto/update-status.dto.js';
import { PartnerService } from './partner.service.js';

@ApiTags('admin-partners')
@Controller('v1/admin/partners')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
@ApiHeader({ name: 'X-AllGo-Role', description: 'Active role context (ADMIN)', required: true })
export class AdminPartnerController {
  constructor(private readonly partnerService: PartnerService) {}

  @Get()
  @ApiOperation({ summary: 'List all partner applications with status filtering' })
  @ApiResponse({ status: 200, description: 'Paginated partner applications list' })
  async listApplications(@Query('status') status?: string) {
    return this.partnerService.listAdminApplications({ status });
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update partner account status (APPROVED, REJECTED, DOCUMENTS_REQUIRED, SUSPENDED)',
  })
  @ApiResponse({ status: 200, description: 'Partner status updated' })
  async updatePartnerStatus(
    @Req() req: any,
    @Param('id') partnerId: string,
    @Body() dto: UpdatePartnerStatusDto,
  ) {
    return this.partnerService.updateAdminPartnerStatus(
      partnerId,
      req.user.userId,
      dto.status,
      dto.reason,
    );
  }

  @Patch(':id/services/:serviceType/status')
  @ApiOperation({
    summary:
      'Update independent partner service application status (APPROVED, REJECTED, SUSPENDED)',
  })
  @ApiResponse({ status: 200, description: 'Service application status updated' })
  async updateServiceStatus(
    @Req() req: any,
    @Param('id') partnerId: string,
    @Param('serviceType') serviceType: string,
    @Body() dto: UpdateServiceStatusDto,
  ) {
    return this.partnerService.updateAdminServiceStatus(
      partnerId,
      serviceType,
      req.user.userId,
      dto.status,
      dto.reason,
    );
  }
}
