import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

export interface DeliveryEventRecord {
  deliveryJobId: string;
  fromStatus?: string | null;
  toStatus: string;
  actorId?: string | null;
  actorRole: string;
  reason?: string | null;
}

@Injectable()
export class DeliveryEventRepository {
  constructor(private readonly db: DatabaseService) {}

  async recordEvent(event: DeliveryEventRecord): Promise<any> {
    const res = await this.db.query(
      `INSERT INTO delivery_status_events (delivery_job_id, from_status, to_status, actor_id, actor_role, reason)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;`,
      [
        event.deliveryJobId,
        event.fromStatus || null,
        event.toStatus,
        event.actorId || null,
        event.actorRole,
        event.reason || null,
      ],
    );
    return res.rows[0];
  }

  async listEventsByJobId(deliveryJobId: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT * FROM delivery_status_events WHERE delivery_job_id = $1 ORDER BY created_at ASC;`,
      [deliveryJobId],
    );
    return res.rows;
  }
}
