import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { DeliveryOtpRateLimiterGuard } from '../../common/guards/delivery-otp-rate-limiter.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { OwnershipGuard } from '../../common/guards/ownership.guard.js';
import { DeliveryJobService } from '../delivery-job.service.js';
import {
  CancelDeliveryDto,
  CompleteDeliveryDto,
  CreateDeliveryJobDto,
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
  @UseGuards(OwnershipGuard)
  async getJob(@Request() req: any, @Param('id') id: string) {
    const role = req.user.roles?.[0] || 'CUSTOMER';
    return this.deliveryJobService.getJobTrackingDetails(req.user.userId, role, id);
  }

  @Post(':id/cancel')
  @UseGuards(OwnershipGuard)
  async cancelJob(@Request() req: any, @Param('id') id: string, @Body() dto: CancelDeliveryDto) {
    const role = req.user.roles?.[0] || 'CUSTOMER';
    return this.deliveryJobService.cancelDeliveryJob(req.user.userId, role, id, dto);
  }

  @Post(':id/exception')
  @UseGuards(OwnershipGuard)
  async reportException(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ReportExceptionDto,
  ) {
    const role = req.user.roles?.[0] || 'CUSTOMER';
    return this.deliveryJobService.reportException(req.user.userId, role, id, dto);
  }

  @Post(':id/verify-otp')
  @UseGuards(OwnershipGuard, DeliveryOtpRateLimiterGuard)
  async verifyDeliveryOtp(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: CompleteDeliveryDto,
  ) {
    try {
      const res = await this.deliveryJobService.partnerCompleteDelivery(req.user.userId, id, dto);
      if (req.otpRateLimit?.recordSuccess) {
        await req.otpRateLimit.recordSuccess();
      }
      return res;
    } catch (err) {
      if (req.otpRateLimit?.recordFailure) {
        await req.otpRateLimit.recordFailure();
      }
      throw err;
    }
  }
}
