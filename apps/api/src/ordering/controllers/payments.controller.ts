import {
  Controller,
  Post,
  Body,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PaymentService } from '../services/payment.service.js';
import { VerifyPaymentDto } from '../dto/ordering.dto.js';

@Controller('v1/payments')
export class PaymentsController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  async verifyPayment(@Body() dto: VerifyPaymentDto) {
    return this.paymentService.confirmPayment(
      dto.paymentId,
      dto.gatewayPaymentId,
      dto.gatewaySignature
    );
  }

  @Post('webhook')
  async handleWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Body() body: any
  ) {
    const rawBody = typeof body === 'string' ? body : JSON.stringify(body);
    return this.paymentService.handleWebhook(rawBody, signature || '', body);
  }
}
