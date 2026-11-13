import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { RegisterMerchantDto } from '../dto/register-merchant.dto.js';
import { CreateOutletDto } from '../dto/create-outlet.dto.js';

@Injectable()
export class MerchantOutletRepository {
  constructor(private readonly db: DatabaseService) {}

  async findPrimaryOutlet(merchantId: string): Promise<any> {
    const res = await this.db.query(
      `SELECT o.*, ST_Y(o.location::geometry) as latitude, ST_X(o.location::geometry) as longitude
       FROM outlets o
       WHERE o.merchant_id = $1
       ORDER BY o.created_at ASC LIMIT 1;`,
      [merchantId]
    );
    return res.rows[0] || null;
  }

  async findOutletById(outletId: string): Promise<any> {
    const res = await this.db.query('SELECT id, merchant_id FROM outlets WHERE id = $1;', [outletId]);
    return res.rows[0] || null;
  }

  async updateOutlet(outletId: string, dto: RegisterMerchantDto): Promise<any> {
    const res = await this.db.query(
      `UPDATE outlets
       SET outlet_name = $1,
           address_line1 = $2,
           address_line2 = $3,
           postal_code = $4,
           location = ST_SetSRID(ST_MakePoint($5, $6), 4326),
           phone = $7,
           default_prep_time_minutes = $8,
           packaging_fee_inr = $9,
           updated_at = NOW()
       WHERE id = $10
       RETURNING *, ST_Y(location::geometry) as latitude, ST_X(location::geometry) as longitude;`,
      [
        dto.outletName,
        dto.addressLine1,
        dto.addressLine2 || null,
        dto.postalCode,
        dto.longitude,
        dto.latitude,
        dto.phone,
        dto.defaultPrepTimeMinutes ?? 15,
        dto.packagingFeeInr ?? 10.00,
        outletId,
      ]
    );
    return res.rows[0];
  }

  async insertOutlet(merchantId: string, zoneId: string, dto: RegisterMerchantDto): Promise<any> {
    const res = await this.db.query(
      `INSERT INTO outlets (
         merchant_id, zone_id, outlet_name, address_line1, address_line2,
         postal_code, location, phone, default_prep_time_minutes, packaging_fee_inr, is_open
       ) VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_MakePoint($7, $8), 4326), $9, $10, $11, TRUE)
       RETURNING *, ST_Y(location::geometry) as latitude, ST_X(location::geometry) as longitude;`,
      [
        merchantId,
        zoneId,
        dto.outletName,
        dto.addressLine1,
        dto.addressLine2 || null,
        dto.postalCode,
        dto.longitude,
        dto.latitude,
        dto.phone,
        dto.defaultPrepTimeMinutes ?? 15,
        dto.packagingFeeInr ?? 10.00,
      ]
    );
    return res.rows[0];
  }

  async insertBranchOutlet(outletId: string, merchantId: string, zoneId: string, dto: CreateOutletDto): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO outlets 
          (id, merchant_id, zone_id, outlet_name, address_line1, address_line2, postal_code, location, is_open, outlet_status, default_prep_time_minutes, packaging_fee_inr, phone)
         VALUES ($1, $2, $3, $4, $5, $6, $7, ST_SetSRID(ST_MakePoint($8, $9), 4326), FALSE, 'PENDING_APPROVAL', $10, $11, $12);`,
        [
          outletId,
          merchantId,
          zoneId,
          dto.outletName.trim(),
          dto.addressLine1.trim(),
          dto.addressLine2 ? dto.addressLine2.trim() : null,
          dto.postalCode.trim(),
          dto.longitude,
          dto.latitude,
          dto.defaultPrepTimeMinutes || 15,
          dto.packagingFeeInr || 10.0,
          dto.phone.trim(),
        ]
      );
    } catch {
      // offline
    }
  }

  async updateOutletAvailability(outletId: string, isOpen: boolean, defaultPrepTimeMinutes?: number): Promise<any> {
    const updates: string[] = ['is_open = $1', 'updated_at = NOW()'];
    const params: any[] = [isOpen];

    if (defaultPrepTimeMinutes !== undefined) {
      params.push(defaultPrepTimeMinutes);
      updates.push(`default_prep_time_minutes = $${params.length}`);
    }

    params.push(outletId);
    const res = await this.db.query(
      `UPDATE outlets SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *;`,
      params
    );
    return res.rows[0];
  }

  async setOutletsOpenByMerchantId(merchantId: string, isOpen: boolean, onlyActive = false): Promise<void> {
    if (isOpen) {
      const sql = onlyActive
        ? "UPDATE outlets SET is_open = TRUE WHERE merchant_id = $1 AND outlet_status = 'ACTIVE';"
        : 'UPDATE outlets SET is_open = TRUE WHERE merchant_id = $1;';
      await this.db.query(sql, [merchantId]);
    } else {
      await this.db.query('UPDATE outlets SET is_open = FALSE WHERE merchant_id = $1;', [merchantId]);
    }
  }

  async listOutletsByMerchantId(merchantId: string): Promise<any[]> {
    try {
      const res = await this.db.query(
        `SELECT o.*, ST_Y(o.location::geometry) as latitude, ST_X(o.location::geometry) as longitude
         FROM outlets o
         WHERE o.merchant_id = $1
         ORDER BY o.created_at ASC;`,
        [merchantId]
      );
      return res.rows;
    } catch {
      return [];
    }
  }

  async updateAdminOutletStatus(outletId: string, newStatus: string, isOpen: boolean): Promise<void> {
    try {
      await this.db.query(
        `UPDATE outlets 
         SET outlet_status = $1, is_open = $2, updated_at = NOW() 
         WHERE id = $3;`,
        [newStatus, isOpen, outletId]
      );
    } catch {
      // offline
    }
  }
}
