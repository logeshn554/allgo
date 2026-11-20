import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
@Injectable()
export class OrderRepository {
  constructor(private readonly db: DatabaseService) {}
  async findSessionByIdempotency(key: string): Promise<any | null> {
    const res = await this.db.query(
      `SELECT cs.id, og.id as order_group_id, so.id as sub_order_id, so.sub_order_number
       FROM checkout_sessions cs JOIN order_groups og ON og.checkout_session_id = cs.id
       JOIN sub_orders so ON so.order_group_id = og.id WHERE cs.idempotency_key = $1;`,
      [key]
    );
    return res.rows[0] ?? null;
  }
  async insertCheckoutSession(client: any, data: any): Promise<void> {
    await client.query(
      `INSERT INTO checkout_sessions (id, customer_id, delivery_address_id, status, selected_fulfillment_mode,
         total_item_amount_inr, total_delivery_fee_inr, total_packaging_fee_inr, platform_fee_inr, total_tax_inr,
         total_discount_inr, final_payable_amount_inr, idempotency_key, expires_at)
       VALUES ($1, $2, $3, 'ACTIVE', 'SEPARATE', $4, $5, $6, $7, $8, $9, $10, $11, $12);`,
      [data.id, data.customerId, data.deliveryAddressId, data.itemsSubtotalInr, data.deliveryFeeInr,
       data.packagingFeeInr, data.platformFeeInr, data.gstAmountInr, data.discountAmountInr,
       data.finalPayableAmountInr, data.idempotencyKey, data.expiresAt]
    );
  }
  async insertOrderGroup(client: any, data: any): Promise<string> {
    const res = await client.query(
      `INSERT INTO order_groups (customer_id, checkout_session_id, order_group_number, status, fulfillment_mode,
         total_items_amount_inr, total_delivery_fees_inr, total_packaging_fees_inr, platform_fee_inr, total_tax_amount_inr,
         total_discount_amount_inr, total_paid_amount_inr, delivery_address_id)
       VALUES ($1, $2, $3, 'PLACED', 'SEPARATE', $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id;`,
      [data.customerId, data.checkoutSessionId, data.orderGroupNumber, data.itemsSubtotalInr, data.deliveryFeeInr,
       data.packagingFeeInr, data.platformFeeInr, data.gstAmountInr, data.discountAmountInr,
       data.finalPayableAmountInr, data.deliveryAddressId]
    );
    return res.rows[0].id;
  }
  async insertSubOrder(client: any, data: any): Promise<{ id: string; sub_order_number: string }> {
    const res = await client.query(
      `INSERT INTO sub_orders (order_group_id, outlet_id, sub_order_number, vertical_type, status,
         items_total_inr, packaging_fee_inr, delivery_fee_inr, platform_fee_inr, merchant_commission_inr,
         merchant_net_payout_inr, tax_total_inr, discount_allocated_inr, total_payable_inr, prep_time_minutes,
         delivery_address_snapshot, delivery_instructions, customer_notes)
       VALUES ($1, $2, $3, 'FOOD', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 20, $14::jsonb, $15, $16)
       RETURNING id, sub_order_number;`,
      [data.orderGroupId, data.outletId, data.subOrderNumber, data.status, data.itemsSubtotalInr,
       data.packagingFeeInr, data.deliveryFeeInr, data.platformFeeInr, data.merchantCommission,
       data.merchantNetPayout, data.gstAmountInr, data.discountAmountInr, data.finalPayableAmountInr,
       JSON.stringify(data.address), data.deliveryInstructions, data.customerNotes]
    );
    return res.rows[0];
  }
  async insertOrderItem(client: any, data: any): Promise<string> {
    const res = await client.query(
      `INSERT INTO order_items (sub_order_id, item_id, item_name_snapshot, unit_price_inr, quantity, total_price_inr, gst_rate_percentage, gst_amount_inr)
       VALUES ($1, $2, $3, $4, $5, $6, 5.0, $7) RETURNING id;`,
      [data.subOrderId, data.itemId, data.itemName, data.unitPriceInr, data.quantity, data.totalPriceInr, data.gstAmountInr]
    );
    return res.rows[0].id;
  }
  async insertCustomization(client: any, data: any): Promise<void> {
    await client.query(
      `INSERT INTO order_item_customizations (order_item_id, group_id, group_name_snapshot, option_id, option_name_snapshot, price_adjustment_inr)
       VALUES ($1, $2, $3, $4, $5, $6);`,
      [data.orderItemId, data.groupId, data.groupName, data.optionId, data.optionName, data.priceInr]
    );
  }
  async findCouponByCode(client: any, code: string): Promise<any | null> {
    const res = await client.query(`SELECT id FROM coupons WHERE code = $1;`, [code]);
    return res.rows[0] ?? null;
  }
  async incrementCouponRedemptions(client: any, couponId: string): Promise<boolean> {
    const res = await client.query(
      `UPDATE coupons SET total_redeemed_count = total_redeemed_count + 1
       WHERE id = $1 AND (max_total_redemptions IS NULL OR total_redeemed_count < max_total_redemptions) RETURNING id;`,
      [couponId]
    );
    return res.rows.length > 0;
  }
  async insertCouponRedemption(client: any, data: any): Promise<void> {
    await client.query(
      `INSERT INTO coupon_redemptions (coupon_id, customer_id, order_group_id, sub_order_id, coupon_code, discount_amount_inr)
       VALUES ($1, $2, $3, $4, $5, $6);`,
      [data.couponId, data.customerId, data.orderGroupId, data.subOrderId, data.couponCode, data.discountInr]
    );
  }
  async insertDiscountAllocation(client: any, data: any): Promise<void> {
    await client.query(
      `INSERT INTO discount_allocations (order_group_id, sub_order_id, coupon_code, discount_type, allocated_amount_inr)
       VALUES ($1, $2, $3, 'COUPON', $4);`,
      [data.orderGroupId, data.subOrderId, data.couponCode, data.discountInr]
    );
  }
  async clearCart(client: any, cartId: string): Promise<void> {
    await client.query(`DELETE FROM cart_items WHERE cart_id = $1;`, [cartId]);
  }
  async findSubOrderForMerchant(subOrderId: string, merchantUserId: string): Promise<any | null> {
    const res = await this.db.query(
      `SELECT so.*, cs.id as checkout_session_id, o.outlet_name, o.merchant_id
       FROM sub_orders so JOIN outlets o ON o.id = so.outlet_id
       JOIN merchants m ON m.id = o.merchant_id JOIN order_groups og ON og.id = so.order_group_id
       JOIN checkout_sessions cs ON cs.id = og.checkout_session_id
       WHERE so.id = $1 AND m.owner_id = $2;`,
      [subOrderId, merchantUserId]
    );
    return res.rows[0] ?? null;
  }
  async updateSubOrderAccepted(subOrderId: string, prepTimeMinutes: number, estimatedReadyAt: Date): Promise<any> {
    const res = await this.db.query(
      `UPDATE sub_orders SET status = 'MERCHANT_ACCEPTED', prep_time_minutes = $1, estimated_ready_at = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *;`,
      [prepTimeMinutes, estimatedReadyAt, subOrderId]
    );
    return res.rows[0];
  }
  async updateSubOrderStatus(subOrderId: string, status: string): Promise<any> {
    const res = await this.db.query(
      `UPDATE sub_orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *;`,
      [status, subOrderId]
    );
    return res.rows[0];
  }
  async findSubOrderForReady(subOrderId: string, merchantUserId: string): Promise<any | null> {
    const res = await this.db.query(
      `SELECT so.*, og.customer_id, u.full_name as customer_name, u.phone as customer_phone,
              o.outlet_name, o.address_line1 as outlet_address, o.phone as outlet_phone,
              ST_Y(o.location::geometry) as outlet_lat, ST_X(o.location::geometry) as outlet_lng
       FROM sub_orders so JOIN outlets o ON o.id = so.outlet_id
       JOIN merchants m ON m.id = o.merchant_id JOIN order_groups og ON og.id = so.order_group_id
       JOIN users u ON u.id = og.customer_id WHERE so.id = $1 AND m.owner_id = $2;`,
      [subOrderId, merchantUserId]
    );
    return res.rows[0] ?? null;
  }
  async findOrderItemsSnapshot(subOrderId: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT item_name_snapshot as name, quantity, total_price_inr as price FROM order_items WHERE sub_order_id = $1;`,
      [subOrderId]
    );
    return res.rows;
  }
  async linkDeliveryJob(subOrderId: string, deliveryJobId: string): Promise<void> {
    await this.db.query(`UPDATE delivery_jobs SET sub_order_id = $1 WHERE id = $2;`, [subOrderId, deliveryJobId]);
  }
  async markSubOrderReady(subOrderId: string, deliveryJobId: string): Promise<any> {
    const res = await this.db.query(
      `UPDATE sub_orders SET status = 'READY', actual_ready_at = NOW(), delivery_job_id = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *;`,
      [deliveryJobId, subOrderId]
    );
    return res.rows[0];
  }
  async markSubOrderRejected(subOrderId: string, reason: string): Promise<any> {
    const res = await this.db.query(
      `UPDATE sub_orders SET status = 'CANCELLED', rejected_reason = $1, rejected_at = NOW(), updated_at = NOW()
       WHERE id = $2 RETURNING *;`,
      [reason, subOrderId]
    );
    return res.rows[0];
  }
  async findSubOrderForCancellation(subOrderId: string): Promise<any | null> {
    const res = await this.db.query(
      `SELECT so.*, cs.id as checkout_session_id, og.customer_id FROM sub_orders so
       JOIN order_groups og ON og.id = so.order_group_id
       JOIN checkout_sessions cs ON cs.id = og.checkout_session_id WHERE so.id = $1;`,
      [subOrderId]
    );
    return res.rows[0] ?? null;
  }
  async markSubOrderCancelled(subOrderId: string, reason: string, userId: string): Promise<any> {
    const res = await this.db.query(
      `UPDATE sub_orders SET status = 'CANCELLED', cancellation_reason = $1, cancelled_by = $2, cancelled_at = NOW(), updated_at = NOW()
       WHERE id = $3 RETURNING *;`,
      [reason, userId, subOrderId]
    );
    return res.rows[0];
  }
  async updateSubOrderStatusOnly(subOrderId: string, status: string): Promise<void> {
    await this.db.query(`UPDATE sub_orders SET status = $1, updated_at = NOW() WHERE id = $2;`, [status, subOrderId]);
  }
  async findSubOrderDetails(subOrderId: string): Promise<any | null> {
    const res = await this.db.query(
      `SELECT so.*, og.order_group_number, og.customer_id, o.outlet_name, o.address_line1 as outlet_address,
              o.phone as outlet_phone, m.id as merchant_id, m.owner_id as merchant_owner_id,
              u.full_name as customer_name, u.phone as customer_phone, dj.job_number, dj.status as delivery_status,
              dj.delivery_pin, dj.handover_otp, p.id as partner_id, up.full_name as partner_name,
              up.phone as partner_phone, pt.payment_method, pt.status as payment_status
       FROM sub_orders so JOIN order_groups og ON og.id = so.order_group_id
       JOIN outlets o ON o.id = so.outlet_id JOIN merchants m ON m.id = o.merchant_id
       JOIN users u ON u.id = og.customer_id LEFT JOIN delivery_jobs dj ON dj.id = so.delivery_job_id
       LEFT JOIN partners p ON p.id = dj.assigned_partner_id LEFT JOIN users up ON up.id = p.user_id
       LEFT JOIN payment_transactions pt ON pt.sub_order_id = so.id WHERE so.id = $1;`,
      [subOrderId]
    );
    return res.rows[0] ?? null;
  }
  async findSubOrderItemsWithCustomizations(subOrderId: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT oi.*, COALESCE(json_agg(json_build_object('groupName', oic.group_name_snapshot,
              'optionName', oic.option_name_snapshot, 'priceInr', oic.price_adjustment_inr)
            ) FILTER (WHERE oic.id IS NOT NULL), '[]'::json) as customizations
       FROM order_items oi LEFT JOIN order_item_customizations oic ON oic.order_item_id = oi.id
       WHERE oi.sub_order_id = $1 GROUP BY oi.id;`,
      [subOrderId]
    );
    return res.rows;
  }
  async listCustomerOrders(customerId: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT so.id, so.sub_order_number, so.status, so.vertical_type, so.total_payable_inr, so.created_at,
              o.outlet_name, o.address_line1 as outlet_address, dj.id as delivery_job_id, dj.status as delivery_status,
              dj.delivery_pin, pt.payment_method, pt.status as payment_status
       FROM sub_orders so JOIN order_groups og ON og.id = so.order_group_id
       JOIN outlets o ON o.id = so.outlet_id LEFT JOIN delivery_jobs dj ON dj.id = so.delivery_job_id
       LEFT JOIN payment_transactions pt ON pt.sub_order_id = so.id
       WHERE og.customer_id = $1 ORDER BY so.created_at DESC;`,
      [customerId]
    );
    return res.rows;
  }
  async listMerchantOrders(merchantUserId: string, status?: string): Promise<any[]> {
    const whereStatus = status ? `AND so.status = '${status}'` : '';
    const res = await this.db.query(
      `SELECT so.*, og.customer_id, u.full_name as customer_name, u.phone as customer_phone,
              o.outlet_name, dj.job_number, dj.status as delivery_status, dj.handover_otp
       FROM sub_orders so JOIN outlets o ON o.id = so.outlet_id
       JOIN merchants m ON m.id = o.merchant_id JOIN order_groups og ON og.id = so.order_group_id
       JOIN users u ON u.id = og.customer_id LEFT JOIN delivery_jobs dj ON dj.id = so.delivery_job_id
       WHERE m.owner_id = $1 ${whereStatus} ORDER BY so.created_at DESC;`,
      [merchantUserId]
    );
    return res.rows;
  }
  async listAdminOrders(status?: string, limit = 50): Promise<any[]> {
    const where = status ? `WHERE so.status = '${status}'` : '';
    const res = await this.db.query(
      `SELECT so.*, og.order_group_number, u.full_name as customer_name, u.phone as customer_phone,
              o.outlet_name, m.business_name, dj.job_number as delivery_job_number, dj.status as delivery_status
       FROM sub_orders so JOIN order_groups og ON og.id = so.order_group_id
       JOIN outlets o ON o.id = so.outlet_id JOIN merchants m ON m.id = o.merchant_id
       JOIN users u ON u.id = og.customer_id LEFT JOIN delivery_jobs dj ON dj.id = so.delivery_job_id
       ${where} ORDER BY so.created_at DESC LIMIT ${limit};`
    );
    return res.rows;
  }
}