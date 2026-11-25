import { Body, Controller, Get, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { CancelOrderDto, CreateCouponDto } from '../dto/ordering.dto.js';
import { CouponsService } from '../services/coupons.service.js';
import { OrdersService } from '../services/orders.service.js';

@Controller('v1/admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminOrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly couponsService: CouponsService,
  ) {}

  @Get()
  async listOrders(@Query('status') status?: string, @Query('limit') limit?: number) {
    return this.ordersService.listAdminOrders(status, limit);
  }

  @Get('coupons')
  async listCoupons() {
    return this.couponsService.listActiveCoupons();
  }

  @Post('coupons')
  async createCoupon(@Request() req: any, @Body() dto: CreateCouponDto) {
    return this.couponsService.createCoupon(dto, req.user?.id);
  }

  @Put('coupons/:id/toggle')
  async toggleCoupon(
    @Request() req: any,
    @Param('id') couponId: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.couponsService.toggleCouponActive(couponId, isActive, req.user?.id);
  }

  @Get(':id')
  async getOrderDetails(@Request() req: any, @Param('id') orderId: string) {
    return this.ordersService.getOrderDetails(orderId, req.user.id, 'ADMIN');
  }

  @Post(':id/cancel')
  async cancelOrder(
    @Request() req: any,
    @Param('id') orderId: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancelOrder(orderId, req.user.id, 'ADMIN', dto.reason);
  }
}
