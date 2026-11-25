import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

@Injectable()
export class DeliveryExceptionRepository {
  constructor(private readonly db: DatabaseService) {}

  async recordCancellation(
    deliveryJobId: string,
    cancelledById: string,
    cancelledByRole: string,
    reasonCode: string,
    reasonDetails?: string | null,
    jobStatusAtCancellation?: string,
  ): Promise<any> {
    const res = await this.db.query(
      `INSERT INTO delivery_cancellation_records (
         delivery_job_id, cancelled_by_id, cancelled_by_role, reason_code, reason_details, job_status_at_cancellation
       ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;`,
      [
        deliveryJobId,
        cancelledById,
        cancelledByRole,
        reasonCode,
        reasonDetails || null,
        jobStatusAtCancellation,
      ],
    );
    return res.rows[0];
  }

  async recordException(
    deliveryJobId: string,
    partnerId: string | null,
    exceptionType: string,
    details: string,
  ): Promise<any> {
    const res = await this.db.query(
      `INSERT INTO delivery_exception_records (delivery_job_id, partner_id, exception_type, details, status)
       VALUES ($1, $2, $3, $4, 'OPEN') RETURNING *;`,
      [deliveryJobId, partnerId, exceptionType, details],
    );
    return res.rows[0];
  }

  async listExceptions(status?: string): Promise<any[]> {
    let query = `
      SELECT ex.*, j.job_number, j.status as job_status, up.full_name as partner_name
      FROM delivery_exception_records ex
      JOIN delivery_jobs j ON j.id = ex.delivery_job_id
      LEFT JOIN partners p ON p.id = ex.partner_id
      LEFT JOIN users up ON up.id = p.user_id
    `;
    const params: any[] = [];
    if (status) {
      query += ` WHERE ex.status = $1`;
      params.push(status);
    }
    query += ` ORDER BY ex.created_at DESC;`;
    const res = await this.db.query(query, params);
    return res.rows;
  }

  async getCancellationByJobId(deliveryJobId: string): Promise<any | null> {
    const res = await this.db.query(
      `SELECT * FROM delivery_cancellation_records WHERE delivery_job_id = $1 ORDER BY created_at DESC LIMIT 1;`,
      [deliveryJobId],
    );
    return res.rows[0] ?? null;
  }

  async listExceptionsByJobId(deliveryJobId: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT * FROM delivery_exception_records WHERE delivery_job_id = $1 ORDER BY created_at DESC;`,
      [deliveryJobId],
    );
    return res.rows;
  }
}
