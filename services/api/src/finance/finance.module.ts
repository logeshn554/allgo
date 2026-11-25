import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { RedisModule } from '../redis/redis.module.js';
import { CodReconciliationService } from './cod/cod-reconciliation.service.js';
import { AdminFinanceController } from './controllers/admin-finance.controller.js';
import { CustomerFinanceController } from './controllers/customer-finance.controller.js';
import { MerchantFinanceController } from './controllers/merchant-finance.controller.js';
import { PartnerFinanceController } from './controllers/partner-finance.controller.js';
import { FinanceQueryRepository } from './data/finance-query.repository.js';
import { SettlementRepository } from './data/settlement.repository.js';
import { FinanceController } from './finance.controller.js';
import { LedgerService } from './ledger/ledger.service.js';
import { PayoutService } from './payout/payout.service.js';
import { MerchantSettlementService } from './settlement/merchant-settlement.service.js';
import { PartnerSettlementService } from './settlement/partner-settlement.service.js';
import { SettlementService } from './settlement/settlement.service.js';
import { WalletWebhookService } from './wallet/wallet-webhook.service.js';
import { WalletService } from './wallet/wallet.service.js';

@Module({
  imports: [DatabaseModule, RedisModule],
  controllers: [
    CustomerFinanceController,
    PartnerFinanceController,
    MerchantFinanceController,
    AdminFinanceController,
    FinanceController,
  ],
  providers: [
    CustomerFinanceController,
    PartnerFinanceController,
    MerchantFinanceController,
    AdminFinanceController,
    FinanceQueryRepository,
    SettlementRepository,
    PartnerSettlementService,
    MerchantSettlementService,
    LedgerService,
    WalletService,
    WalletWebhookService,
    SettlementService,
    CodReconciliationService,
    PayoutService,
  ],
  exports: [
    LedgerService,
    WalletService,
    WalletWebhookService,
    SettlementService,
    CodReconciliationService,
    PayoutService,
    SettlementRepository,
    FinanceQueryRepository,
  ],
})
export class FinanceModule {}
