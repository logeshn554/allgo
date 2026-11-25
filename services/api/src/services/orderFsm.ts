import { EventEmitter } from 'node:events';
import { OrderStatus, ServiceVertical } from '@allgo/common';
import { Injectable, Logger, Optional } from '@nestjs/common';
import type pg from 'pg';
import { DatabaseService } from '../database/database.service.js';
import { RedisService } from '../redis/redis.service.js';
import {
  requiresCryptographicOtp,
  validateFsmTransition,
  verify4DigitOtp,
} from './fsmTransitions.js';
import {
  FsmOrderRecord,
  FsmTransitionRequest,
  type FsmTransitionResult,
  OrderNotFoundError,
} from './fsmTypes.js';

export const LIVE_ORDER_STREAM_CHANNEL = 'liveOrderStream';

export interface QueryExecutor {
  query<T extends pg.QueryResultRow = any>(
    text: string,
    params?: any[],
  ): Promise<pg.QueryResult<T>>;
}

@Injectable()
export class OrderFsmService {
  private readonly logger = new Logger(OrderFsmService.name);
  public readonly liveOrderStream = new EventEmitter();

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    @Optional() eventEmitter?: EventEmitter,
  ) {
    if (eventEmitter) {
      this.liveOrderStream = eventEmitter;
    }
  }

  async transition(req: FsmTransitionRequest): Promise<FsmTransitionResult> {
    const { orderId, targetStatus, actorId, actorRole, otp, reason, metadata } = req;

    const executeLockAndTransition = async (client: QueryExecutor) => {
      const order = await this.fetchAndLockOrder(client, orderId);
      if (!order) {
        throw new OrderNotFoundError(orderId);
      }

      const vertical = (req.vertical || order.vertical) as ServiceVertical;
      const previousStatus = order.status;

      // 1. Validate State Transition Deterministically
      validateFsmTransition(vertical, previousStatus, targetStatus);

      // 2. Cryptographic 4-Digit OTP Verification for Handover/Drop-off
      const otpRequirement = requiresCryptographicOtp(targetStatus);
      if (otpRequirement === 'PICKUP') {
        verify4DigitOtp(otp, order.pickup_otp);
      } else if (otpRequirement === 'DROP') {
        verify4DigitOtp(otp, order.delivery_pin);
      }

      // 3. Atomically Update Order State
      const transitionedAt = new Date().toISOString();
      await this.persistOrderState(client, orderId, vertical, targetStatus);

      // 4. Record Audit Event
      await this.recordFsmEvent(
        client,
        orderId,
        previousStatus,
        targetStatus,
        actorId,
        actorRole,
        reason,
        metadata,
      );

      return {
        orderId,
        vertical,
        previousStatus,
        newStatus: targetStatus,
        transitionedAt,
        actorId,
        actorRole,
        metadata,
      };
    };

    let result: FsmTransitionResult;
    if (typeof (this.db as any).transaction === 'function') {
      result = await (this.db as any).transaction((client: QueryExecutor) =>
        executeLockAndTransition(client),
      );
    } else {
      // In-memory or simplified test double execution
      await this.db.query('BEGIN');
      try {
        result = await executeLockAndTransition(this.db as any);
        await this.db.query('COMMIT');
      } catch (err) {
        await this.db.query('ROLLBACK');
        throw err;
      }
    }

    // 5. Emit Real-Time WebSocket Event over liveOrderStream & Redis Pub/Sub
    await this.broadcastLiveOrderState(result);

    return result;
  }

  private async fetchAndLockOrder(
    client: QueryExecutor,
    orderId: string,
  ): Promise<FsmOrderRecord | null> {
    // Check canonical orders / sub_orders table with row-level locking
    const query = `
      SELECT id, vertical, status, pickup_otp, delivery_pin, customer_id
      FROM (
        SELECT id, vertical, status, pickup_otp, delivery_pin, customer_id FROM orders WHERE id = $1
        UNION ALL
        SELECT id, 'INSTANT_GROCERY' as vertical, status, handover_otp as pickup_otp, delivery_pin, NULL as customer_id
        FROM sub_orders WHERE id = $1
        UNION ALL
        SELECT id, 'RIDE_HAILING' as vertical, status, start_otp as pickup_otp, NULL as delivery_pin, customer_id
        FROM rides WHERE id = $1
        UNION ALL
        SELECT id, 'PARCEL_DELIVERY' as vertical, status, pickup_otp, delivery_otp as delivery_pin, sender_id as customer_id
        FROM parcels WHERE id = $1
      ) o
      LIMIT 1
      FOR UPDATE;
    `;

    try {
      const res = await client.query(query, [orderId]);
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        vertical: row.vertical,
        status: row.status as OrderStatus,
        pickup_otp: row.pickup_otp,
        delivery_pin: row.delivery_pin,
        customer_id: row.customer_id,
      };
    } catch {
      // Fallback for tables without combined view
      const fallback = await client.query(`SELECT * FROM orders WHERE id = $1 FOR UPDATE;`, [
        orderId,
      ]);
      if (fallback.rows.length === 0) return null;
      return fallback.rows[0] as FsmOrderRecord;
    }
  }

  private async persistOrderState(
    client: QueryExecutor,
    orderId: string,
    vertical: ServiceVertical,
    status: OrderStatus,
  ): Promise<void> {
    await client.query(`UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2;`, [
      status,
      orderId,
    ]);
    if (vertical === 'INSTANT_GROCERY') {
      await client.query(`UPDATE sub_orders SET status = $1, updated_at = NOW() WHERE id = $2;`, [
        status,
        orderId,
      ]);
    } else if (vertical === 'RIDE_HAILING') {
      await client.query(`UPDATE rides SET status = $1, updated_at = NOW() WHERE id = $2;`, [
        status,
        orderId,
      ]);
    } else if (vertical === 'PARCEL_DELIVERY') {
      await client.query(`UPDATE parcels SET status = $1, updated_at = NOW() WHERE id = $2;`, [
        status,
        orderId,
      ]);
    }
  }

  private async recordFsmEvent(
    client: QueryExecutor,
    orderId: string,
    fromStatus: OrderStatus,
    toStatus: OrderStatus,
    actorId: string,
    actorRole: string,
    reason?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await client.query(
        `INSERT INTO order_events (order_id, from_status, to_status, actor_id, actor_role, reason, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW());`,
        [
          orderId,
          fromStatus,
          toStatus,
          actorId,
          actorRole,
          reason || null,
          JSON.stringify(metadata || {}),
        ],
      );
    } catch (err: any) {
      this.logger.debug(`Audit event insert note: ${err.message}`);
    }
  }

  private async broadcastLiveOrderState(result: FsmTransitionResult): Promise<void> {
    const payload = JSON.stringify({
      event: 'order:status_changed',
      stream: LIVE_ORDER_STREAM_CHANNEL,
      ...result,
    });

    try {
      // In-process event stream
      this.liveOrderStream.emit('order:status_changed', result);
      this.liveOrderStream.emit(`order:${result.orderId}`, result);

      // Redis Pub/Sub broadcast across nodes
      if (this.redis && typeof (this.redis as any).publish === 'function') {
        await (this.redis as any).publish(LIVE_ORDER_STREAM_CHANNEL, payload);
        await (this.redis as any).publish(
          `${LIVE_ORDER_STREAM_CHANNEL}:${result.orderId}`,
          payload,
        );
      }
    } catch (err: any) {
      this.logger.warn(`Failed to broadcast liveOrderStream event: ${err.message}`);
    }
  }
}
