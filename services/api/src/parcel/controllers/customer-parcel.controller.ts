import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import {
  CancelParcelDto,
  CreateParcelBookingDto,
  PayParcelDto,
  QuoteParcelDto,
} from '../dto/parcel.dto.js';
import { ParcelPricingService } from '../parcel-pricing.service.js';
import { ParcelRestrictionService } from '../parcel-restriction.service.js';
import { ParcelService } from '../parcel.service.js';

@Controller('v1/parcels')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomerParcelController {
  constructor(
    private readonly parcelService: ParcelService,
    private readonly pricingService: ParcelPricingService,
    private readonly restrictionService: ParcelRestrictionService,
  ) {}

  @Post('quote')
  async quoteFare(@Request() req: any, @Body() dto: QuoteParcelDto) {
    return this.pricingService.calculateQuote(dto, req.user?.userId);
  }

  @Get('config/restrictions')
  async getRestrictions() {
    return this.restrictionService.getAllRestrictions();
  }

  @Get('config/services')
  async getServices() {
    return this.pricingService.getServiceConfigs();
  }

  @Post()
  async createParcel(@Request() req: any, @Body() dto: CreateParcelBookingDto) {
    return this.parcelService.createBooking(req.user.userId, dto);
  }

  // Backward compatibility alias for /v1/parcels/create
  @Post('create')
  async createParcelAlias(@Request() req: any, @Body() dto: CreateParcelBookingDto) {
    return this.parcelService.createBooking(req.user.userId, dto);
  }

  @Post(':id/pay')
  async payBooking(@Request() req: any, @Param('id') parcelId: string, @Body() dto: PayParcelDto) {
    return this.parcelService.payBooking(req.user.userId, parcelId, dto);
  }

  @Get(':id')
  async getParcelDetails(@Request() req: any, @Param('id') parcelId: string) {
    const role = req.user.roles?.[0] || 'CUSTOMER';
    return this.parcelService.getParcelDetails(req.user.userId, role, parcelId);
  }

  @Get()
  async listParcels(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('status') status?: string,
  ) {
    return this.parcelService.listCustomerBookings(
      req.user.userId,
      limit ? Number.parseInt(limit, 10) : 20,
      offset ? Number.parseInt(offset, 10) : 0,
      status,
    );
  }

  @Post(':id/cancel')
  async cancelBooking(
    @Request() req: any,
    @Param('id') parcelId: string,
    @Body() dto: CancelParcelDto,
  ) {
    const role = req.user.roles?.[0] || 'CUSTOMER';
    return this.parcelService.cancelBooking(req.user.userId, role, parcelId, dto);
  }

  @Get(':id/tracking')
  async getTracking(@Request() req: any, @Param('id') parcelId: string) {
    const role = req.user.roles?.[0] || 'CUSTOMER';
    return this.parcelService.getTracking(req.user.userId, role, parcelId);
  }

  @Get(':id/events')
  async getEvents(@Request() req: any, @Param('id') parcelId: string) {
    const role = req.user.roles?.[0] || 'CUSTOMER';
    await this.parcelService.getParcelDetails(req.user.userId, role, parcelId);
    return this.parcelService.getEventTimeline(parcelId);
  }

  @Get(':id/receipt')
  async getReceipt(@Request() req: any, @Param('id') parcelId: string) {
    const role = req.user.roles?.[0] || 'CUSTOMER';
    return this.parcelService.getReceipt(req.user.userId, role, parcelId);
  }
}
