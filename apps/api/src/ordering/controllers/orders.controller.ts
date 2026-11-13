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
import { OwnershipGuard } from '../../common/guards/ownership.guard.js';
import { DeliveryOtpRateLimiterGuard } from '../../common/guards/delivery-otp-rate-limiter.guard.js';
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
  @UseGuards(OwnershipGuard)
  async getOrderDetails(@Request() req: any, @Param('id') orderId: string) {
    const role = req.headers['x-allgo-role'] || 'CUSTOMER';
    return this.ordersService.getOrderDetails(orderId, req.user.id, role);
  }

  @Post(':id/cancel')
  @UseGuards(OwnershipGuard)
  async cancelOrder(
    @Request() req: any,
    @Param('id') orderId: string,
    @Body() dto: CancelOrderDto
  ) {
    const role = req.headers['x-allgo-role'] || 'CUSTOMER';
    return this.ordersService.cancelOrder(orderId, req.user.id, role, dto.reason);
  }

  @Post(':id/verify-otp')
  @UseGuards(OwnershipGuard, DeliveryOtpRateLimiterGuard)
  async verifyOrderOtp(
    @Request() req: any,
    @Param('id') orderId: string,
    @Body('otp') otp: string
  ) {
    try {
      const res = await this.ordersService.verifyDeliveryOtp(orderId, otp, req.user.id);
      if (req.otpRateLimit?.recordSuccess) {
        await req.otpRateLimit.recordSuccess();
      }
      return res;
    } catch (err) {
      if (req.otpRateLimit?.recordFailure) {
        await req.otpRateLimit.recordFailure();
      }
      throw err;
    }
  }
}

