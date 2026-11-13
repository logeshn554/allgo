import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CatalogService } from './catalog.service.js';
import { OperatingHoursService } from './operating-hours.service.js';
import { ModerateProductDto } from './dto/product.dto.js';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto.js';

@Controller('v1/admin/catalog')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminCatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly operatingHoursService: OperatingHoursService
  ) {}

  // ==========================================
  // Categories Administration
  // ==========================================

  @Get('categories')
  async getCategories(@Query('verticalType') verticalType?: string) {
    return this.catalogService.getAdminCategories(verticalType);
  }

  @Post('categories')
  async createCategory(@Request() req: any, @Body() dto: CreateCategoryDto & { catalogId?: string }) {
    return this.catalogService.createAdminCategory(req.user.userId, dto);
  }

  @Put('categories/:id')
  async updateCategory(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto
  ) {
    return this.catalogService.updateAdminCategory(req.user.userId, id, dto);
  }

  @Delete('categories/:id')
  async deleteCategory(@Request() req: any, @Param('id') id: string) {
    return this.catalogService.deleteAdminCategory(req.user.userId, id);
  }

  // ==========================================
  // Products Moderation
  // ==========================================

  @Get('products')
  async getProducts(
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.catalogService.getAdminProducts(status, page ? Number(page) : 1, limit ? Number(limit) : 50);
  }

  @Post('products/:id/moderate')
  async moderateProduct(
    @Request() req: any,
    @Param('id') productId: string,
    @Body() dto: ModerateProductDto
  ) {
    return this.catalogService.moderateProduct(req.user.userId, productId, dto);
  }

  @Get('outlets/:outletId')
  async getOutletCatalogInspect(@Param('outletId') outletId: string) {
    const [categories, products, overrides, weeklyHours, specialClosures, openStatus] = await Promise.all([
      this.catalogService.getCategories(outletId, true),
      this.catalogService.getProducts(outletId, {}, false),
      this.catalogService.getOutletOverrides(outletId),
      this.operatingHoursService.getWeeklyHours(outletId),
      this.operatingHoursService.getSpecialClosures(outletId),
      this.operatingHoursService.calculateIsOpen(outletId),
    ]);

    return {
      outletId,
      categories,
      products: products.items,
      totalProducts: products.total,
      overrides,
      weeklyHours,
      specialClosures,
      openStatus,
    };
  }
}
