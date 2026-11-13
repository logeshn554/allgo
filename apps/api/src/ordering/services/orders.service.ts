import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { CartService } from './cart.service.js';
import { PricingService } from './pricing.service.js';
import { AddressService } from './address.service.js';
import { InventoryReservationService } from './inventory-reservation.service.js';
import { PaymentService } from './payment.service.js';
import { DeliveryJobService } from '../../delivery/delivery-job.service.js';
import { PlaceOrderDto } from '../dto/ordering.dto.js';
import { OrderRepository } from '../data/order.repository.js';
import { OrderEventRepository } from '../data/order-event.repository.js';
import { OrderCancellationRepository } from '../data/order-cancellation.repository.js';
import { OrderPlacementService } from './order-placement.service.js';
import { OrderMerchantLifecycleService } from './order-merchant-lifecycle.service.js';
import { OrderCancellationService } from './order-cancellation.service.js';
import { OrderQueryService } from './order-query.service.js';

@Injectable()
export class OrdersService {
  private readonly placementService: OrderPlacementService;
  private readonly merchantLifecycleService: OrderMerchantLifecycleService;
  private readonly cancellationService: OrderCancellationService;
  private readonly queryService: OrderQueryService;

  constructor(
    private readonly db: DatabaseService,
    private readonly cartService: CartService,
    private readonly pricingService: PricingService,
    private readonly addressService: AddressService,
    private readonly inventoryReservation: InventoryReservationService,
    private readonly paymentService: PaymentService,
    private readonly deliveryJobService: DeliveryJobService,
    orderPlacementService?: OrderPlacementService,
    orderMerchantLifecycleService?: OrderMerchantLifecycleService,
    orderCancellationService?: OrderCancellationService,
    orderQueryService?: OrderQueryService
  ) {
    if (
      orderPlacementService &&
      orderMerchantLifecycleService &&
      orderCancellationService &&
      orderQueryService
    ) {
      this.placementService = orderPlacementService;
      this.merchantLifecycleService = orderMerchantLifecycleService;
      this.cancellationService = orderCancellationService;
      this.queryService = orderQueryService;
    } else {
      const orderRepo = new OrderRepository(db);
      const eventRepo = new OrderEventRepository(db);
      const cancellationRepo = new OrderCancellationRepository(db);
      this.placementService =
        orderPlacementService ??
        new OrderPlacementService(
          db,
          orderRepo,
          eventRepo,
          cartService,
          pricingService,
          addressService,
          inventoryReservation,
          paymentService
        );
      this.merchantLifecycleService =
        orderMerchantLifecycleService ??
        new OrderMerchantLifecycleService(
          db,
          orderRepo,
          eventRepo,
          cancellationRepo,
          inventoryReservation,
          paymentService,
          deliveryJobService
        );
      this.cancellationService =
        orderCancellationService ??
        new OrderCancellationService(
          orderRepo,
          eventRepo,
          cancellationRepo,
          inventoryReservation,
          paymentService,
          deliveryJobService
        );
      this.queryService = orderQueryService ?? new OrderQueryService(orderRepo, eventRepo);
    }
  }

  async placeOrder(customerId: string, dto: PlaceOrderDto): Promise<any> {
    return this.placementService.placeOrder(customerId, dto, (subOrderId, userId, role) =>
      this.getOrderDetails(subOrderId, userId, role)
    );
  }

  async merchantAcceptOrder(subOrderId: string, merchantUserId: string, prepTimeMinutes = 20): Promise<any> {
    return this.merchantLifecycleService.merchantAcceptOrder(subOrderId, merchantUserId, prepTimeMinutes);
  }

  async merchantMarkPreparing(subOrderId: string, merchantUserId: string): Promise<any> {
    return this.merchantLifecycleService.merchantMarkPreparing(subOrderId, merchantUserId);
  }

  async merchantMarkReady(subOrderId: string, merchantUserId: string): Promise<any> {
    return this.merchantLifecycleService.merchantMarkReady(subOrderId, merchantUserId);
  }

  async merchantRejectOrder(subOrderId: string, merchantUserId: string, reason: string): Promise<any> {
    return this.merchantLifecycleService.merchantRejectOrder(subOrderId, merchantUserId, reason);
  }

  async cancelOrder(subOrderId: string, userId: string, role: string, reason: string): Promise<any> {
    return this.cancellationService.cancelOrder(subOrderId, userId, role, reason);
  }

  async synchronizeDeliveryStatus(subOrderId: string, deliveryStatus: string): Promise<void> {
    return this.queryService.synchronizeDeliveryStatus(subOrderId, deliveryStatus);
  }

  async getOrderDetails(subOrderId: string, userId: string, role: string): Promise<any> {
    return this.queryService.getOrderDetails(subOrderId, userId, role);
  }

  async listCustomerOrders(customerId: string): Promise<any[]> {
    return this.queryService.listCustomerOrders(customerId);
  }

  async listMerchantOrders(merchantUserId: string, status?: string): Promise<any[]> {
    return this.queryService.listMerchantOrders(merchantUserId, status);
  }

  async listAdminOrders(status?: string, limit = 50): Promise<any[]> {
    return this.queryService.listAdminOrders(status, limit);
  }
}
