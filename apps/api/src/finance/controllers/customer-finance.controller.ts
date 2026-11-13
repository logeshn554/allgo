import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { WalletService } from '../wallet/wallet.service.js';
import { FinanceQueryRepository } from '../data/finance-query.repository.js';

@ApiTags('finance-customer')
@Controller('v1/customer')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CustomerFinanceController {
  constructor(
    private readonly wallet: WalletService,
    private readonly financeRepo: FinanceQueryRepository,
  ) {}

  @Get('wallet')
  @Roles('CUSTOMER')
  @ApiOperation({ summary: 'Get customer wallet balance and sub-balances' })
  async getCustomerWallet(@Req() req: any) {
    return this.wallet.getOrCreateWallet(req.user.userId);
  }

  @Post('wallet/topup')
  @Roles('CUSTOMER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Top up customer wallet' })
  async topupWallet(@Req() req: any, @Body() body: { amountInr: number }) {
    return this.wallet.creditWallet(req.user.userId, body.amountInr, 'Wallet Topup via Online Payment');
  }

  @Get('wallet/transactions')
  @Roles('CUSTOMER')
  @ApiOperation({ summary: 'Get customer wallet transactions history' })
  async getWalletTransactions(@Req() req: any) {
    return this.wallet.getWalletTransactions(req.user.userId);
  }

  @Get('payments')
  @Roles('CUSTOMER')
  @ApiOperation({ summary: 'Get customer payment transactions history' })
  async getCustomerPayments(@Req() req: any) {
    return this.financeRepo.getCustomerPayments(req.user.userId);
  }

  @Get('refunds')
  @Roles('CUSTOMER')
  @ApiOperation({ summary: 'Get customer refunds history and status' })
  async getCustomerRefunds(@Req() req: any) {
    return this.financeRepo.getCustomerRefunds(req.user.userId);
  }
}
