import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { TriggerSosDto } from '../dto/mobility.dto.js';

@Injectable()
export class RideEventRepository {
  private readonly logger = new Logger(RideEventRepository.name);

  constructor(private readonly db: DatabaseService) {}

  async recordRideEvent(
    rideId: string,
    eventType: string,
    actorRole: string = 'SYSTEM',
    actorId?: string | null,
    fromStatus?: string | null,
    toStatus?: string | null,
    metadata: any = {}
  ): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO ride_events (
           ride_id, event_type, actor_role, actor_id, from_status, to_status, metadata, payload
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7);`,
        [
          rideId,
          eventType,
          actorRole,
          actorId || null,
          fromStatus || null,
          toStatus || null,
          JSON.stringify(metadata || {}),
        ]
      );
    } catch (e: any) {
      this.logger.warn(`Failed to append immutable ride event ${eventType}: ${e.message}`);
    }
  }

  async recordEarningsEntry(partnerId: string, amount: number, notes: string): Promise<void> {
    await this.db.query(
      `INSERT INTO partner_earnings_entries (
         partner_id, entry_type, base_amount_inr, total_earned_inr, notes
       ) VALUES ($1, 'DELIVERY_PAY', $2, $3, $4);`,
      [partnerId, amount, amount, notes]
    );
  }

  async insertSosEvent(rideId: string, userId: string, role: string, dto: TriggerSosDto): Promise<any> {
    const res = await this.db.query(
      `INSERT INTO mobility_sos_events (
         ride_id, triggered_by_user_id, trigger_role,
         location, status, resolution_notes
       ) VALUES (
         $1, $2, $3,
         ${dto.longitude && dto.latitude ? `ST_SetSRID(ST_MakePoint(${dto.longitude}, ${dto.latitude}), 4326)` : 'NULL'},
         'TRIGGERED', $4
       ) RETURNING *;`,
      [rideId, userId, role, dto.notes || 'Emergency assistance requested via in-app SOS button']
    );
    return res.rows[0];
  }

  async getRideEvents(rideId: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT id, event_type, actor_role, actor_id, from_status, to_status, metadata, created_at
       FROM ride_events
       WHERE ride_id = $1
       ORDER BY created_at ASC;`,
      [rideId]
    );
    return res.rows;
  }
}
