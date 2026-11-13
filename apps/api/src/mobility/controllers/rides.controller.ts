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
import { RidesService } from '../rides.service.js';
import { MobilityFareService } from '../mobility-fare.service.js';
import {
  EstimateRideFareDto,
  BookRideDto,
  StartTripDto,
  CompleteTripDto,
  TriggerSosDto,
} from '../dto/mobility.dto.js';

@Controller('v1/rides')
@UseGuards(JwtAuthGuard)
export class RidesController {
  constructor(
    private readonly ridesService: RidesService,
    private readonly fareService: MobilityFareService
  ) {}

  @Post('estimate')
  async estimateFare(@Body() dto: EstimateRideFareDto) {
    return this.fareService.estimateRideFares(
      dto.pickupLocation,
      dto.dropoffLocation,
      1.0,
      dto.stateCode || 'TN'
    );
  }

  @Post('fare-estimate')
  async estimateFareAlias(@Body() dto: EstimateRideFareDto) {
    return this.estimateFare(dto);
  }

  @Post('book')
  async bookRide(@Request() req: any, @Body() dto: BookRideDto) {
    return this.ridesService.bookRide(req.user.userId, dto);
  }

  @Post(':id/driver-assign')
  async driverAssign(@Request() req: any, @Param('id') rideId: string) {
    return this.ridesService.assignDriver(req.user.userId, rideId);
  }

  @Post(':id/assign')
  async driverAssignAlias(@Request() req: any, @Param('id') rideId: string) {
    return this.ridesService.assignDriver(req.user.userId, rideId);
  }

  @Post(':id/driver-arrived')
  async driverArrived(@Request() req: any, @Param('id') rideId: string) {
    return this.ridesService.driverArrived(req.user.userId, rideId);
  }

  @Post(':id/arrived')
  async driverArrivedAlias(@Request() req: any, @Param('id') rideId: string) {
    return this.ridesService.driverArrived(req.user.userId, rideId);
  }

  @Post(':id/start')
  async startTrip(
    @Request() req: any,
    @Param('id') rideId: string,
    @Body() dto: StartTripDto
  ) {
    return this.ridesService.startTrip(req.user.userId, rideId, dto.startOtp);
  }

  @Post(':id/start-trip')
  async startTripAlias(
    @Request() req: any,
    @Param('id') rideId: string,
    @Body() dto: StartTripDto
  ) {
    return this.ridesService.startTrip(req.user.userId, rideId, dto.startOtp);
  }

  @Post(':id/complete')
  async completeTrip(
    @Request() req: any,
    @Param('id') rideId: string,
    @Body() dto: CompleteTripDto
  ) {
    return this.ridesService.completeTrip(req.user.userId, rideId, dto);
  }

  @Post(':id/dispatch')
  async requestDispatch(@Param('id') rideId: string) {
    return this.ridesService.requestDispatch(rideId);
  }

  @Get('partner/offers')
  async getPartnerOffers(@Request() req: any) {
    return this.ridesService.getPartnerOffers(req.user.userId);
  }

  @Get('partner/active')
  async getPartnerActiveRide(@Request() req: any) {
    return this.ridesService.getPartnerActiveRide(req.user.userId);
  }

  @Post('offers/:attemptId/accept')
  async acceptOffer(@Request() req: any, @Param('attemptId') attemptId: string) {
    return this.ridesService.acceptOffer(req.user.userId, attemptId);
  }

  @Post('offers/:attemptId/reject')
  async rejectOffer(
    @Request() req: any,
    @Param('attemptId') attemptId: string,
    @Body() body: { reason?: string }
  ) {
    return this.ridesService.rejectOffer(req.user.userId, attemptId, body.reason);
  }

  @Get(':id/events')
  async getRideEvents(@Request() req: any, @Param('id') rideId: string) {
    const role = req.user.roles?.[0] || 'CUSTOMER';
    return this.ridesService.getRideEvents(req.user.userId, role, rideId);
  }

  @Get('')
  async listRides(@Request() req: any) {
    const role = req.user.roles?.[0] || 'CUSTOMER';
    return this.ridesService.listRides(req.user.userId, role);
  }

  @Post(':id/sos')
  async triggerSos(
    @Request() req: any,
    @Param('id') rideId: string,
    @Body() dto: TriggerSosDto
  ) {
    const role = req.user.roles?.[0] || 'CUSTOMER';
    return this.ridesService.triggerSos(req.user.userId, role, rideId, dto);
  }

  @Post(':id/cancel')
  async cancelRide(
    @Request() req: any,
    @Param('id') rideId: string,
    @Body() body: { reason?: string }
  ) {
    const role = req.user.roles?.[0] || 'CUSTOMER';
    return this.ridesService.cancelRide(req.user.userId, role, rideId, body.reason || 'User cancelled');
  }

  @Get(':id')
  async getRideDetails(@Request() req: any, @Param('id') rideId: string) {
    const role = req.user.roles?.[0] || 'CUSTOMER';
    return this.ridesService.getRideDetails(req.user.userId, role, rideId);
  }
}
