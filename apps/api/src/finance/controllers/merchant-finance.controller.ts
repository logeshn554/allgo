import {
  Controller,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { SettlementService } from '../settlement/settlement.service.js';
import { FinanceQueryRepository } from '../data/finance-query.repository.js';

@ApiTags('finance-merchant')
@Controller('v1/merchant/financials')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MerchantFinanceController {
  constructor(
    private readonly settlement: SettlementService,
    private readonly financeRepo: FinanceQueryRepository,
  ) {}

  @Get('overview')
  @Roles('MERCHANT_ADMIN', 'MERCHANT_OPERATOR')
  @ApiOperation({ summary: 'Get merchant sales overview and financials' })
  async getMerchantFinancialOverview(@Req() req: any) {
    const merchantId = await this.financeRepo.getMerchantIdByOwnerId(req.user.userId);
    if (!merchantId) {
      return { totalGrossSalesInr: 0, totalCommissionInr: 0, netSettledInr: 0 };
    }

    const settlements = await this.settlement.getMerchantSettlements(merchantId);
    const grossSales = settlements.reduce((acc, curr) => acc + parseFloat(curr.gross_sales_inr), 0);
    const commission = settlements.reduce((acc, curr) => acc + parseFloat(curr.commission_inr), 0);
    const netSettled = settlements
      .filter((s) => s.status === 'SETTLED' || s.status === 'APPROVED')
      .reduce((acc, curr) => acc + parseFloat(curr.net_payable_inr), 0);

    return {
      merchantId,
      totalGrossSalesInr: grossSales,
      totalCommissionInr: commission,
      netSettledInr: netSettled,
      settlementCount: settlements.length,
    };
  }

  @Get('settlements')
  @Roles('MERCHANT_ADMIN', 'MERCHANT_OPERATOR')
  @ApiOperation({ summary: 'Get merchant settlements history' })
  async getMerchantSettlements(@Req() req: any) {
    const merchantId = await this.financeRepo.getMerchantIdByOwnerId(req.user.userId);
    if (!merchantId) return [];
    return this.settlement.getMerchantSettlements(merchantId);
  }
}
