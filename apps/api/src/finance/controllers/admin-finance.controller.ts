import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import crypto from 'node:crypto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { WalletService } from '../wallet/wallet.service.js';
import { SettlementService } from '../settlement/settlement.service.js';
import { CodReconciliationService } from '../cod/cod-reconciliation.service.js';
import { PayoutService } from '../payout/payout.service.js';
import { FinanceQueryRepository } from '../data/finance-query.repository.js';

@ApiTags('finance-admin')
@Controller('v1/admin/finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminFinanceController {
  constructor(
    private readonly ledger: LedgerService,
    private readonly wallet: WalletService,
    private readonly settlement: SettlementService,
    private readonly cod: CodReconciliationService,
    private readonly payout: PayoutService,
    private readonly financeRepo: FinanceQueryRepository,
  ) {}

  @Get('dashboard')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Authoritative financial dashboard for admin' })
  async getAdminFinancialDashboard() {
    return this.financeRepo.getAdminFinancialDashboardMetrics();
  }

  @Get('ledger')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Search and inspect immutable double-entry ledger entries' })
  async searchLedger(@Query() query: any) {
    return this.ledger.getEntries(query);
  }

  @Post('settlements/partner/generate')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Generate partner settlement statement' })
  async generatePartnerSettlement(@Body() body: { partnerId: string; periodStart: string; periodEnd: string }) {
    return this.settlement.generatePartnerSettlement(
      body.partnerId,
      new Date(body.periodStart),
      new Date(body.periodEnd)
    );
  }

  @Post('settlements/partner/:id/approve')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Approve partner settlement and schedule payout' })
  async approvePartnerSettlement(@Req() req: any, @Param('id') id: string) {
    return this.settlement.approvePartnerSettlement(id, req.user.userId);
  }

  @Post('settlements/merchant/generate')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Generate merchant settlement statement' })
  async generateMerchantSettlement(@Body() body: { merchantId: string; outletId?: string; periodStart?: string; periodEnd?: string }) {
    return this.settlement.generateMerchantSettlement(
      body.merchantId,
      body.outletId,
      body.periodStart ? new Date(body.periodStart) : undefined,
      body.periodEnd ? new Date(body.periodEnd) : undefined
    );
  }

  @Post('settlements/merchant/:id/approve')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Approve merchant settlement and schedule payout' })
  async approveMerchantSettlement(@Req() req: any, @Param('id') id: string) {
    return this.settlement.approveMerchantSettlement(id, req.user.userId);
  }

  @Get('cod/pending')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List pending COD reconciliations and discrepancies' })
  async listPendingCod() {
    return this.cod.listPendingReconciliations();
  }

  @Post('cod/:id/reconcile')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Reconcile partner COD with optional approved adjustment' })
  async reconcileCod(@Req() req: any, @Param('id') id: string, @Body() body: { approvedAdjustmentInr?: number; notes?: string }) {
    return this.cod.reconcileCash(id, req.user.userId, body.approvedAdjustmentInr, body.notes);
  }

  @Get('payouts')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List payouts' })
  async listPayouts(@Query('status') status?: string) {
    return this.payout.listAllPayouts(status);
  }

  @Post('payouts/:id/process')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Process scheduled payout via RazorpayX adapter' })
  async processPayout(@Req() req: any, @Param('id') id: string) {
    return this.payout.processPayout(id, req.user.userId);
  }

  @Get('payments')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List recent payment transactions for admin' })
  async listAdminPayments(@Query('status') status?: string, @Query('limit') limit = 50, @Query('offset') offset = 0) {
    return this.financeRepo.listAdminPayments(status, limit, offset);
  }

  @Get('refunds')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all refund transactions for admin' })
  async listAdminRefunds(@Query('status') status?: string) {
    return this.financeRepo.listAdminRefunds(status);
  }

  @Post('refunds/process')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Process or approve a customer refund with ledger balancing' })
  async processAdminRefund(
    @Req() req: any,
    @Body() body: {
      paymentId: string;
      amountInr: number;
      destination: 'WALLET' | 'ORIGINAL_METHOD';
      reason: string;
      subOrderId?: string;
    }
  ) {
    const { paymentId, amountInr, destination, reason, subOrderId } = body;
    if (!paymentId || !amountInr || amountInr <= 0 || !destination || !reason) {
      throw new BadRequestException('paymentId, amountInr (> 0), destination, and reason are required');
    }

    const payment = await this.financeRepo.getPaymentById(paymentId);
    if (!payment) {
      throw new NotFoundException(`Payment record not found: ${paymentId}`);
    }

    const origAmount = parseFloat(payment.amount_inr);
    if (amountInr > origAmount) {
      throw new BadRequestException(`Refund amount ₹${amountInr} exceeds payment amount ₹${origAmount}`);
    }

    let customerId: string | null = null;
    if (payment.order_group_id) {
      customerId = await this.financeRepo.getCustomerIdFromOrderGroup(payment.order_group_id);
    }

    const gatewayRefundId = `rfnd_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
    const refund = await this.financeRepo.insertRefund(
      paymentId,
      subOrderId || null,
      gatewayRefundId,
      destination,
      amountInr,
      reason
    );

    const txRef = `REFUND-${refund.id}`;

    if (destination === 'WALLET' && customerId) {
      await this.wallet.creditWallet(customerId, amountInr, `Refund for Payment #${paymentId}: ${reason}`, txRef, false);
    } else {
      await this.ledger.postTransaction({
        transactionReference: txRef,
        description: `Refund #${refund.id} via ${destination}: ${reason}`,
        entries: [
          {
            accountType: 'PLATFORM_COMMISSION',
            direction: 'DEBIT',
            amountInr,
            description: `Refund deduction for payment #${paymentId}`,
            metadata: { refundId: refund.id, paymentId },
          },
          {
            accountType: 'GATEWAY_ESCROW',
            direction: 'CREDIT',
            amountInr,
            description: `Gateway refund return to customer`,
            metadata: { refundId: refund.id, paymentId },
          },
        ],
        metadata: { refundId: refund.id, paymentId, adminId: req.user.userId },
      });
    }

    return refund;
  }
}
