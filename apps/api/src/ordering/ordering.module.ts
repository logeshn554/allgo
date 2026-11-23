import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { DeliveryModule } from '../delivery/delivery.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { FinanceModule } from '../finance/finance.module.js';
// Repositories
import { OrderRepository } from './data/order.repository.js';
import { OrderEventRepository } from './data/order-event.repository.js';
import { OrderCancellationRepository } from './data/order-cancellation.repository.js';
import { PricingRepository } from './data/pricing.repository.js';
import { CouponRepository } from './data/coupon.repository.js';
// Services
import { CartService } from './services/cart.service.js';
import { AddressService } from './services/address.service.js';
import { InventoryReservationService } from './services/inventory-reservation.service.js';
import { PaymentService } from './services/payment.service.js';
import { SurgePricingCalculatorService } from './services/surge-pricing-calculator.service.js';
import { DeliveryPricingService } from './services/delivery-pricing.service.js';
import { CouponValidationService } from './services/coupon-validation.service.js';
import { CouponApplicationService } from './services/coupon-application.service.js';
import { OrderPlacementService } from './services/order-placement.service.js';
import { OrderMerchantLifecycleService } from './services/order-merchant-lifecycle.service.js';
import { OrderCancellationService } from './services/order-cancellation.service.js';
import { OrderQueryService } from './services/order-query.service.js';
import { OrderSagaOrchestratorService } from './services/order-saga-orchestrator.service.js';
import { GstInvoiceService } from './services/gst-invoice.service.js';
import { OrderSubstitutionService } from './services/order-substitution.service.js';
// Facades
import { PricingService } from './services/pricing.service.js';
import { CouponsService } from './services/coupons.service.js';
import { OrdersService } from './services/orders.service.js';
// Controllers
import { CartController } from './controllers/cart.controller.js';
import { CheckoutController } from './controllers/checkout.controller.js';
import { OrdersController } from './controllers/orders.controller.js';
import { AddressesController } from './controllers/addresses.controller.js';
import { MerchantOrdersController } from './controllers/merchant-orders.controller.js';
import { PaymentsController } from './controllers/payments.controller.js';
import { AdminOrdersController } from './controllers/admin-orders.controller.js';
import { OrderSubstitutionController } from './controllers/order-substitution.controller.js';

@Module({
  imports: [DatabaseModule, DeliveryModule, StorageModule, FinanceModule],
  controllers: [
    CartController,
    CheckoutController,
    OrdersController,
    AddressesController,
    MerchantOrdersController,
    PaymentsController,
    AdminOrdersController,
    OrderSubstitutionController,
  ],
  providers: [
    OrderRepository,
    OrderEventRepository,
    OrderCancellationRepository,
    PricingRepository,
    CouponRepository,
    CartService,
    AddressService,
    InventoryReservationService,
    PaymentService,
    SurgePricingCalculatorService,
    DeliveryPricingService,
    CouponValidationService,
    CouponApplicationService,
    OrderPlacementService,
    OrderMerchantLifecycleService,
    OrderCancellationService,
    OrderQueryService,
    OrderSagaOrchestratorService,
    GstInvoiceService,
    OrderSubstitutionService,
    PricingService,
    CouponsService,
    OrdersService,
  ],
  exports: [
    OrderRepository,
    OrderEventRepository,
    OrderCancellationRepository,
    PricingRepository,
    CouponRepository,
    CartService,
    AddressService,
    InventoryReservationService,
    PaymentService,
    SurgePricingCalculatorService,
    DeliveryPricingService,
    CouponValidationService,
    CouponApplicationService,
    OrderPlacementService,
    OrderMerchantLifecycleService,
    OrderCancellationService,
    OrderQueryService,
    OrderSagaOrchestratorService,
    GstInvoiceService,
    OrderSubstitutionService,
    PricingService,
    CouponsService,
    OrdersService,
  ],
})
export class OrderingModule {}
