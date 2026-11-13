import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { OrderRepository } from '../data/order.repository.js';
import { OrderEventRepository } from '../data/order-event.repository.js';
import { OrderCancellationRepository } from '../data/order-cancellation.repository.js';
import { InventoryReservationService } from './inventory-reservation.service.js';
import { PaymentService } from './payment.service.js';
import { DeliveryJobService } from '../../delivery/delivery-job.service.js';

@Injectable()
export class OrderMerchantLifecycleService {
  private readonly logger = new Logger(OrderMerchantLifecycleService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly orderRepo: OrderRepository,
    private readonly eventRepo: OrderEventRepository,
    private readonly cancellationRepo: OrderCancellationRepository,
    private readonly inventoryReservation: InventoryReservationService,
    private readonly paymentService: PaymentService,
    private readonly deliveryJobService: DeliveryJobService
  ) {}

  async merchantAcceptOrder(subOrderId: string, merchantUserId: string, prepTimeMinutes = 20): Promise<any> {
    const order = await this.orderRepo.findSubOrderForMerchant(subOrderId, merchantUserId);
    if (!order) {
      throw new ForbiddenException('Order not found or does not belong to your merchant account');
    }

    if (order.status !== 'PLACED' && order.status !== 'PAYMENT_CONFIRMED') {
      throw new BadRequestException(`Cannot accept order in status "${order.status}"`);
    }

    await this.inventoryReservation.commitReservation(order.checkout_session_id);

    const estimatedReadyAt = new Date(Date.now() + prepTimeMinutes * 60 * 1000);
    const updated = await this.orderRepo.updateSubOrderAccepted(subOrderId, prepTimeMinutes, estimatedReadyAt);

    await this.eventRepo.recordEvent({
      orderGroupId: order.order_group_id,
      subOrderId,
      actorId: merchantUserId,
      eventType: 'MERCHANT_ACCEPTED',
      fromStatus: order.status,
      toStatus: 'MERCHANT_ACCEPTED',
      notes: 'Merchant accepted order with prep time',
    });

    return updated;
  }

  async merchantMarkPreparing(subOrderId: string, merchantUserId: string): Promise<any> {
    const order = await this.orderRepo.findSubOrderForMerchant(subOrderId, merchantUserId);
    if (!order) throw new ForbiddenException('Unauthorized');

    const updated = await this.orderRepo.updateSubOrderStatus(subOrderId, 'PREPARING');

    await this.eventRepo.recordEvent({
      orderGroupId: order.order_group_id,
      subOrderId,
      actorId: merchantUserId,
      eventType: 'ORDER_PREPARING',
      fromStatus: order.status,
      toStatus: 'PREPARING',
    });

    return updated;
  }

  async merchantMarkReady(subOrderId: string, merchantUserId: string): Promise<any> {
    const order = await this.orderRepo.findSubOrderForReady(subOrderId, merchantUserId);
    if (!order) throw new ForbiddenException('Unauthorized');

    const items = await this.orderRepo.findOrderItemsSnapshot(subOrderId);
    const addressSnapshot = order.delivery_address_snapshot || {};
    const dropoffLat = Number(addressSnapshot.latitude || 13.0418);
    const dropoffLng = Number(addressSnapshot.longitude || 80.2341);
    const dropoffAddress = addressSnapshot.address_line1 || 'Chennai Delivery Address';
    const dropoffPhone = addressSnapshot.recipient_phone || order.customer_phone;

    let deliveryJobId = order.delivery_job_id;
    if (!deliveryJobId) {
      const deliveryJob = await this.deliveryJobService.createDeliveryJob({
        outletId: order.outlet_id,
        verticalType: 'FOOD',
        customerId: order.customer_id,
        customerName: order.customer_name || 'Customer',
        pickupLocation: { latitude: Number(order.outlet_lat), longitude: Number(order.outlet_lng) },
        pickupAddress: order.outlet_address,
        pickupContactPhone: order.outlet_phone || '+919876543210',
        dropoffLocation: { latitude: dropoffLat, longitude: dropoffLng },
        dropoffAddress: dropoffAddress,
        dropoffContactPhone: dropoffPhone,
        itemsSnapshot: items,
        estimatedPrepTimeMinutes: order.prep_time_minutes || 15,
        courierFeeInr: 40.0,
      });

      deliveryJobId = deliveryJob.id;
      await this.orderRepo.linkDeliveryJob(subOrderId, deliveryJobId);
    }

    try {
      await this.deliveryJobService.merchantMarkReadyForPickup(merchantUserId, deliveryJobId);
    } catch (e) {
      this.logger.warn(`Delivery job auto-dispatch failed: ${e}`);
    }

    const updated = await this.orderRepo.markSubOrderReady(subOrderId, deliveryJobId);

    await this.eventRepo.recordEvent({
      orderGroupId: order.order_group_id,
      subOrderId,
      actorId: merchantUserId,
      eventType: 'ORDER_READY',
      fromStatus: order.status,
      toStatus: 'READY',
      notes: 'Order marked ready; delivery dispatched',
    });

    return updated;
  }

  async merchantRejectOrder(subOrderId: string, merchantUserId: string, reason: string): Promise<any> {
    const order = await this.orderRepo.findSubOrderForMerchant(subOrderId, merchantUserId);
    if (!order) throw new ForbiddenException('Unauthorized');

    await this.inventoryReservation.releaseReservation(order.checkout_session_id);

    const refund = await this.paymentService.processRefund(
      subOrderId,
      Number(order.total_payable_inr),
      `Merchant rejected: ${reason}`
    );

    await this.cancellationRepo.recordCancellation({
      subOrderId,
      cancelledByUserId: merchantUserId,
      roleAtCancellation: 'MERCHANT',
      reason,
      stageAtCancellation: order.status,
      refundAmountInr: order.total_payable_inr,
      refundId: refund?.id || null,
    });

    const updated = await this.orderRepo.markSubOrderRejected(subOrderId, reason);

    await this.eventRepo.recordEvent({
      orderGroupId: order.order_group_id,
      subOrderId,
      actorId: merchantUserId,
      eventType: 'ORDER_REJECTED',
      fromStatus: order.status,
      toStatus: 'CANCELLED',
      notes: reason,
    });

    return updated;
  }
}
