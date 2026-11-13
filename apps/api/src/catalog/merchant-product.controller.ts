import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CatalogService } from './catalog.service.js';
import { CatalogMediaService } from './catalog-media.service.js';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto/product.dto.js';

@Controller('v1/merchants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MERCHANT_ADMIN', 'MERCHANT_OPERATOR')
export class MerchantProductController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly catalogMediaService: CatalogMediaService
  ) {}

  @Get('outlets/:outletId/products')
  async getOutletProducts(
    @Param('outletId') outletId: string,
    @Query() query: ProductQueryDto
  ) {
    return this.catalogService.getProducts(outletId, query, false);
  }

  @Post('outlets/:outletId/products')
  async createProduct(
    @Request() req: any,
    @Param('outletId') outletId: string,
    @Body() dto: CreateProductDto
  ) {
    return this.catalogService.createProduct(req.user.userId, outletId, dto);
  }

  @Get('catalog/products/:id')
  async getProduct(@Param('id') id: string, @Query('outletId') outletId?: string) {
    return this.catalogService.getProductById(id, outletId);
  }

  @Put('catalog/products/:id')
  async updateProduct(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto
  ) {
    return this.catalogService.updateProduct(req.user.userId, id, dto);
  }

  @Post('catalog/products/:id/archive')
  async archiveProduct(@Request() req: any, @Param('id') id: string) {
    return this.catalogService.archiveProduct(req.user.userId, id);
  }

  @Delete('catalog/products/:id')
  async deleteProduct(@Request() req: any, @Param('id') id: string) {
    return this.catalogService.deleteProduct(req.user.userId, id);
  }

  @Post('products/:productId/images')
  async uploadProductImage(
    @Request() req: any,
    @Param('productId') productId: string
  ) {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const fullBuffer = Buffer.concat(chunks);
    const declaredMime = req.headers['content-type'];
    return this.catalogMediaService.uploadProductImage(req.user.userId, productId, fullBuffer, declaredMime);
  }

  @Delete('products/:productId/images/:storageKey')
  async deleteProductImage(
    @Request() req: any,
    @Param('productId') productId: string,
    @Param('storageKey') storageKey: string
  ) {
    return this.catalogMediaService.deleteProductImage(req.user.userId, productId, storageKey);
  }
}
