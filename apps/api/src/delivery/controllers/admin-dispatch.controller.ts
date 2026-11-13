import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { DeliveryJobService } from '../delivery-job.service.js';
import { DispatchEngineService } from '../dispatch-engine.service.js';
import {
  ManualAssignDto,
  CancelDeliveryDto,
} from '../dto/delivery.dto.js';

@ApiTags('admin-dispatch')
@Controller('v1/admin/dispatch')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
@ApiHeader({
  name: 'X-AllGo-Role',
  description: 'Active role context (ADMIN)',
  required: true,
})
export class AdminDispatchController {
  constructor(
    private readonly deliveryJobService: DeliveryJobService,
    private readonly dispatchEngineService: DispatchEngineService
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get live dispatch operational metrics' })
  @ApiResponse({ status: 200, description: 'Dispatch statistics' })
  async getStats() {
    return this.deliveryJobService.getDispatchStats();
  }

  @Get('jobs')
  @ApiOperation({ summary: 'List delivery jobs with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'List of delivery jobs' })
  async listJobs(
    @Query('status') status?: string,
    @Query('verticalType') verticalType?: string,
    @Query('outletId') outletId?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ) {
    return this.deliveryJobService.listAdminJobs({
      status,
      verticalType,
      outletId,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get full delivery job details including attempts and events' })
  @ApiResponse({ status: 200, description: 'Delivery job full details' })
  async getJobDetails(@Param('id') jobId: string) {
    return this.deliveryJobService.getAdminJobDetails(jobId);
  }

  @Get('partners/online')
  @ApiOperation({ summary: 'Get online partners with current coordinates' })
  @ApiResponse({ status: 200, description: 'Online partners list' })
  async getOnlinePartners() {
    return this.deliveryJobService.listOnlinePartners();
  }

  @Get('exceptions')
  @ApiOperation({ summary: 'List delivery exceptions' })
  @ApiResponse({ status: 200, description: 'List of delivery exceptions' })
  async listExceptions(@Query('status') status?: string) {
    return this.deliveryJobService.listExceptions(status);
  }

  @Post('jobs/:id/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually assign delivery job to a partner' })
  @ApiResponse({ status: 200, description: 'Job manually assigned' })
  async manualAssign(
    @Req() req: any,
    @Param('id') jobId: string,
    @Body() dto: ManualAssignDto
  ) {
    return this.dispatchEngineService.manualAssign(
      req.user.userId,
      jobId,
      dto.partnerId,
      dto.reason
    );
  }

  @Post('jobs/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel delivery job with mandatory reason' })
  @ApiResponse({ status: 200, description: 'Delivery job cancelled' })
  async cancelJob(
    @Req() req: any,
    @Param('id') jobId: string,
    @Body() dto: CancelDeliveryDto
  ) {
    return this.deliveryJobService.cancelDeliveryJob(
      req.user.userId,
      'ADMIN',
      jobId,
      dto
    );
  }

  @Post('jobs/:id/dispatch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger automated dispatch search for delivery job' })
  @ApiResponse({ status: 200, description: 'Dispatch search initiated' })
  async triggerDispatch(@Param('id') jobId: string) {
    return this.dispatchEngineService.requestDispatch(jobId);
  }
}
