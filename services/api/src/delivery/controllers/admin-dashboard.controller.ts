import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AdminDashboardService } from '../admin-dashboard.service.js';

@ApiTags('admin-dashboard')
@Controller('v1/admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
@ApiHeader({
  name: 'X-AllGo-Role',
  description: 'Active role context (ADMIN)',
  required: true,
})
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get aggregated platform statistics and infrastructure health' })
  @ApiResponse({ status: 200, description: 'Aggregated dashboard summary' })
  async getSummary() {
    return this.dashboardService.getSummary();
  }
}
