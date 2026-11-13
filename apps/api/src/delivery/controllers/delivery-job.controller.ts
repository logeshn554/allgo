import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { DeliveryJobService } from '../delivery-job.service.js';
import {
  CreateDeliveryJobDto,
  CancelDeliveryDto,
  ReportExceptionDto,
} from '../dto/delivery.dto.js';

@Controller('v1/delivery/jobs')
@UseGuards(JwtAuthGuard)
export class DeliveryJobController {
  constructor(private readonly deliveryJobService: DeliveryJobService) {}

  /**
   * Delivery Job Intake API (Internal / Test interface for Phase 4)
   */
  @Post('intake')
  async createJob(@Body() dto: CreateDeliveryJobDto) {
    return this.deliveryJobService.createDeliveryJob(dto);
  }

  @Get(':id')
  async getJob(@Request() req: any, @Param('id') id: string) {
    const role = req.user.roles?.[0] || 'CUSTOMER';
    return this.deliveryJobService.getJobTrackingDetails(req.user.userId, role, id);
  }

  @Post(':id/cancel')
  async cancelJob(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: CancelDeliveryDto
  ) {
    const role = req.user.roles?.[0] || 'CUSTOMER';
    return this.deliveryJobService.cancelDeliveryJob(req.user.userId, role, id, dto);
  }

  @Post(':id/exception')
  async reportException(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ReportExceptionDto
  ) {
    const role = req.user.roles?.[0] || 'CUSTOMER';
    return this.deliveryJobService.reportException(req.user.userId, role, id, dto);
  }
}
