import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

export interface OrderEventData {
  orderGroupId: string;
  subOrderId: string;
  actorId: string;
  eventType: string;
  fromStatus: string;
  toStatus: string;
  notes?: string;
}

@Injectable()
export class OrderEventRepository {
  constructor(private readonly db: DatabaseService) {}

  async recordEvent(event: OrderEventData, client?: any): Promise<any> {
    const runner = client || this.db;
    const res = await runner.query(
      `INSERT INTO order_events (
         order_group_id, sub_order_id, actor_id, event_type, from_status, to_status, notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;`,
      [
        event.orderGroupId,
        event.subOrderId,
        event.actorId,
        event.eventType,
        event.fromStatus,
        event.toStatus,
        event.notes || null,
      ],
    );
    return res.rows[0];
  }

  async listEventsBySubOrder(subOrderId: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT id, event_type, from_status, to_status, notes, created_at
       FROM order_events WHERE sub_order_id = $1 ORDER BY created_at ASC;`,
      [subOrderId],
    );
    return res.rows;
  }
}
