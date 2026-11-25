import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { MerchantService } from './merchant.service.js';

@ApiTags('admin-merchants')
@Controller('v1/admin/merchants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
@ApiHeader({ name: 'X-AllGo-Role', description: 'Active role context (ADMIN)', required: true })
export class AdminMerchantController {
  constructor(private readonly merchantService: MerchantService) {}

  @Get()
  @ApiOperation({ summary: 'List all merchant onboarding applications with status filtering' })
  @ApiResponse({ status: 200, description: 'Paginated merchant applications list' })
  async listApplications(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.merchantService.listAdminMerchantApplications({
      page: page ? Number.parseInt(page, 10) : 1,
      limit: limit ? Number.parseInt(limit, 10) : 20,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Retrieve comprehensive merchant application details, FSSAI, GSTIN, and Bank verification',
  })
  @ApiResponse({ status: 200, description: 'Full merchant dossier' })
  async getApplication(@Param('id') merchantId: string) {
    return this.merchantService.getAdminMerchantApplication(merchantId);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update merchant approval status (APPROVED, REJECTED, SUSPENDED, DOCUMENTS_REQUIRED)',
  })
  @ApiResponse({ status: 200, description: 'Merchant status updated and outlet activated' })
  async updateStatus(
    @Param('id') merchantId: string,
    @Body('status') status: string,
    @Body('notes') notes?: string,
  ) {
    return this.merchantService.updateAdminMerchantStatus(merchantId, status, notes);
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'Retrieve merchant KYC regulatory documents for admin verification' })
  @ApiResponse({ status: 200, description: 'List of active merchant documents' })
  async getDocuments(@Param('id') merchantId: string) {
    return this.merchantService.getMerchantDocuments(merchantId);
  }

  @Patch('outlets/:outletId/status')
  @ApiOperation({ summary: 'Update independent outlet approval and operational status' })
  @ApiResponse({ status: 200, description: 'Outlet approval status updated' })
  async updateOutletStatus(
    @Req() req: any,
    @Param('outletId') outletId: string,
    @Body('status') status: string,
    @Body('reason') reason?: string,
  ) {
    return this.merchantService.updateAdminOutletStatus(outletId, req.user.userId, status, reason);
  }
}
