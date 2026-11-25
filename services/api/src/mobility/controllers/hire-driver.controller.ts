import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import {
  BookHireDriverDto,
  EndHireDutyDto,
  EstimateHireDriverDto,
  StartHireDutyDto,
} from '../dto/mobility.dto.js';
import { HireDriverService } from '../hire-driver.service.js';
import { MobilityFareService } from '../mobility-fare.service.js';

@Controller('v1/hire-driver')
@UseGuards(JwtAuthGuard)
export class HireDriverController {
  constructor(
    private readonly hireDriverService: HireDriverService,
    private readonly fareService: MobilityFareService,
  ) {}

  @Post('estimate')
  async estimateFare(@Body() dto: EstimateHireDriverDto) {
    const scheduledDate = new Date(dto.scheduledStartTime);
    return this.fareService.calculateHireDriverFare(dto.durationHours, scheduledDate);
  }

  @Post('fare-estimate')
  async estimateFareAlias(@Body() dto: EstimateHireDriverDto) {
    return this.estimateFare(dto);
  }

  @Post('book')
  async bookDriver(@Request() req: any, @Body() dto: BookHireDriverDto) {
    return this.hireDriverService.bookDriver(req.user.userId, dto);
  }

  @Post(':id/assign')
  async assignDriver(@Request() req: any, @Param('id') bookingId: string) {
    return this.hireDriverService.assignDriver(req.user.userId, bookingId);
  }

  @Post(':id/arrived')
  async driverArrived(@Request() req: any, @Param('id') bookingId: string) {
    return this.hireDriverService.driverArrived(req.user.userId, bookingId);
  }

  @Post(':id/start-duty')
  async startDuty(
    @Request() req: any,
    @Param('id') bookingId: string,
    @Body() dto: StartHireDutyDto,
  ) {
    return this.hireDriverService.startDuty(req.user.userId, bookingId, dto);
  }

  @Post(':id/end-duty')
  async endDuty(@Request() req: any, @Param('id') bookingId: string, @Body() dto: EndHireDutyDto) {
    return this.hireDriverService.endDuty(req.user.userId, bookingId, dto);
  }

  @Post(':id/cancel')
  async cancelBooking(
    @Request() req: any,
    @Param('id') bookingId: string,
    @Body() body: { reason?: string },
  ) {
    const role = req.user.roles?.[0] || 'CUSTOMER';
    return this.hireDriverService.cancelBooking(
      req.user.userId,
      role,
      bookingId,
      body.reason || 'User cancelled',
    );
  }

  @Get(':id/events')
  async getBookingEvents(@Request() req: any, @Param('id') bookingId: string) {
    const role = req.user.roles?.[0] || 'CUSTOMER';
    return this.hireDriverService.getBookingEvents(req.user.userId, role, bookingId);
  }

  @Get('')
  async listBookings(@Request() req: any) {
    const role = req.user.roles?.[0] || 'CUSTOMER';
    return this.hireDriverService.listBookings(req.user.userId, role);
  }

  @Get('partner/active')
  async getPartnerActiveBooking(@Request() req: any) {
    return this.hireDriverService.getPartnerActiveBooking(req.user.userId);
  }

  @Get(':id')
  async getBookingDetails(@Request() req: any, @Param('id') bookingId: string) {
    const role = req.user.roles?.[0] || 'CUSTOMER';
    return this.hireDriverService.getBookingDetails(req.user.userId, role, bookingId);
  }
}
