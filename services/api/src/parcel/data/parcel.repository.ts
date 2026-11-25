import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

@Injectable()
export class ParcelRepository {
  constructor(private readonly db: DatabaseService) {}

  async getDefaultCityId(): Promise<string> {
    const res = await this.db.query('SELECT id FROM cities LIMIT 1;');
    return res.rows[0]?.id || '20000000-0000-0000-0000-000000000001';
  }

  async insertParcel(client: any, data: any): Promise<any> {
    const res = await client.query(
      `INSERT INTO parcels (
         parcel_number, sender_id, customer_id, partner_id, city_id, zone_id, status,
         pickup_address, pickup_location, pickup_contact_name, pickup_contact_phone,
         drop_address, drop_location, drop_contact_name, drop_contact_phone,
         package_category, vehicle_type, estimated_weight_kg, package_description, package_quantity,
         length_cm, width_cm, height_cm, declared_value_inr, handling_instructions, is_fragile,
         service_type, requested_pickup_time, price_snapshot, payment_method, payment_status,
         pickup_otp, delivery_otp, pickup_otp_hash, delivery_otp_hash, otp_expires_at,
         delivery_fee_inr, platform_fee_inr, tax_total_inr, total_amount_inr, partner_payout_inr
       ) VALUES (
         $1, $2, $2, NULL, $3, $4, $5,
         $6, ST_SetSRID(ST_MakePoint($7, $8), 4326), $9, $10,
         $11, ST_SetSRID(ST_MakePoint($12, $13), 4326), $14, $15,
         $16, $17, $18, $19, $20,
         $21, $22, $23, $24, $25, $26,
         $27, $28, $29, $30, $31,
         $32, $33, $34, $35, $36,
         $37, $38, $39, $40, $41
       ) RETURNING *;`,
      [
        data.parcelNumber,
        data.customerId,
        data.cityId,
        data.zoneId,
        data.initialStatus,
        data.pickupAddress,
        data.pickupLon,
        data.pickupLat,
        data.pickupContactName,
        data.pickupContactPhone,
        data.dropAddress,
        data.dropLon,
        data.dropLat,
        data.recipientName,
        data.recipientPhone,
        data.packageCategory,
        data.vehicleType || 'TWO_WHEELER',
        data.weightKg,
        data.packageDescription,
        data.packageQuantity,
        data.lengthCm,
        data.widthCm,
        data.heightCm,
        data.declaredValueInr,
        data.handlingInstructions,
        data.isFragile,
        data.serviceType,
        data.requestedPickupTime,
        data.priceSnapshot,
        data.paymentMethod,
        data.paymentStatus,
        data.pickupOtp,
        data.deliveryOtp,
        data.pickupOtpHash,
        data.deliveryOtpHash,
        data.otpExpiresAt,
        data.deliveryFeeInr,
        data.platformFeeInr,
        data.taxTotalInr,
        data.totalAmountInr,
        data.partnerPayoutInr,
      ],
    );
    return res.rows[0];
  }

  async findById(parcelId: string, client?: any): Promise<any | null> {
    const runner = client || this.db;
    const res = await runner.query('SELECT * FROM parcels WHERE id = $1;', [parcelId]);
    return res.rows[0] ?? null;
  }

  async findByIdWithDetails(parcelId: string): Promise<any> {
    const res = await this.db.query(
      `SELECT p.*,
              us.full_name as sender_name, us.phone as sender_phone,
              up.full_name as courier_name, up.phone as courier_phone
       FROM parcels p
       JOIN users us ON us.id = p.sender_id
       LEFT JOIN partners pt ON pt.id = p.partner_id
       LEFT JOIN users up ON up.id = pt.user_id
       WHERE p.id = $1;`,
      [parcelId],
    );
    if (res.rows.length === 0) {
      throw new NotFoundException(`Parcel booking ${parcelId} not found`);
    }
    return res.rows[0];
  }

  async updateParcelStatus(
    parcelId: string,
    status: string,
    additionalUpdates?: Record<string, any>,
    client?: any,
  ): Promise<any> {
    const runner = client || this.db;
    const updates = additionalUpdates || {};
    const setClauses: string[] = ['status = $1', 'updated_at = NOW()'];
    const params: any[] = [status];
    let idx = 2;

    for (const [key, val] of Object.entries(updates)) {
      setClauses.push(`${key} = $${idx++}`);
      params.push(val);
    }

    params.push(parcelId);
    const query = `UPDATE parcels SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *;`;
    const res = await runner.query(query, params);
    return res.rows[0];
  }

  async incrementPickupOtpAttempts(parcelId: string): Promise<void> {
    await this.db.query(
      `UPDATE parcels SET pickup_otp_attempts = pickup_otp_attempts + 1 WHERE id = $1;`,
      [parcelId],
    );
  }

  async incrementDeliveryOtpAttempts(parcelId: string): Promise<void> {
    await this.db.query(
      `UPDATE parcels SET delivery_otp_attempts = delivery_otp_attempts + 1 WHERE id = $1;`,
      [parcelId],
    );
  }

  async listByCustomerId(
    customerId: string,
    limit = 20,
    offset = 0,
    status?: string,
  ): Promise<any[]> {
    let query = `
      SELECT p.*, up.full_name as courier_name, up.phone as courier_phone
      FROM parcels p
      LEFT JOIN partners pt ON pt.id = p.partner_id
      LEFT JOIN users up ON up.id = pt.user_id
      WHERE (p.customer_id = $1 OR p.sender_id = $1)
    `;
    const params: any[] = [customerId];

    if (status) {
      params.push(status);
      query += ` AND p.status = $${params.length}`;
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2};`;
    params.push(limit, offset);

    const res = await this.db.query(query, params);
    return res.rows;
  }

  async getPartnerLocation(partnerId: string): Promise<any | null> {
    const res = await this.db.query(
      `SELECT ST_X(last_known_location::geometry) as longitude,
              ST_Y(last_known_location::geometry) as latitude,
              last_heartbeat_at
       FROM partner_availability_sessions
       WHERE partner_id = $1;`,
      [partnerId],
    );
    if (res.rows.length > 0 && res.rows[0].latitude) {
      return {
        latitude: Number(res.rows[0].latitude),
        longitude: Number(res.rows[0].longitude),
        updatedAt: res.rows[0].last_heartbeat_at,
      };
    }
    return null;
  }

  async findActiveByPartnerId(partnerId: string): Promise<any | null> {
    const res = await this.db.query(
      `SELECT p.*, us.full_name as sender_name, us.phone as sender_phone
       FROM parcels p
       JOIN users us ON us.id = p.sender_id
       WHERE p.partner_id = $1
         AND p.status IN ('PARTNER_ASSIGNED', 'PARTNER_ACCEPTED', 'ARRIVING_AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVING_AT_DESTINATION', 'RETURN_INITIATED', 'RETURN_IN_TRANSIT')
       ORDER BY p.updated_at DESC LIMIT 1;`,
      [partnerId],
    );
    return res.rows[0] ?? null;
  }

  async listByPartnerId(partnerId: string, limit = 20, offset = 0): Promise<any[]> {
    const res = await this.db.query(
      `SELECT * FROM parcels WHERE partner_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3;`,
      [partnerId, limit, offset],
    );
    return res.rows;
  }

  async adminList(filters: any): Promise<any[]> {
    let q = `
      SELECT p.*,
             us.full_name as sender_name, us.phone as sender_phone,
             up.full_name as courier_name, up.phone as courier_phone
      FROM parcels p
      JOIN users us ON us.id = p.sender_id
      LEFT JOIN partners pt ON pt.id = p.partner_id
      LEFT JOIN users up ON up.id = pt.user_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.status) {
      params.push(filters.status);
      q += ` AND p.status = $${params.length}`;
    }
    if (filters.serviceType) {
      params.push(filters.serviceType);
      q += ` AND p.service_type = $${params.length}`;
    }
    if (filters.search) {
      params.push(`%${filters.search}%`);
      q += ` AND (p.parcel_number ILIKE $${params.length} OR us.phone ILIKE $${params.length} OR p.drop_contact_phone ILIKE $${params.length})`;
    }

    q += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2};`;
    params.push(filters.limit || 50, filters.offset || 0);

    const res = await this.db.query(q, params);
    return res.rows;
  }

  async adminStats(): Promise<any> {
    const total = await this.db.query('SELECT COUNT(*)::int as count FROM parcels;');
    const active = await this.db.query(
      `SELECT COUNT(*)::int as count FROM parcels WHERE status IN ('SEARCHING_FOR_PARTNER', 'PARTNER_ASSIGNED', 'ARRIVING_AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVING_AT_DESTINATION');`,
    );
    const delivered = await this.db.query(
      `SELECT COUNT(*)::int as count FROM parcels WHERE status = 'DELIVERED';`,
    );
    const failed = await this.db.query(
      `SELECT COUNT(*)::int as count FROM parcels WHERE status IN ('DELIVERY_FAILED', 'RETURN_INITIATED', 'RETURN_IN_TRANSIT', 'RETURNED_TO_SENDER');`,
    );
    const revenue = await this.db.query(
      `SELECT COALESCE(SUM(total_amount_inr), 0)::numeric(12,2) as total FROM parcels WHERE status = 'DELIVERED';`,
    );

    return {
      totalBookings: total.rows[0]?.count || 0,
      activeDeliveries: active.rows[0]?.count || 0,
      completedDeliveries: delivered.rows[0]?.count || 0,
      failedOrReturned: failed.rows[0]?.count || 0,
      totalRevenueInr: Number(revenue.rows[0]?.total || 0),
    };
  }
}
