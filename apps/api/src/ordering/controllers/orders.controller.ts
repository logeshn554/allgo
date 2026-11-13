import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { OrdersService } from '../services/orders.service.js';
import { CancelOrderDto } from '../dto/ordering.dto.js';

@Controller('v1/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @Roles('CUSTOMER')
  async listMyOrders(@Request() req: any) {
    return this.ordersService.listCustomerOrders(req.user.id);
  }

  @Get(':id')
  async getOrderDetails(@Request() req: any, @Param('id') orderId: string) {
    const role = req.headers['x-allgo-role'] || 'CUSTOMER';
    return this.ordersService.getOrderDetails(orderId, req.user.id, role);
  }

  @Post(':id/cancel')
  async cancelOrder(
    @Request() req: any,
    @Param('id') orderId: string,
    @Body() dto: CancelOrderDto
  ) {
    const role = req.headers['x-allgo-role'] || 'CUSTOMER';
    return this.ordersService.cancelOrder(orderId, req.user.id, role, dto.reason);
  }
}
