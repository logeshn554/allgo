import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ParcelService } from '../parcel.service.js';
import { ParcelDispatchService } from '../parcel-dispatch.service.js';
import {
  VerifyParcelOtpDto,
  FailedDeliveryAttemptDto,
  ReturnToSenderDto,
} from '../dto/parcel.dto.js';

@Controller('v1/partner/parcels')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PARTNER')
export class PartnerParcelController {
  constructor(
    private readonly parcelService: ParcelService,
    private readonly dispatchService: ParcelDispatchService
  ) {}

  @Get('offers')
  async getOffers(@Request() req: any) {
    return this.parcelService.getPartnerOffers(req.user.userId);
  }

  @Post('offers/:attemptId/accept')
  async acceptOffer(@Request() req: any, @Param('attemptId') attemptId: string) {
    return this.dispatchService.acceptOffer(req.user.userId, attemptId);
  }

  @Post('offers/:attemptId/reject')
  async rejectOffer(
    @Request() req: any,
    @Param('attemptId') attemptId: string,
    @Body('reason') reason: string
  ) {
    return this.dispatchService.rejectOffer(req.user.userId, attemptId, reason);
  }

  @Get('active')
  async getActiveParcel(@Request() req: any) {
    return this.parcelService.getPartnerActiveParcel(req.user.userId);
  }

  @Post(':id/arrived-pickup')
  async arrivedPickup(@Request() req: any, @Param('id') parcelId: string) {
    return this.parcelService.confirmArrivedPickup(req.user.userId, parcelId);
  }

  @Post(':id/verify-pickup')
  async verifyPickup(
    @Request() req: any,
    @Param('id') parcelId: string,
    @Body() dto: VerifyParcelOtpDto
  ) {
    return this.parcelService.verifyPickupOtp(req.user.userId, parcelId, dto.otp);
  }

  @Post(':id/start-transit')
  async startTransit(@Request() req: any, @Param('id') parcelId: string) {
    return this.parcelService.startTransit(req.user.userId, parcelId);
  }

  @Post(':id/arrived-destination')
  async arrivedDestination(@Request() req: any, @Param('id') parcelId: string) {
    return this.parcelService.confirmArrivedDestination(req.user.userId, parcelId);
  }

  @Post(':id/verify-delivery')
  async verifyDelivery(
    @Request() req: any,
    @Param('id') parcelId: string,
    @Body() dto: VerifyParcelOtpDto & { photoUrl?: string }
  ) {
    return this.parcelService.verifyDelivery(req.user.userId, parcelId, dto.otp, dto.photoUrl);
  }

  @Post(':id/failed-attempt')
  async failedAttempt(
    @Request() req: any,
    @Param('id') parcelId: string,
    @Body() dto: FailedDeliveryAttemptDto
  ) {
    return this.parcelService.recordFailedAttempt(req.user.userId, parcelId, dto);
  }

  @Post(':id/return-to-sender')
  async returnToSender(
    @Request() req: any,
    @Param('id') parcelId: string,
    @Body() dto: ReturnToSenderDto
  ) {
    return this.parcelService.initiateReturn(req.user.userId, 'PARTNER', parcelId, dto);
  }

  @Post(':id/complete-return')
  async completeReturn(@Request() req: any, @Param('id') parcelId: string) {
    return this.parcelService.completeReturn(req.user.userId, parcelId);
  }

  @Get('history')
  async getHistory(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return this.parcelService.getPartnerHistory(
      req.user.userId,
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0
    );
  }
}
