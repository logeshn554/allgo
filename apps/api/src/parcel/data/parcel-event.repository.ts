import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

export interface ParcelDeliveryEventRecord {
  parcelId: string;
  eventType: string;
  fromStatus?: string | null;
  toStatus: string;
  actorId?: string | null;
  actorRole: string;
  reason?: string | null;
  metadata?: any;
}

@Injectable()
export class ParcelEventRepository {
  constructor(private readonly db: DatabaseService) {}

  async recordEvent(event: ParcelDeliveryEventRecord, client?: any): Promise<any> {
    const runner = client || this.db;
    const res = await runner.query(
      `INSERT INTO parcel_delivery_events (
         parcel_id, event_type, from_status, to_status, actor_id, actor_role, reason, metadata
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;`,
      [
        event.parcelId,
        event.eventType,
        event.fromStatus || null,
        event.toStatus,
        event.actorId || null,
        event.actorRole,
        event.reason || null,
        event.metadata ? JSON.stringify(event.metadata) : null,
      ]
    );
    return res.rows[0];
  }

  async listEventsByParcelId(parcelId: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT e.*, u.full_name as actor_name
       FROM parcel_delivery_events e
       LEFT JOIN users u ON u.id = e.actor_id
       WHERE e.parcel_id = $1
       ORDER BY e.created_at ASC;`,
      [parcelId]
    );
    return res.rows.map((r: any) => ({
      id: r.id,
      eventType: r.event_type,
      fromStatus: r.from_status,
      toStatus: r.to_status,
      actorRole: r.actor_role,
      actorName: r.actor_name,
      reason: r.reason,
      metadata: r.metadata,
      createdAt: r.created_at,
    }));
  }
}
