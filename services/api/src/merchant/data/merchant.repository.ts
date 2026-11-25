import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { RegisterMerchantDto } from '../dto/register-merchant.dto.js';

@Injectable()
export class MerchantRepository {
  constructor(private readonly db: DatabaseService) {}

  async findMerchantByOwnerId(userId: string): Promise<any> {
    const res = await this.db.query(
      `SELECT m.*, u.phone as owner_phone, u.full_name as owner_name, u.email as owner_email
       FROM merchants m
       JOIN users u ON u.id = m.owner_id
       WHERE m.owner_id = $1;`,
      [userId],
    );
    return res.rows[0] || null;
  }

  async findUserById(userId: string): Promise<any> {
    const res = await this.db.query('SELECT id, phone FROM users WHERE id = $1;', [userId]);
    return res.rows[0] || null;
  }

  async findActiveZoneId(): Promise<string> {
    try {
      const res = await this.db.query('SELECT id FROM zones WHERE is_active = TRUE LIMIT 1;');
      if (res.rows.length > 0) return res.rows[0].id;
    } catch {
      // offline fallback
    }
    return '00000000-0000-0000-0000-000000000001';
  }

  async updateMerchant(
    existingMerchantId: string,
    dto: RegisterMerchantDto,
    newStatus: string,
  ): Promise<any> {
    const res = await this.db.query(
      `UPDATE merchants
       SET business_name = $1,
           trade_name = $1,
           merchant_type = $2,
           pan_number = $3,
           gstin = $4,
           fssai_license_number = $5,
           bank_account_number = $6,
           bank_ifsc = $7,
           bank_beneficiary_name = $8,
           status = $9,
           updated_at = NOW()
       WHERE id = $10
       RETURNING *;`,
      [
        dto.businessName,
        dto.merchantType,
        dto.panNumber,
        dto.gstin || null,
        dto.fssaiLicenseNumber || null,
        dto.bankAccountNumber,
        dto.bankIfsc,
        dto.bankBeneficiaryName,
        newStatus,
        existingMerchantId,
      ],
    );
    return res.rows[0];
  }

  async insertMerchant(userId: string, dto: RegisterMerchantDto): Promise<any> {
    const res = await this.db.query(
      `INSERT INTO merchants (
         owner_id, business_name, trade_name, merchant_type, pan_number, gstin,
         fssai_license_number, bank_account_number, bank_ifsc, bank_beneficiary_name, status
       ) VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, $9, 'SUBMITTED')
       RETURNING *;`,
      [
        userId,
        dto.businessName,
        dto.merchantType,
        dto.panNumber,
        dto.gstin || null,
        dto.fssaiLicenseNumber || null,
        dto.bankAccountNumber,
        dto.bankIfsc,
        dto.bankBeneficiaryName,
      ],
    );
    return res.rows[0];
  }

  async ensureMerchantAdminRole(userId: string): Promise<void> {
    const roleRes = await this.db.query(
      "SELECT id FROM roles WHERE name = 'MERCHANT_ADMIN' OR name = 'MERCHANT';",
    );
    if (roleRes.rows.length > 0) {
      const roleId = roleRes.rows[0].id;
      await this.db.query(
        `INSERT INTO user_roles (user_id, role_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING;`,
        [userId, roleId],
      );
    }
  }

  async listAdminMerchants(
    limit: number,
    offset: number,
    status?: string,
  ): Promise<{ merchants: any[]; total: number }> {
    let query = `
      SELECT m.*, u.phone as owner_phone, u.full_name as owner_name, u.email as owner_email,
             o.outlet_name, o.address_line1, o.postal_code, o.is_open
      FROM merchants m
      JOIN users u ON u.id = m.owner_id
      LEFT JOIN outlets o ON o.merchant_id = m.id
    `;
    const params: any[] = [];
    if (status) {
      params.push(status);
      query += ` WHERE m.status = $${params.length}`;
    }
    query += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2};`;
    params.push(limit, offset);

    const res = await this.db.query(query, params);
    const countRes = await this.db.query('SELECT COUNT(*) FROM merchants;');
    return {
      merchants: res.rows,
      total: Number.parseInt(countRes.rows[0]?.count || '0', 10),
    };
  }

  async findAdminMerchantById(merchantId: string): Promise<any> {
    const res = await this.db.query(
      `SELECT m.*, u.phone as owner_phone, u.full_name as owner_name, u.email as owner_email,
              o.id as outlet_id, o.outlet_name, o.address_line1, o.address_line2, o.postal_code, o.is_open,
              ST_Y(o.location::geometry) as latitude, ST_X(o.location::geometry) as longitude
       FROM merchants m
       JOIN users u ON u.id = m.owner_id
       LEFT JOIN outlets o ON o.merchant_id = m.id
       WHERE m.id = $1;`,
      [merchantId],
    );
    return res.rows[0] || null;
  }

  async updateMerchantStatus(merchantId: string, status: string): Promise<any> {
    const res = await this.db.query(
      `UPDATE merchants
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *;`,
      [status, merchantId],
    );
    return res.rows[0] || null;
  }

  async setMerchantStatusSubmitted(merchantId: string): Promise<void> {
    await this.db.query(
      `UPDATE merchants SET status = 'SUBMITTED', updated_at = NOW() WHERE id = $1;`,
      [merchantId],
    );
  }

  async recordAuditLog(
    actorId: string,
    action: string,
    entityType: string,
    entityId: string,
    newState: string,
    reason?: string | null,
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_state, reason)
       VALUES ($1, $2, $3, $4, $5, $6);`,
      [actorId, action, entityType, entityId, newState, reason || null],
    );
  }
}
