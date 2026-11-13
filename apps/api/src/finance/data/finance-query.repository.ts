import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

@Injectable()
export class FinanceQueryRepository {
  constructor(private readonly db: DatabaseService) {}

  async getCustomerPayments(customerId: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT pt.*, og.order_number
       FROM payment_transactions pt
       LEFT JOIN order_groups og ON og.id = pt.order_group_id
       WHERE pt.customer_id = $1
       ORDER BY pt.created_at DESC LIMIT 50;`,
      [customerId]
    );
    return res.rows;
  }

  async getCustomerRefunds(customerId: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT r.*, pt.payment_method, pt.order_group_id
       FROM refunds r
       JOIN payment_transactions pt ON pt.id = r.payment_id OR pt.order_group_id = (SELECT order_group_id FROM payments WHERE id = r.payment_id LIMIT 1)
       WHERE pt.customer_id = $1
       ORDER BY r.created_at DESC LIMIT 50;`,
      [customerId]
    );
    return res.rows;
  }

  async getPartnerIdByUserId(userId: string): Promise<string | null> {
    const res = await this.db.query(`SELECT id FROM partners WHERE user_id = $1;`, [userId]);
    return res.rows[0]?.id || null;
  }

  async getMerchantIdByOwnerId(userId: string): Promise<string | null> {
    const res = await this.db.query(`SELECT id FROM merchants WHERE owner_id = $1;`, [userId]);
    return res.rows[0]?.id || null;
  }

  async getAdminFinancialDashboardMetrics(): Promise<any> {
    const paymentsRes = await this.db.query(`
      SELECT 
        COALESCE(SUM(amount_inr), 0.00) as gross_volume,
        COUNT(*) as total_payments,
        COUNT(CASE WHEN status = 'CAPTURED' THEN 1 END) as completed_payments,
        COALESCE(SUM(CASE WHEN status = 'CAPTURED' THEN amount_inr ELSE 0 END), 0.00) as completed_volume
      FROM payments;
    `);

    const refundsRes = await this.db.query(`
      SELECT COALESCE(SUM(amount_inr), 0.00) as refund_total, COUNT(*) as refund_count
      FROM refunds WHERE status = 'PROCESSED';
    `);

    const partnerSettlementsRes = await this.db.query(`
      SELECT 
        COALESCE(SUM(gross_earnings_inr), 0.00) as total_partner_gross,
        COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN net_payable_inr ELSE 0 END), 0.00) as pending_partner_settlements,
        COALESCE(SUM(CASE WHEN status = 'SETTLED' THEN net_payable_inr ELSE 0 END), 0.00) as completed_partner_settlements
      FROM partner_settlements;
    `);

    const merchantSettlementsRes = await this.db.query(`
      SELECT 
        COALESCE(SUM(gross_sales_inr), 0.00) as total_merchant_gross,
        COALESCE(SUM(commission_inr), 0.00) as platform_commission,
        COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN net_payable_inr ELSE 0 END), 0.00) as pending_merchant_settlements,
        COALESCE(SUM(CASE WHEN status = 'SETTLED' THEN net_payable_inr ELSE 0 END), 0.00) as completed_merchant_settlements
      FROM merchant_settlements;
    `);

    const payoutsRes = await this.db.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'SCHEDULED' THEN net_amount_inr ELSE 0 END), 0.00) as pending_payouts_inr,
        COALESCE(SUM(CASE WHEN status = 'FAILED' THEN net_amount_inr ELSE 0 END), 0.00) as failed_payouts_inr,
        COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_payout_count
      FROM payouts;
    `);

    const codRes = await this.db.query(`
      SELECT 
        COALESCE(SUM(amount_collected_inr - amount_deposited_inr), 0.00) as outstanding_cod
      FROM cod_reconciliations WHERE status != 'RECONCILED';
    `);

    return {
      grossTransactionVolumeInr: parseFloat(paymentsRes.rows[0].completed_volume),
      completedTransactionsCount: parseInt(paymentsRes.rows[0].completed_payments, 10),
      refundTotalsInr: parseFloat(refundsRes.rows[0].refund_total),
      refundCount: parseInt(refundsRes.rows[0].refund_count, 10),
      platformCommissionInr: parseFloat(merchantSettlementsRes.rows[0].platform_commission),
      partnerEarningsInr: parseFloat(partnerSettlementsRes.rows[0].total_partner_gross),
      merchantEarningsInr: parseFloat(merchantSettlementsRes.rows[0].total_merchant_gross),
      pendingSettlementsInr:
        parseFloat(partnerSettlementsRes.rows[0].pending_partner_settlements) +
        parseFloat(merchantSettlementsRes.rows[0].pending_merchant_settlements),
      completedSettlementsInr:
        parseFloat(partnerSettlementsRes.rows[0].completed_partner_settlements) +
        parseFloat(merchantSettlementsRes.rows[0].completed_merchant_settlements),
      pendingPayoutsInr: parseFloat(payoutsRes.rows[0].pending_payouts_inr),
      failedPayoutsInr: parseFloat(payoutsRes.rows[0].failed_payouts_inr),
      failedPayoutCount: parseInt(payoutsRes.rows[0].failed_payout_count, 10),
      outstandingCodInr: parseFloat(codRes.rows[0].outstanding_cod),
    };
  }

  async listAdminPayments(status?: string, limit = 50, offset = 0): Promise<any[]> {
    const filter = status ? `WHERE status = $1` : '';
    const params = status ? [status, limit, offset] : [limit, offset];
    const limitIdx = status ? '$2' : '$1';
    const offsetIdx = status ? '$3' : '$2';
    const res = await this.db.query(
      `SELECT * FROM payments ${filter} ORDER BY created_at DESC LIMIT ${limitIdx} OFFSET ${offsetIdx};`,
      params
    );
    return res.rows;
  }

  async listAdminRefunds(status?: string): Promise<any[]> {
    const filter = status ? `WHERE r.status = $1` : '';
    const params = status ? [status] : [];
    const res = await this.db.query(
      `SELECT r.*, p.order_group_id, p.payment_method, p.amount_inr as original_amount_inr
       FROM refunds r
       JOIN payments p ON p.id = r.payment_id
       ${filter}
       ORDER BY r.created_at DESC LIMIT 100;`,
      params
    );
    return res.rows;
  }

  async getPaymentById(paymentId: string): Promise<any> {
    const res = await this.db.query(`SELECT * FROM payments WHERE id = $1;`, [paymentId]);
    return res.rows[0] || null;
  }

  async getCustomerIdFromOrderGroup(orderGroupId: string): Promise<string | null> {
    const res = await this.db.query(`SELECT customer_id FROM order_groups WHERE id = $1;`, [orderGroupId]);
    return res.rows[0]?.customer_id || null;
  }

  async insertRefund(
    paymentId: string,
    subOrderId: string | null,
    gatewayRefundId: string,
    destination: string,
    amountInr: number,
    reason: string
  ): Promise<any> {
    const res = await this.db.query(
      `INSERT INTO refunds (
         payment_id, sub_order_id, gateway_refund_id, destination, amount_inr, reason, status, processed_at
       ) VALUES ($1, $2, $3, $4, $5, $6, 'PROCESSED', NOW())
       RETURNING *;`,
      [paymentId, subOrderId || null, gatewayRefundId, destination, amountInr, reason]
    );
    return res.rows[0];
  }
}
