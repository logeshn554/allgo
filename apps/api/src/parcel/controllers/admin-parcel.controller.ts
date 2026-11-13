import {
  Controller,
  Post,
  Get,
  Put,
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
import { ParcelPricingService } from '../parcel-pricing.service.js';
import { ParcelRestrictionService } from '../parcel-restriction.service.js';
import {
  ReassignParcelDto,
  CancelParcelDto,
  ReturnToSenderDto,
  UpdateRestrictionDto,
  UpdateServiceConfigDto,
} from '../dto/parcel.dto.js';

@Controller('v1/admin/parcels')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminParcelController {
  constructor(
    private readonly parcelService: ParcelService,
    private readonly pricingService: ParcelPricingService,
    private readonly restrictionService: ParcelRestrictionService
  ) {}

  @Get()
  async listParcels(
    @Query('status') status?: string,
    @Query('serviceType') serviceType?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return this.parcelService.adminListParcels({
      status,
      serviceType,
      search,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('stats')
  async getStats() {
    return this.parcelService.adminStats();
  }

  @Get('config/restrictions')
  async getRestrictions() {
    return this.restrictionService.getAllRestrictions();
  }

  @Put('config/restrictions/:category')
  async updateRestriction(
    @Param('category') category: string,
    @Body() dto: UpdateRestrictionDto
  ) {
    return this.restrictionService.updateRestriction(category, dto);
  }

  @Get('config/services')
  async getServices() {
    return this.pricingService.getServiceConfigs();
  }

  @Put('config/services/:serviceType')
  async updateService(
    @Param('serviceType') serviceType: string,
    @Body() dto: UpdateServiceConfigDto
  ) {
    return this.pricingService.updateServiceConfig(serviceType, dto);
  }

  @Get(':id')
  async getParcelDetails(@Request() req: any, @Param('id') parcelId: string) {
    return this.parcelService.getParcelDetails(req.user.userId, 'ADMIN', parcelId);
  }

  @Get(':id/tracking')
  async getTracking(@Request() req: any, @Param('id') parcelId: string) {
    return this.parcelService.getTracking(req.user.userId, 'ADMIN', parcelId);
  }

  @Post(':id/reassign')
  async reassignParcel(
    @Request() req: any,
    @Param('id') parcelId: string,
    @Body() dto: ReassignParcelDto
  ) {
    return this.parcelService.adminReassign(req.user.userId, parcelId, dto);
  }

  @Post(':id/cancel')
  async cancelParcel(
    @Request() req: any,
    @Param('id') parcelId: string,
    @Body() dto: CancelParcelDto
  ) {
    return this.parcelService.cancelBooking(req.user.userId, 'ADMIN', parcelId, dto);
  }

  @Post(':id/authorize-return')
  async authorizeReturn(
    @Request() req: any,
    @Param('id') parcelId: string,
    @Body() dto: ReturnToSenderDto
  ) {
    return this.parcelService.initiateReturn(req.user.userId, 'ADMIN', parcelId, dto);
  }
}
