import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { MerchantAcceptOrderDto, MerchantRejectOrderDto } from '../dto/ordering.dto.js';
import { OrdersService } from '../services/orders.service.js';

@Controller('v1/merchants/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MERCHANT', 'MERCHANT_ADMIN', 'MERCHANT_OPERATOR')
export class MerchantOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async listMerchantOrders(@Request() req: any, @Query('status') status?: string) {
    return this.ordersService.listMerchantOrders(req.user.id, status);
  }

  @Post(':id/accept')
  async acceptOrder(
    @Request() req: any,
    @Param('id') subOrderId: string,
    @Body() dto: MerchantAcceptOrderDto,
  ) {
    return this.ordersService.merchantAcceptOrder(
      subOrderId,
      req.user.id,
      dto.prepTimeMinutes || 20,
    );
  }

  @Post(':id/preparing')
  async markPreparing(@Request() req: any, @Param('id') subOrderId: string) {
    return this.ordersService.merchantMarkPreparing(subOrderId, req.user.id);
  }

  @Post(':id/ready')
  async markReady(@Request() req: any, @Param('id') subOrderId: string) {
    return this.ordersService.merchantMarkReady(subOrderId, req.user.id);
  }

  @Post(':id/reject')
  async rejectOrder(
    @Request() req: any,
    @Param('id') subOrderId: string,
    @Body() dto: MerchantRejectOrderDto,
  ) {
    return this.ordersService.merchantRejectOrder(subOrderId, req.user.id, dto.reason);
  }
}
