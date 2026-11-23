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
import { ParcelsService } from '../parcels.service.js';
import { MobilityFareService } from '../mobility-fare.service.js';
import {
  QuoteParcelFareDto,
  CreateParcelDeliveryDto,
  VerifyParcelOtpDto,
} from '../dto/mobility.dto.js';

@Controller('v1/parcels')
@UseGuards(JwtAuthGuard)
export class ParcelsController {
  constructor(
    private readonly parcelsService: ParcelsService,
    private readonly fareService: MobilityFareService
  ) {}

  @Post('quote')
  async quoteFare(@Body() dto: QuoteParcelFareDto) {
    const dist = this.fareService.calculateDistanceKm(dto.pickupLocation, dto.dropoffLocation);
    const fare = await this.fareService.calculateParcelFare(
      dist,
      dto.packageCategory,
      dto.weightKg,
      dto.vehicleType,
      dto.isFragile
    );
    return {
      distanceKm: dist,
      packageCategory: dto.packageCategory || 'GENERAL',
      vehicleType: dto.vehicleType || 'TWO_WHEELER',
      isFragile: Boolean(dto.isFragile),
      estimatedFareInr: fare,
    };
  }

  @Post('create')
  async createParcel(@Request() req: any, @Body() dto: CreateParcelDeliveryDto) {
    return this.parcelsService.createParcel(req.user.userId, dto);
  }

  @Post(':id/courier-assign')
  async assignCourier(@Request() req: any, @Param('id') parcelId: string) {
    return this.parcelsService.assignCourier(req.user.userId, parcelId);
  }

  @Post(':id/verify-pickup')
  async verifyPickup(
    @Request() req: any,
    @Param('id') parcelId: string,
    @Body() dto: VerifyParcelOtpDto
  ) {
    return this.parcelsService.verifyPickupOtp(req.user.userId, parcelId, dto.otp);
  }

  @Post(':id/start-transit')
  async startTransit(@Request() req: any, @Param('id') parcelId: string) {
    return this.parcelsService.startTransit(req.user.userId, parcelId);
  }

  @Post(':id/verify-delivery')
  async verifyDelivery(
    @Request() req: any,
    @Param('id') parcelId: string,
    @Body() dto: VerifyParcelOtpDto
  ) {
    return this.parcelsService.verifyDeliveryOtp(req.user.userId, parcelId, dto.otp);
  }

  @Get(':id')
  async getParcelDetails(@Request() req: any, @Param('id') parcelId: string) {
    const role = req.user.roles?.[0] || 'CUSTOMER';
    return this.parcelsService.getParcelDetails(req.user.userId, role, parcelId);
  }
}
