import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { OrderRepository } from '../data/order.repository.js';
import { OrderEventRepository } from '../data/order-event.repository.js';
import { OrderCancellationRepository } from '../data/order-cancellation.repository.js';
import { InventoryReservationService } from './inventory-reservation.service.js';
import { PaymentService } from './payment.service.js';
import { DeliveryJobService } from '../../delivery/delivery-job.service.js';

@Injectable()
export class OrderCancellationService {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly eventRepo: OrderEventRepository,
    private readonly cancellationRepo: OrderCancellationRepository,
    private readonly inventoryReservation: InventoryReservationService,
    private readonly paymentService: PaymentService,
    private readonly deliveryJobService: DeliveryJobService
  ) {}

  async cancelOrder(subOrderId: string, userId: string, role: string, reason: string): Promise<any> {
    const order = await this.orderRepo.findSubOrderForCancellation(subOrderId);
    if (!order) throw new NotFoundException('Order not found');

    if (role === 'CUSTOMER') {
      if (order.customer_id !== userId) throw new ForbiddenException('Forbidden');
      if (order.status !== 'PLACED' && order.status !== 'CART' && order.status !== 'MERCHANT_ACCEPTED') {
        throw new BadRequestException(
          `Cannot cancel order once food preparation or delivery transit has started (${order.status})`
        );
      }
    }

    await this.inventoryReservation.releaseReservation(order.checkout_session_id);

    if (order.delivery_job_id) {
      try {
        await this.deliveryJobService.cancelDeliveryJob(userId, role, order.delivery_job_id, {
          reasonCode: 'ORDER_CANCELLED',
          reasonDetails: reason,
        });
      } catch (_) {}
    }

    const refund = await this.paymentService.processRefund(
      subOrderId,
      Number(order.total_payable_inr),
      `Cancelled: ${reason}`
    );

    await this.cancellationRepo.recordCancellation({
      subOrderId,
      cancelledByUserId: userId,
      roleAtCancellation: role,
      reason,
      stageAtCancellation: order.status,
      refundAmountInr: order.total_payable_inr,
      refundId: refund?.id || null,
    });

    const updated = await this.orderRepo.markSubOrderCancelled(subOrderId, reason, userId);

    await this.eventRepo.recordEvent({
      orderGroupId: order.order_group_id,
      subOrderId,
      actorId: userId,
      eventType: 'ORDER_CANCELLED',
      fromStatus: order.status,
      toStatus: 'CANCELLED',
      notes: reason,
    });

    return updated;
  }
}
