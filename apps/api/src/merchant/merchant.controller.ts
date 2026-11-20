import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { MerchantService } from './merchant.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RegisterMerchantDto } from './dto/register-merchant.dto.js';
import { UpdateOutletStatusDto } from './dto/update-outlet-status.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { UpdateInventoryDto } from './dto/update-inventory.dto.js';
import { CreateOutletDto } from './dto/create-outlet.dto.js';
import { SubmitMerchantDocumentDto } from './dto/submit-merchant-doc.dto.js';

@ApiTags('merchants')
@Controller('v1/merchants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MERCHANT', 'MERCHANT_ADMIN', 'MERCHANT_OPERATOR')
@ApiBearerAuth()
export class MerchantController {
  constructor(private readonly merchantService: MerchantService) {}

  @Post('register')
  @HttpCode(HttpStatus.OK)
  @Roles('CUSTOMER', 'MERCHANT', 'MERCHANT_ADMIN', 'MERCHANT_OPERATOR')
  @ApiOperation({ summary: 'Register or update merchant business profile & outlet' })
  @ApiResponse({ status: 200, description: 'Merchant registration profile saved successfully' })
  async register(@Req() req: any, @Body() dto: RegisterMerchantDto) {
    return this.merchantService.registerOrUpdate(req.user.userId, dto);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Retrieve authenticated merchant profile, outlet, and verification status' })
  @ApiResponse({ status: 200, description: 'Merchant profile details' })
  async getProfile(@Req() req: any) {
    return this.merchantService.getProfile(req.user.userId);
  }

  @Patch('outlets/:id/status')
  @UseGuards(RolesGuard)
  @Roles('MERCHANT', 'MERCHANT_ADMIN', 'MERCHANT_OPERATOR')
  @ApiHeader({ name: 'X-AllGo-Role', description: 'Active role context (MERCHANT_ADMIN)', required: true })
  @ApiOperation({ summary: 'Toggle outlet availability open/closed and update prep time' })
  async updateOutletStatus(
    @Req() req: any,
    @Param('id') outletId: string,
    @Body() dto: UpdateOutletStatusDto
  ) {
    return this.merchantService.updateOutletStatus(req.user.userId, outletId, dto);
  }

  @Get('dashboard')
  @UseGuards(RolesGuard)
  @Roles('MERCHANT', 'MERCHANT_ADMIN', 'MERCHANT_OPERATOR')
  @ApiHeader({ name: 'X-AllGo-Role', description: 'Active role context (MERCHANT_ADMIN)', required: true })
  @ApiOperation({ summary: 'Retrieve live merchant dashboard metrics and sales breakdown' })
  async getDashboard(@Req() req: any) {
    return this.merchantService.getDashboard(req.user.userId);
  }

  @Get('orders')
  @UseGuards(RolesGuard)
  @Roles('MERCHANT', 'MERCHANT_ADMIN', 'MERCHANT_OPERATOR')
  @ApiHeader({ name: 'X-AllGo-Role', description: 'Active role context (MERCHANT_ADMIN)', required: true })
  @ApiOperation({ summary: 'List live and historical orders for merchant outlets' })
  async getOrders(@Req() req: any, @Query('status') status?: string) {
    return this.merchantService.getOrders(req.user.userId, status);
  }

  @Get('orders/:id')
  @UseGuards(RolesGuard)
  @Roles('MERCHANT', 'MERCHANT_ADMIN', 'MERCHANT_OPERATOR')
  @ApiHeader({ name: 'X-AllGo-Role', description: 'Active role context (MERCHANT_ADMIN)', required: true })
  @ApiOperation({ summary: 'Get full order details with item breakdowns' })
  async getOrderById(@Req() req: any, @Param('id') orderId: string) {
    return this.merchantService.getOrderById(req.user.userId, orderId);
  }

  @Patch('orders/:id/status')
  @UseGuards(RolesGuard)
  @Roles('MERCHANT', 'MERCHANT_ADMIN', 'MERCHANT_OPERATOR')
  @ApiHeader({ name: 'X-AllGo-Role', description: 'Active role context (MERCHANT_ADMIN)', required: true })
  @ApiOperation({ summary: 'Execute lifecycle transition for an order (ACCEPT, PREPARE, READY)' })
  async updateOrderStatus(
    @Req() req: any,
    @Param('id') orderId: string,
    @Body() dto: UpdateOrderStatusDto
  ) {
    return this.merchantService.updateOrderStatus(req.user.userId, orderId, dto);
  }

  @Get('categories')
  @UseGuards(RolesGuard)
  @Roles('MERCHANT', 'MERCHANT_ADMIN', 'MERCHANT_OPERATOR')
  @ApiHeader({ name: 'X-AllGo-Role', description: 'Active role context (MERCHANT_ADMIN)', required: true })
  @ApiOperation({ summary: 'List menu/catalog categories for merchant outlet' })
  async getCategories(@Req() req: any) {
    return this.merchantService.getCategories(req.user.userId);
  }

  @Get('products')
  @UseGuards(RolesGuard)
  @Roles('MERCHANT', 'MERCHANT_ADMIN', 'MERCHANT_OPERATOR')
  @ApiHeader({ name: 'X-AllGo-Role', description: 'Active role context (MERCHANT_ADMIN)', required: true })
  @ApiOperation({ summary: 'List products and current stock quantities' })
  async getProducts(
    @Req() req: any,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string
  ) {
    return this.merchantService.getProducts(req.user.userId, categoryId, search);
  }

  @Post('products')
  @UseGuards(RolesGuard)
  @Roles('MERCHANT', 'MERCHANT_ADMIN', 'MERCHANT_OPERATOR')
  @ApiHeader({ name: 'X-AllGo-Role', description: 'Active role context (MERCHANT_ADMIN)', required: true })
  @ApiOperation({ summary: 'Add a new food or grocery product with initial stock' })
  async createProduct(@Req() req: any, @Body() dto: CreateProductDto) {
    return this.merchantService.createProduct(req.user.userId, dto);
  }

  @Patch('products/:id')
  @UseGuards(RolesGuard)
  @Roles('MERCHANT', 'MERCHANT_ADMIN', 'MERCHANT_OPERATOR')
  @ApiHeader({ name: 'X-AllGo-Role', description: 'Active role context (MERCHANT_ADMIN)', required: true })
  @ApiOperation({ summary: 'Update product price, description, or availability' })
  async updateProduct(
    @Req() req: any,
    @Param('id') productId: string,
    @Body() dto: UpdateProductDto
  ) {
    return this.merchantService.updateProduct(req.user.userId, productId, dto);
  }

  @Delete('products/:id')
  @UseGuards(RolesGuard)
  @Roles('MERCHANT', 'MERCHANT_ADMIN', 'MERCHANT_OPERATOR')
  @ApiHeader({ name: 'X-AllGo-Role', description: 'Active role context (MERCHANT_ADMIN)', required: true })
  @ApiOperation({ summary: 'Archive a product from the active catalog' })
  async deleteProduct(@Req() req: any, @Param('id') productId: string) {
    return this.merchantService.deleteProduct(req.user.userId, productId);
  }

  @Patch('inventory/:itemId')
  @UseGuards(RolesGuard)
  @Roles('MERCHANT', 'MERCHANT_ADMIN', 'MERCHANT_OPERATOR')
  @ApiHeader({ name: 'X-AllGo-Role', description: 'Active role context (MERCHANT_ADMIN)', required: true })
  @ApiOperation({ summary: 'Update stock levels and out-of-stock toggle' })
  async updateInventory(
    @Req() req: any,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateInventoryDto
  ) {
    return this.merchantService.updateInventory(req.user.userId, itemId, dto);
  }

  @Get('earnings')
  @UseGuards(RolesGuard)
  @Roles('MERCHANT', 'MERCHANT_ADMIN', 'MERCHANT_OPERATOR')
  @ApiHeader({ name: 'X-AllGo-Role', description: 'Active role context (MERCHANT_ADMIN)', required: true })
  @ApiOperation({ summary: 'Retrieve gross sales, platform commissions, and net settlement summary' })
  async getEarnings(@Req() req: any) {
    return this.merchantService.getEarnings(req.user.userId);
  }

  @Get('payouts')
  @UseGuards(RolesGuard)
  @Roles('MERCHANT', 'MERCHANT_ADMIN', 'MERCHANT_OPERATOR')
  @ApiHeader({ name: 'X-AllGo-Role', description: 'Active role context (MERCHANT_ADMIN)', required: true })
  @ApiOperation({ summary: 'Retrieve historical RazorpayX payout settlement transactions' })
  async getPayouts(@Req() req: any) {
    return this.merchantService.getPayouts(req.user.userId);
  }

  @Post('documents')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit and version merchant regulatory KYC document' })
  @ApiResponse({ status: 201, description: 'Document linked and active version created' })
  async submitDocument(@Req() req: any, @Body() dto: SubmitMerchantDocumentDto) {
    return this.merchantService.submitDocument(req.user.userId, dto);
  }

  @Post('outlets')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an additional outlet branch (requires independent administrative approval)' })
  @ApiResponse({ status: 201, description: 'Outlet created with PENDING_APPROVAL status' })
  async createOutlet(@Req() req: any, @Body() dto: CreateOutletDto) {
    return this.merchantService.createOutlet(req.user.userId, dto);
  }

  @Get('outlets')
  @ApiOperation({ summary: 'List all outlet branches with independent approval and operational states' })
  @ApiResponse({ status: 200, description: 'List of merchant outlets' })
  async getOutlets(@Req() req: any) {
    return this.merchantService.getOutlets(req.user.userId);
  }

  @Post('submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit merchant onboarding application for administrative review' })
  @ApiResponse({ status: 200, description: 'Merchant status updated to SUBMITTED' })
  async submitForReview(@Req() req: any) {
    return this.merchantService.submitForReview(req.user.userId);
  }
}
