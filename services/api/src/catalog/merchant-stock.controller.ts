import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { CatalogService } from './catalog.service.js';
import {
  AddSpecialClosureDto,
  SetWeeklyHoursDto,
  ToggleTemporaryClosureDto,
} from './dto/operating-hours.dto.js';
import {
  BulkAssignOutletsDto,
  SetOutletOverrideDto,
  UpdateStockDto,
} from './dto/outlet-override.dto.js';
import { OperatingHoursService } from './operating-hours.service.js';

@Controller('v1/merchants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MERCHANT', 'MERCHANT_ADMIN', 'MERCHANT_OPERATOR')
export class MerchantStockController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly operatingHoursService: OperatingHoursService,
  ) {}

  @Put('outlets/:outletId/products/:productId/override')
  async setOutletOverride(
    @Request() req: any,
    @Param('outletId') outletId: string,
    @Param('productId') productId: string,
    @Body() dto: SetOutletOverrideDto,
  ) {
    return this.catalogService.setOutletOverride(req.user.userId, outletId, productId, dto);
  }

  @Delete('outlets/:outletId/products/:productId/override')
  async removeOutletOverride(
    @Request() req: any,
    @Param('outletId') outletId: string,
    @Param('productId') productId: string,
  ) {
    return this.catalogService.removeOutletOverride(req.user.userId, outletId, productId);
  }

  @Post('products/:productId/bulk-assign-outlets')
  async bulkAssignOutlets(
    @Request() req: any,
    @Param('productId') productId: string,
    @Body() dto: BulkAssignOutletsDto,
  ) {
    return this.catalogService.bulkAssignOutlets(req.user.userId, productId, dto);
  }

  @Put('outlets/:outletId/products/:productId/stock')
  async updateStock(
    @Request() req: any,
    @Param('outletId') outletId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateStockDto,
  ) {
    return this.catalogService.updateStock(req.user.userId, outletId, productId, dto);
  }

  @Get('outlets/:outletId/products/:productId/stock-history')
  async getStockHistory(
    @Request() req: any,
    @Param('outletId') outletId: string,
    @Param('productId') productId: string,
  ) {
    return this.catalogService.getStockHistory(req.user.userId, outletId, productId);
  }

  @Get('outlets/:outletId/operating-hours')
  async getOperatingHours(@Request() req: any, @Param('outletId') outletId: string) {
    await this.catalogService.verifyOutletOwnership(req.user.userId, outletId);
    return this.operatingHoursService.getWeeklyHours(outletId);
  }

  @Put('outlets/:outletId/operating-hours')
  async setOperatingHours(
    @Request() req: any,
    @Param('outletId') outletId: string,
    @Body() dto: SetWeeklyHoursDto,
  ) {
    await this.catalogService.verifyOutletOwnership(req.user.userId, outletId);
    return this.operatingHoursService.setWeeklyHours(outletId, dto.intervals);
  }

  @Get('outlets/:outletId/special-closures')
  async getSpecialClosures(@Request() req: any, @Param('outletId') outletId: string) {
    await this.catalogService.verifyOutletOwnership(req.user.userId, outletId);
    return this.operatingHoursService.getSpecialClosures(outletId);
  }

  @Post('outlets/:outletId/special-closures')
  async addSpecialClosure(
    @Request() req: any,
    @Param('outletId') outletId: string,
    @Body() dto: AddSpecialClosureDto,
  ) {
    await this.catalogService.verifyOutletOwnership(req.user.userId, outletId);
    return this.operatingHoursService.addSpecialClosure(outletId, dto);
  }

  @Delete('outlets/:outletId/special-closures/:closureId')
  async deleteSpecialClosure(
    @Request() req: any,
    @Param('outletId') outletId: string,
    @Param('closureId') closureId: string,
  ) {
    await this.catalogService.verifyOutletOwnership(req.user.userId, outletId);
    return this.operatingHoursService.deleteSpecialClosure(outletId, closureId);
  }

  @Post('outlets/:outletId/temporary-closure')
  async toggleTemporaryClosure(
    @Request() req: any,
    @Param('outletId') outletId: string,
    @Body() dto: ToggleTemporaryClosureDto,
  ) {
    await this.catalogService.verifyOutletOwnership(req.user.userId, outletId);
    return this.operatingHoursService.toggleTemporaryClosure(outletId, dto);
  }
}
