import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

@Injectable()
export class DeliveryProofRepository {
  constructor(private readonly db: DatabaseService) {}

  async insertProof(
    deliveryJobId: string,
    proofType: string,
    verifiedCode?: string | null,
    photoStorageKey?: string | null,
    partnerId?: string | null
  ): Promise<any> {
    const res = await this.db.query(
      `INSERT INTO delivery_proofs (
         delivery_job_id, proof_type, verified_code, photo_storage_key, collected_by_partner_id
       ) VALUES ($1, $2, $3, $4, $5) RETURNING *;`,
      [deliveryJobId, proofType, verifiedCode || null, photoStorageKey || null, partnerId || null]
    );
    return res.rows[0];
  }

  async insertPartnerEarnings(
    partnerId: string,
    deliveryJobId: string,
    entryType: string,
    baseAmount: number,
    surgeAmount: number,
    totalEarned: number,
    notes?: string
  ): Promise<any> {
    const res = await this.db.query(
      `INSERT INTO partner_earnings_entries (
         partner_id, delivery_job_id, entry_type, base_amount_inr, surge_amount_inr, total_earned_inr, notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;`,
      [partnerId, deliveryJobId, entryType, baseAmount, surgeAmount, totalEarned, notes || null]
    );
    return res.rows[0];
  }

  async listProofsByJobId(deliveryJobId: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT * FROM delivery_proofs WHERE delivery_job_id = $1 ORDER BY created_at DESC;`,
      [deliveryJobId]
    );
    return res.rows;
  }
}
