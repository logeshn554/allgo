import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { SettlementService } from '../settlement/settlement.service.js';
import { CodReconciliationService } from '../cod/cod-reconciliation.service.js';
import { FinanceQueryRepository } from '../data/finance-query.repository.js';

@ApiTags('finance-partner')
@Controller('v1/partner/earnings')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PartnerFinanceController {
  constructor(
    private readonly settlement: SettlementService,
    private readonly cod: CodReconciliationService,
    private readonly financeRepo: FinanceQueryRepository,
  ) {}

  @Get('dashboard')
  @Roles('PARTNER')
  @ApiOperation({ summary: 'Get partner earnings dashboard metrics' })
  async getPartnerEarningsDashboard(@Req() req: any) {
    const partnerId = await this.financeRepo.getPartnerIdByUserId(req.user.userId);
    if (!partnerId) {
      return { totalEarningsInr: 0, completedTrips: 0, outstandingCodInr: 0, pendingSettlementsInr: 0 };
    }

    const cod = await this.cod.getPartnerCodBalance(partnerId);
    const settlements = await this.settlement.getPartnerSettlements(partnerId);

    const totalSettled = settlements
      .filter((s) => s.status === 'SETTLED' || s.status === 'APPROVED')
      .reduce((acc, curr) => acc + parseFloat(curr.net_payable_inr), 0);

    return {
      partnerId,
      totalSettledEarningsInr: totalSettled,
      outstandingCodInr: cod.outstandingInr,
      totalCodCollectedInr: cod.totalCollectedInr,
      settlementCount: settlements.length,
    };
  }

  @Get('settlements')
  @Roles('PARTNER')
  @ApiOperation({ summary: 'Get partner settlements history' })
  async getPartnerSettlements(@Req() req: any) {
    const partnerId = await this.financeRepo.getPartnerIdByUserId(req.user.userId);
    if (!partnerId) return [];
    return this.settlement.getPartnerSettlements(partnerId);
  }

  @Get('cod')
  @Roles('PARTNER')
  @ApiOperation({ summary: 'Get partner COD balance and breakdown' })
  async getPartnerCodStatus(@Req() req: any) {
    const partnerId = await this.financeRepo.getPartnerIdByUserId(req.user.userId);
    if (!partnerId) return { outstandingInr: 0 };
    return this.cod.getPartnerCodBalance(partnerId);
  }

  @Post('cod/deposit')
  @Roles('PARTNER')
  @ApiOperation({ summary: 'Submit partner COD deposit reference' })
  async submitCodDeposit(
    @Req() req: any,
    @Body() body: { amountInr: number; depositReference: string; notes?: string }
  ) {
    const partnerId = await this.financeRepo.getPartnerIdByUserId(req.user.userId);
    return this.cod.submitCashDeposit(partnerId!, body.amountInr, body.depositReference, body.notes);
  }
}
