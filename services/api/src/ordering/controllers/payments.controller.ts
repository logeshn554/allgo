import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { VerifyPaymentDto } from '../dto/ordering.dto.js';
import { PaymentService } from '../services/payment.service.js';

@Controller('v1/payments')
export class PaymentsController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  async verifyPayment(@Body() dto: VerifyPaymentDto) {
    return this.paymentService.confirmPayment(
      dto.paymentId,
      dto.gatewayPaymentId,
      dto.gatewaySignature,
    );
  }

  @Get('status/:orderGroupId')
  @UseGuards(JwtAuthGuard)
  async getPaymentStatus(
    @Param('orderGroupId') orderGroupId: string,
    @Query('transactionId') transactionId?: string,
  ) {
    return this.paymentService.getPaymentStatus(orderGroupId, transactionId);
  }
}
