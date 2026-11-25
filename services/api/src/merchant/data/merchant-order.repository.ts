import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

@Injectable()
export class MerchantOrderRepository {
  constructor(private readonly db: DatabaseService) {}

  async getDashboardStats(outletId: string): Promise<any> {
    const statsRes = await this.db.query(
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('PLACED', 'PAYMENT_CONFIRMED')) as count_new,
         COUNT(*) FILTER (WHERE status = 'MERCHANT_ACCEPTED') as count_accepted,
         COUNT(*) FILTER (WHERE status = 'PREPARING') as count_preparing,
         COUNT(*) FILTER (WHERE status IN ('READY', 'PARTNER_ASSIGNED', 'PARTNER_AT_STORE')) as count_ready,
         COUNT(*) FILTER (WHERE status IN ('DELIVERED', 'COMPLETED')) as count_completed,
         COUNT(*) FILTER (WHERE status IN ('CANCELLED', 'REJECTED', 'FAILED')) as count_cancelled,
         COALESCE(SUM(items_total_inr) FILTER (WHERE created_at >= CURRENT_DATE AND status NOT IN ('CANCELLED', 'REJECTED', 'FAILED')), 0) as today_sales,
         COALESCE(SUM(items_total_inr) FILTER (WHERE created_at >= (CURRENT_DATE - INTERVAL '7 days') AND status NOT IN ('CANCELLED', 'REJECTED', 'FAILED')), 0) as weekly_sales,
         COALESCE(SUM(merchant_net_payout_inr) FILTER (WHERE status = 'DELIVERED'), 0) as total_earned
       FROM sub_orders
       WHERE outlet_id = $1;`,
      [outletId],
    );
    return statsRes.rows[0] || {};
  }

  async listOrders(outletId: string, statusFilter?: string): Promise<any[]> {
    let query = `
      SELECT so.*,
             og.customer_id,
             u.full_name as customer_name,
             u.phone as customer_phone,
             COALESCE(json_agg(json_build_object(
               'itemId', oi.item_id,
               'itemName', oi.item_name_snapshot,
               'quantity', oi.quantity,
               'unitPriceInr', oi.unit_price_inr,
               'totalPriceInr', oi.total_price_inr
             )) FILTER (WHERE oi.id IS NOT NULL), '[]') as items
      FROM sub_orders so
      JOIN order_groups og ON og.id = so.order_group_id
      LEFT JOIN users u ON u.id = og.customer_id
      LEFT JOIN order_items oi ON oi.sub_order_id = so.id
      WHERE so.outlet_id = $1
    `;
    const params: any[] = [outletId];

    if (statusFilter) {
      if (statusFilter === 'NEW') {
        query += ` AND so.status IN ('PLACED', 'PAYMENT_CONFIRMED')`;
      } else if (statusFilter === 'ACCEPTED') {
        query += ` AND so.status = 'MERCHANT_ACCEPTED'`;
      } else if (statusFilter === 'PREPARING') {
        query += ` AND so.status = 'PREPARING'`;
      } else if (statusFilter === 'READY') {
        query += ` AND so.status IN ('READY', 'PARTNER_ASSIGNED', 'PARTNER_AT_STORE')`;
      } else if (statusFilter === 'HISTORY') {
        query += ` AND so.status IN ('DELIVERED', 'COMPLETED', 'CANCELLED', 'REJECTED')`;
      } else {
        params.push(statusFilter);
        query += ` AND so.status = $${params.length}`;
      }
    }

    query += ` GROUP BY so.id, og.customer_id, u.full_name, u.phone ORDER BY so.created_at DESC;`;

    const res = await this.db.query(query, params);
    return res.rows;
  }

  async findOrderById(orderId: string, outletId: string): Promise<any> {
    const res = await this.db.query(
      `SELECT so.*,
              og.customer_id,
              u.full_name as customer_name,
              u.phone as customer_phone,
              COALESCE(json_agg(json_build_object(
                'itemId', oi.item_id,
                'itemName', oi.item_name_snapshot,
                'quantity', oi.quantity,
                'unitPriceInr', oi.unit_price_inr,
                'totalPriceInr', oi.total_price_inr
              )) FILTER (WHERE oi.id IS NOT NULL), '[]') as items
       FROM sub_orders so
       JOIN order_groups og ON og.id = so.order_group_id
       LEFT JOIN users u ON u.id = og.customer_id
       LEFT JOIN order_items oi ON oi.sub_order_id = so.id
       WHERE so.id = $1 AND so.outlet_id = $2
       GROUP BY so.id, og.customer_id, u.full_name, u.phone;`,
      [orderId, outletId],
    );
    return res.rows[0] || null;
  }

  async findSubOrderRaw(orderId: string, outletId: string): Promise<any> {
    const orderRes = await this.db.query(
      'SELECT * FROM sub_orders WHERE id = $1 AND outlet_id = $2;',
      [orderId, outletId],
    );
    return orderRes.rows[0] || null;
  }

  async updateSubOrderStatus(
    orderId: string,
    outletId: string,
    targetStatus: string,
    prepTimeMinutes?: number,
    setActualReady = false,
  ): Promise<any> {
    const queryUpdates = ['status = $1', 'updated_at = NOW()'];
    const params: any[] = [targetStatus];

    if (targetStatus === 'MERCHANT_ACCEPTED') {
      const minutes = prepTimeMinutes || 15;
      params.push(minutes);
      queryUpdates.push(`prep_time_minutes = $${params.length}`);
      queryUpdates.push(`estimated_ready_at = NOW() + INTERVAL '${minutes} minutes'`);
    } else if (setActualReady || targetStatus === 'READY') {
      queryUpdates.push('actual_ready_at = NOW()');
    }

    params.push(orderId, outletId);
    const updateRes = await this.db.query(
      `UPDATE sub_orders
       SET ${queryUpdates.join(', ')}
       WHERE id = $${params.length - 1} AND outlet_id = $${params.length}
       RETURNING *;`,
      params,
    );
    return updateRes.rows[0] || null;
  }

  async recordOrderEvent(
    orderGroupId: string,
    subOrderId: string,
    actorId: string,
    eventType: string,
    fromStatus: string,
    toStatus: string,
    notes?: string | null,
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO order_events (order_group_id, sub_order_id, actor_id, event_type, from_status, to_status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7);`,
      [orderGroupId, subOrderId, actorId, eventType, fromStatus, toStatus, notes || null],
    );
  }

  async getEarningsSummary(outletId: string): Promise<any> {
    const res = await this.db.query(
      `SELECT
         COALESCE(SUM(items_total_inr), 0) as gross_sales,
         COALESCE(SUM(packaging_fee_inr), 0) as packaging_fee,
         COALESCE(SUM(merchant_commission_inr), 0) as commission,
         COALESCE(SUM(tax_total_inr), 0) as tax,
         COALESCE(SUM(merchant_net_payout_inr), 0) as net_payout
       FROM sub_orders
       WHERE outlet_id = $1 AND status IN ('DELIVERED', 'COMPLETED');`,
      [outletId],
    );
    return res.rows[0] || {};
  }

  async getPayoutsSummary(merchantId: string): Promise<number> {
    const payoutsRes = await this.db.query(
      `SELECT COALESCE(SUM(net_amount_inr), 0) as total_paid
       FROM payouts
       WHERE recipient_type = 'MERCHANT' AND recipient_id = $1 AND status = 'SUCCESS';`,
      [merchantId],
    );
    return Number.parseFloat(payoutsRes.rows[0]?.total_paid || '0');
  }

  async listPayouts(merchantId: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT * FROM payouts
       WHERE recipient_type = 'MERCHANT' AND recipient_id = $1
       ORDER BY created_at DESC;`,
      [merchantId],
    );
    return res.rows;
  }
}
