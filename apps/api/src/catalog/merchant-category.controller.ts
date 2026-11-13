import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CatalogService } from './catalog.service.js';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto.js';

@Controller('v1/merchants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MERCHANT_ADMIN', 'MERCHANT_OPERATOR')
export class MerchantCategoryController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('outlets/:outletId/categories')
  async getCategories(@Param('outletId') outletId: string) {
    return this.catalogService.getCategories(outletId, true);
  }

  @Post('outlets/:outletId/categories')
  async createCategory(
    @Request() req: any,
    @Param('outletId') outletId: string,
    @Body() dto: CreateCategoryDto
  ) {
    return this.catalogService.createCategory(req.user.userId, outletId, dto);
  }

  @Put('categories/:id')
  async updateCategory(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto
  ) {
    return this.catalogService.updateCategory(req.user.userId, id, dto);
  }

  @Delete('categories/:id')
  async deleteCategory(@Request() req: any, @Param('id') id: string) {
    return this.catalogService.deleteCategory(req.user.userId, id);
  }
}
