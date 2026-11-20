import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { WalletService } from '../wallet/wallet.service.js';
import { WalletWebhookService } from '../wallet/wallet-webhook.service.js';
import { FinanceQueryRepository } from '../data/finance-query.repository.js';

@ApiTags('finance-customer')
@Controller('v1/customer')
export class CustomerFinanceController {
  constructor(
    private readonly wallet: WalletService,
    private readonly walletWebhook: WalletWebhookService,
    private readonly financeRepo: FinanceQueryRepository,
  ) {}

  @Get('wallet')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get customer wallet balance and sub-balances' })
  async getCustomerWallet(@Req() req: any) {
    return this.wallet.getOrCreateWallet(req.user.userId);
  }

  @Post('wallet/topup')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate Razorpay payment order for customer wallet topup' })
  async topupWallet(@Req() req: any, @Body() body: { amountInr: number }) {
    if (!body || typeof body.amountInr !== 'number') {
      throw new BadRequestException('amountInr must be provided as a number');
    }
    return this.wallet.createTopupOrder(req.user.userId, body.amountInr);
  }

  @Post('wallet/topup/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Razorpay payment webhook callback for wallet topup' })
  async handleTopupWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Body() body: any,
    @Req() req: any
  ) {
    const rawBody = req.rawBody || (typeof body === 'string' ? body : JSON.stringify(body));
    return this.walletWebhook.handlePaymentWebhook(rawBody, signature || '', body);
  }

  @Get('wallet/transactions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get customer wallet transactions history' })
  async getWalletTransactions(@Req() req: any) {
    return this.wallet.getWalletTransactions(req.user.userId);
  }

  @Get('payments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get customer payment transactions history' })
  async getCustomerPayments(@Req() req: any) {
    return this.financeRepo.getCustomerPayments(req.user.userId);
  }

  @Get('refunds')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get customer refunds history and status' })
  async getCustomerRefunds(@Req() req: any) {
    return this.financeRepo.getCustomerRefunds(req.user.userId);
  }
}
