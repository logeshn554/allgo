import { Controller, Optional } from '@nestjs/common';
import { AdminFinanceController } from './controllers/admin-finance.controller.js';
import { CustomerFinanceController } from './controllers/customer-finance.controller.js';
import { MerchantFinanceController } from './controllers/merchant-finance.controller.js';
import { PartnerFinanceController } from './controllers/partner-finance.controller.js';

export {
  CustomerFinanceController,
  PartnerFinanceController,
  MerchantFinanceController,
  AdminFinanceController,
};

/**
 * Backward-compatible facade for FinanceController.
 * Endpoints are modularized across focused controllers:
 * - CustomerFinanceController
 * - PartnerFinanceController
 * - MerchantFinanceController
 * - AdminFinanceController
 */
@Controller()
export class FinanceController {
  constructor(
    @Optional() public readonly customer?: CustomerFinanceController,
    @Optional() public readonly partner?: PartnerFinanceController,
    @Optional() public readonly merchant?: MerchantFinanceController,
    @Optional() public readonly admin?: AdminFinanceController,
  ) {}
}
