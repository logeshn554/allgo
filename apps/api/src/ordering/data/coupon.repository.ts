import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { CreateCouponDto } from '../dto/ordering.dto.js';

@Injectable()
export class CouponRepository {
  constructor(private readonly db: DatabaseService) {}

  async listActiveCoupons(): Promise<any[]> {
    const res = await this.db.query(
      `SELECT id, code, title, vertical_type, outlet_id, category_id,
              is_auto_applied, new_customer_only, max_total_redemptions, total_redeemed_count,
              discount_percentage, flat_discount_inr,
              min_order_amount_inr, max_discount_inr, usage_limit_per_user,
              valid_from, valid_until, is_active
       FROM coupons
       WHERE is_active = TRUE AND valid_from <= NOW() AND valid_until >= NOW()
       ORDER BY is_auto_applied DESC, discount_percentage DESC NULLS LAST, flat_discount_inr DESC NULLS LAST;`
    );
    return res.rows;
  }

  async findActiveCouponByCode(code: string): Promise<any | null> {
    const res = await this.db.query(
      `SELECT * FROM coupons
       WHERE code = $1 AND is_active = TRUE
         AND valid_from <= NOW() AND valid_until >= NOW();`,
      [code.trim().toUpperCase()]
    );
    return res.rows[0] ?? null;
  }

  async countCustomerOrders(customerId: string): Promise<number> {
    const res = await this.db.query(
      `SELECT COUNT(*)::int as count FROM sub_orders so
       JOIN order_groups og ON og.id = so.order_group_id
       WHERE og.customer_id = $1 AND so.status != 'CANCELLED';`,
      [customerId]
    );
    return res.rows[0]?.count || 0;
  }

  async countUserRedemptions(couponId: string, customerId: string): Promise<number> {
    const res = await this.db.query(
      `SELECT COUNT(*)::int as count FROM coupon_redemptions WHERE coupon_id = $1 AND customer_id = $2;`,
      [couponId, customerId]
    );
    return res.rows[0]?.count || 0;
  }

  async findAutoAppliedCandidates(outletId: string, subtotalInr: number): Promise<any[]> {
    const res = await this.db.query(
      `SELECT * FROM coupons
       WHERE is_auto_applied = TRUE AND is_active = TRUE
         AND valid_from <= NOW() AND valid_until >= NOW()
         AND (outlet_id IS NULL OR outlet_id = $1)
         AND (min_order_amount_inr <= $2)
         AND (max_total_redemptions IS NULL OR total_redeemed_count < max_total_redemptions)
       ORDER BY discount_percentage DESC NULLS LAST, flat_discount_inr DESC NULLS LAST;`,
      [outletId, subtotalInr]
    );
    return res.rows;
  }

  async listOutletCoupons(outletId: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT * FROM coupons
       WHERE is_active = TRUE AND valid_from <= NOW() AND valid_until >= NOW()
         AND (outlet_id IS NULL OR outlet_id = $1)
       ORDER BY is_auto_applied DESC, min_order_amount_inr ASC;`,
      [outletId]
    );
    return res.rows;
  }

  async insertCoupon(dto: CreateCouponDto): Promise<any> {
    const res = await this.db.query(
      `INSERT INTO coupons (
         code, title, vertical_type, outlet_id, category_id,
         is_auto_applied, new_customer_only, max_total_redemptions, total_redeemed_count,
         discount_percentage, flat_discount_inr, min_order_amount_inr,
         max_discount_inr, usage_limit_per_user, valid_from, valid_until, is_active
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10, $11, $12, $13, COALESCE($14, NOW()), $15, COALESCE($16, TRUE)
       ) RETURNING *;`,
      [
        dto.code.trim().toUpperCase(),
        dto.title || null,
        dto.verticalType || 'FOOD',
        dto.outletId || null,
        dto.categoryId || null,
        dto.isAutoApplied ?? false,
        dto.newCustomerOnly ?? false,
        dto.maxTotalRedemptions || null,
        dto.discountPercentage || null,
        dto.flatDiscountInr || null,
        dto.minOrderAmountInr || 0,
        dto.maxDiscountInr || null,
        dto.usageLimitPerUser || 1,
        dto.validFrom || null,
        dto.validUntil,
        dto.isActive ?? true,
      ]
    );
    return res.rows[0];
  }

  async insertPromotionAuditLog(
    actorId: string,
    targetType: string,
    targetId: string,
    action: string,
    previousState: any,
    newState: any,
    reason: string
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO promotion_pricing_audit_logs (actor_id, target_type, target_id, action, previous_state, new_state, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7);`,
      [
        actorId,
        targetType,
        targetId,
        action,
        previousState ? JSON.stringify(previousState) : null,
        newState ? JSON.stringify(newState) : null,
        reason,
      ]
    );
  }

  async findCouponById(id: string): Promise<any | null> {
    const res = await this.db.query(`SELECT * FROM coupons WHERE id = $1;`, [id]);
    return res.rows[0] ?? null;
  }

  async updateCouponActive(couponId: string, isActive: boolean): Promise<any> {
    const res = await this.db.query(
      `UPDATE coupons SET is_active = $1 WHERE id = $2 RETURNING *;`,
      [isActive, couponId]
    );
    return res.rows[0] ?? null;
  }

  async incrementCouponRedemptions(client: any, couponId: string): Promise<any> {
    const res = await client.query(
      `UPDATE coupons
       SET total_redeemed_count = total_redeemed_count + 1
       WHERE id = $1
         AND (max_total_redemptions IS NULL OR total_redeemed_count < max_total_redemptions)
       RETURNING id, code, total_redeemed_count, max_total_redemptions;`,
      [couponId]
    );
    return res.rows[0] ?? null;
  }

  async insertCouponRedemption(
    client: any,
    couponId: string,
    customerId: string,
    orderId: string,
    couponCode: string,
    discountInr: number
  ): Promise<any> {
    const res = await client.query(
      `INSERT INTO coupon_redemptions (coupon_id, customer_id, order_group_id, coupon_code, discount_amount_inr)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *;`,
      [couponId, customerId, orderId, couponCode, discountInr]
    );
    return res.rows[0];
  }
}
