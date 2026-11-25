import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { DeliveryJobService } from '../../delivery/delivery-job.service.js';
import { DeliveryGateway } from '../../delivery/delivery.gateway.js';
import { InventoryReservationService } from './inventory-reservation.service.js';
import { PaymentService } from './payment.service.js';

export type SagaState =
  | 'PENDING'
  | 'MATCHED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'FAILED'
  | 'COMPENSATED';

export interface SagaTransitionResult {
  subOrderId: string;
  fromState: string;
  toState: SagaState;
  compensated: boolean;
  compensationDetails?: {
    inventoryReleased: boolean;
    refundIssued: boolean;
    refundId?: string;
  };
}

@Injectable()
export class OrderSagaOrchestratorService {
  private readonly logger = new Logger(OrderSagaOrchestratorService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly inventoryReservation: InventoryReservationService,
    private readonly paymentService: PaymentService,
    private readonly deliveryJobService: DeliveryJobService,
    private readonly gateway: DeliveryGateway,
  ) {}

  /**
   * Advances the order state machine through the official lifecycle:
   * PENDING -> MATCHED -> PICKED_UP -> IN_TRANSIT -> DELIVERED
   */
  async transitionState(
    subOrderId: string,
    targetState: SagaState,
    actorId = 'SYSTEM',
  ): Promise<SagaTransitionResult> {
    const res = await this.db.query(
      `SELECT so.id, so.status, so.checkout_session_id, so.total_payable_inr, so.delivery_job_id, og.id as order_group_id
       FROM sub_orders so
       JOIN order_groups og ON og.id = so.order_group_id
       WHERE so.id = $1;`,
      [subOrderId],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException(`Order not found: ${subOrderId}`);
    }

    const order = res.rows[0];
    const currentState = order.status;

    // Validate forward state machine transitions
    const validTransitions: Record<string, SagaState[]> = {
      CART: ['PENDING', 'FAILED'],
      PLACED: ['PENDING', 'MATCHED', 'FAILED'],
      PENDING: ['MATCHED', 'FAILED', 'COMPENSATED'],
      MATCHED: ['PICKED_UP', 'FAILED', 'COMPENSATED'],
      PICKED_UP: ['IN_TRANSIT', 'FAILED'],
      IN_TRANSIT: ['DELIVERED', 'FAILED'],
    };

    const allowed = validTransitions[currentState] || [];
    if (!allowed.includes(targetState) && targetState !== 'COMPENSATED') {
      throw new BadRequestException(
        `Invalid state machine transition from ${currentState} to ${targetState}`,
      );
    }

    if (targetState === 'COMPENSATED' || targetState === 'FAILED') {
      return this.executeCompensatingTransactions(
        order,
        'Dispatch queue timeout without active driver',
        actorId,
      );
    }

    // Normal forward progression
    await this.db.query(`UPDATE sub_orders SET status = $1, updated_at = NOW() WHERE id = $2;`, [
      targetState,
      subOrderId,
    ]);

    await this.db.query(
      `INSERT INTO order_status_events (order_group_id, sub_order_id, from_status, to_status, actor_id, event_type, notes)
       VALUES ($1, $2, $3, $4, $5, 'SAGA_TRANSITION', 'Order state machine updated');`,
      [order.order_group_id, subOrderId, currentState, targetState, actorId],
    );

    this.gateway.emitJobStatusChanged(subOrderId, targetState, {
      subOrderId,
      fromState: currentState,
      toState: targetState,
    });

    return {
      subOrderId,
      fromState: currentState,
      toState: targetState,
      compensated: false,
    };
  }

  /**
   * Automated Compensating Transactions:
   * Releases dark-store reserved inventory and initiates payment gateway refund
   * when dispatch queue times out or no driver can be matched.
   */
  async executeCompensatingTransactions(
    order: any,
    reason: string,
    actorId: string,
  ): Promise<SagaTransitionResult> {
    this.logger.warn(`Triggering Saga Compensation for order ${order.id}: ${reason}`);

    let inventoryReleased = false;
    let refundIssued = false;
    let refundId: string | undefined;

    // 1. Release reserved dark-store inventory
    try {
      if (order.checkout_session_id) {
        await this.inventoryReservation.releaseReservation(order.checkout_session_id);
        inventoryReleased = true;
      }
    } catch (err: any) {
      this.logger.error(`Failed to release inventory during compensation: ${err.message}`);
    }

    // 2. Cancel delivery job if created
    if (order.delivery_job_id) {
      try {
        await this.deliveryJobService.cancelDeliveryJob(actorId, 'SYSTEM', order.delivery_job_id, {
          reasonCode: 'DISPATCH_TIMEOUT',
          reasonDetails: reason,
        });
      } catch (err: any) {
        this.logger.warn(`Delivery job cancellation skipped during compensation: ${err.message}`);
      }
    }

    // 3. Automated payment gateway refund
    try {
      const refund = await this.paymentService.processRefund(
        order.id,
        Number(order.total_payable_inr),
        `Automated Saga Refund: ${reason}`,
      );
      if (refund) {
        refundIssued = true;
        refundId = refund.id;
      }
    } catch (err: any) {
      this.logger.error(`Failed to issue refund during compensation: ${err.message}`);
    }

    // 4. Update order status to CANCELLED with compensation record
    await this.db.query(
      `UPDATE sub_orders SET status = 'CANCELLED', cancellation_reason = $1, updated_at = NOW() WHERE id = $2;`,
      [reason, order.id],
    );

    await this.db.query(
      `INSERT INTO order_status_events (order_group_id, sub_order_id, from_status, to_status, actor_id, event_type, notes)
       VALUES ($1, $2, $3, 'COMPENSATED', $4, 'SAGA_COMPENSATION', $5);`,
      [order.order_group_id, order.id, order.status, actorId, reason],
    );

    this.gateway.emitJobStatusChanged(order.id, 'CANCELLED', {
      orderId: order.id,
      compensated: true,
      reason,
    });

    return {
      subOrderId: order.id,
      fromState: order.status,
      toState: 'COMPENSATED',
      compensated: true,
      compensationDetails: {
        inventoryReleased,
        refundIssued,
        refundId,
      },
    };
  }
}
