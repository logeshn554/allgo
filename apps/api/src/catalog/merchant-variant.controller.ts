import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CatalogService } from './catalog.service.js';
import { CreateVariantDto, UpdateVariantDto } from './dto/variant.dto.js';
import {
  CreateOptionGroupDto,
  UpdateOptionGroupDto,
  CreateOptionDto,
  UpdateOptionDto,
} from './dto/option-group.dto.js';

@Controller('v1/merchants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MERCHANT', 'MERCHANT_ADMIN', 'MERCHANT_OPERATOR')
export class MerchantVariantController {
  constructor(private readonly catalogService: CatalogService) {}

  @Post('products/:id/variants')
  async createVariant(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: CreateVariantDto
  ) {
    return this.catalogService.createVariant(req.user.userId, id, dto);
  }

  @Get('products/:id/variants')
  async getVariants(@Param('id') id: string) {
    return this.catalogService.getVariants(id);
  }

  @Put('variants/:id')
  async updateVariant(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateVariantDto
  ) {
    return this.catalogService.updateVariant(req.user.userId, id, dto);
  }

  @Delete('variants/:id')
  async deleteVariant(@Request() req: any, @Param('id') id: string) {
    return this.catalogService.deleteVariant(req.user.userId, id);
  }

  @Post('products/:id/option-groups')
  async createOptionGroup(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: CreateOptionGroupDto
  ) {
    return this.catalogService.createOptionGroup(req.user.userId, id, dto);
  }

  @Get('products/:id/option-groups')
  async getOptionGroups(@Param('id') id: string) {
    return this.catalogService.getOptionGroups(id);
  }

  @Put('option-groups/:id')
  async updateOptionGroup(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateOptionGroupDto
  ) {
    return this.catalogService.updateOptionGroup(req.user.userId, id, dto);
  }

  @Delete('option-groups/:id')
  async deleteOptionGroup(@Request() req: any, @Param('id') id: string) {
    return this.catalogService.deleteOptionGroup(req.user.userId, id);
  }

  @Post('option-groups/:groupId/options')
  async createOption(
    @Request() req: any,
    @Param('groupId') groupId: string,
    @Body() dto: CreateOptionDto
  ) {
    return this.catalogService.createOption(req.user.userId, groupId, dto);
  }

  @Put('options/:id')
  async updateOption(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateOptionDto
  ) {
    return this.catalogService.updateOption(req.user.userId, id, dto);
  }

  @Delete('options/:id')
  async deleteOption(@Request() req: any, @Param('id') id: string) {
    return this.catalogService.deleteOption(req.user.userId, id);
  }
}
