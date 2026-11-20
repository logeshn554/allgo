import { Controller, Post, Param, Body, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { MerchantCsvMenuService } from './merchant-csv-menu.service.js';

@ApiTags('merchants-catalog-csv')
@Controller('v1/merchants/outlets/:outletId/catalog')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MERCHANT', 'MERCHANT_ADMIN')
@ApiBearerAuth()
export class MerchantCsvMenuController {
  constructor(private readonly csvService: MerchantCsvMenuService) {}

  @Post('bulk-csv')
  @ApiOperation({ summary: 'Bulk upload menu items via CSV with validation and error reporting' })
  async uploadBulkMenuCsv(
    @Request() req: any,
    @Param('outletId') outletId: string,
    @Body('csvContent') csvContent: string
  ) {
    if (!csvContent || typeof csvContent !== 'string') {
      throw new BadRequestException('csvContent string is required in request body');
    }
    return this.csvService.processBulkMenuCsv(req.user.userId, outletId, csvContent);
  }
}
