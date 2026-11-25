import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

export interface CancellationRecordData {
  subOrderId: string;
  cancelledByUserId: string;
  roleAtCancellation: string;
  reason: string;
  stageAtCancellation: string;
  refundAmountInr: number;
  refundId?: string | null;
}

@Injectable()
export class OrderCancellationRepository {
  constructor(private readonly db: DatabaseService) {}

  async recordCancellation(data: CancellationRecordData, client?: any): Promise<any> {
    const runner = client || this.db;
    const res = await runner.query(
      `INSERT INTO order_cancellations (
         sub_order_id, cancelled_by_user_id, role_at_cancellation, reason,
         stage_at_cancellation, refund_eligible, refund_amount_inr, refund_id
       ) VALUES ($1, $2, $3, $4, $5, TRUE, $6, $7) RETURNING *;`,
      [
        data.subOrderId,
        data.cancelledByUserId,
        data.roleAtCancellation,
        data.reason,
        data.stageAtCancellation,
        data.refundAmountInr,
        data.refundId || null,
      ],
    );
    return res.rows[0];
  }
}
