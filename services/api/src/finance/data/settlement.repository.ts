import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

@Injectable()
export class SettlementRepository {
  constructor(private readonly db: DatabaseService) {}

  async findPartnerById(partnerId: string): Promise<any> {
    const res = await this.db.query(`SELECT id FROM partners WHERE id = $1;`, [partnerId]);
    return res.rows[0] || null;
  }

  async getPartnerDeliveryLegsStats(partnerId: string, periodStart: Date, periodEnd: Date) {
    const res = await this.db.query(
      `SELECT COALESCE(SUM(partner_payout_inr), 0.00) as payout_sum, COUNT(*) as leg_count
       FROM delivery_legs
       WHERE partner_id = $1 AND status = 'DELIVERED'
       AND completed_at >= $2 AND completed_at <= $3;`,
      [partnerId, periodStart, periodEnd],
    );
    return res.rows[0];
  }

  async getPartnerRidesStats(partnerId: string, periodStart: Date, periodEnd: Date) {
    const res = await this.db.query(
      `SELECT COALESCE(SUM(partner_payout_inr), 0.00) as payout_sum, COUNT(*) as ride_count
       FROM rides
       WHERE partner_id = $1 AND status = 'TRIP_COMPLETED'
       AND completed_at >= $2 AND completed_at <= $3;`,
      [partnerId, periodStart, periodEnd],
    );
    return res.rows[0];
  }

  async getPartnerParcelsStats(partnerId: string, periodStart: Date, periodEnd: Date) {
    const res = await this.db.query(
      `SELECT COALESCE(SUM(partner_payout_inr), 0.00) as payout_sum, COUNT(*) as parcel_count
       FROM parcels
       WHERE partner_id = $1 AND status = 'DELIVERED'
       AND updated_at >= $2 AND updated_at <= $3;`,
      [partnerId, periodStart, periodEnd],
    );
    return res.rows[0];
  }

  async getPartnerHireDriverStats(partnerId: string, periodStart: Date, periodEnd: Date) {
    const res = await this.db.query(
      `SELECT COALESCE(SUM(partner_payout_inr), 0.00) as payout_sum, COUNT(*) as hire_count
       FROM hire_driver_bookings
       WHERE partner_id = $1 AND status = 'COMPLETED'
       AND updated_at >= $2 AND updated_at <= $3;`,
      [partnerId, periodStart, periodEnd],
    );
    return res.rows[0];
  }

  async getPartnerCodSum(partnerId: string, periodStart: Date, periodEnd: Date): Promise<string> {
    const res = await this.db.query(
      `SELECT COALESCE(SUM(amount_collected_inr), 0.00) as cod_sum
       FROM cod_reconciliations
       WHERE partner_id = $1 AND status IN ('PENDING', 'DISCREPANCY')
       AND created_at >= $2 AND created_at <= $3;`,
      [partnerId, periodStart, periodEnd],
    );
    return res.rows[0]?.cod_sum || '0.00';
  }

  async insertPartnerSettlement(data: any): Promise<any> {
    const res = await this.db.query(
      `INSERT INTO partner_settlements (
         partner_id, period_start, period_end, total_deliveries, gross_earnings_inr,
         platform_commission_inr, cod_collected_inr, adjustments_inr, net_payable_inr, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING')
       RETURNING *;`,
      [
        data.partnerId,
        data.periodStart,
        data.periodEnd,
        data.totalDeliveries,
        data.grossEarnings,
        data.platformCommission,
        data.codCollected,
        data.adjustments,
        data.netPayable,
      ],
    );
    return res.rows[0];
  }

  async findPartnerSettlementById(settlementId: string): Promise<any> {
    const res = await this.db.query(`SELECT * FROM partner_settlements WHERE id = $1;`, [
      settlementId,
    ]);
    return res.rows[0] || null;
  }

  async createPartnerPayout(data: any): Promise<any> {
    const res = await this.db.query(
      `INSERT INTO payouts (
         recipient_type, recipient_id, payout_channel, gross_amount_inr, net_amount_inr,
         status, settlement_id, approved_by_admin_id, idempotency_key
       ) VALUES ($1, $2, 'RAZORPAYX', $3, $4, 'SCHEDULED', $5, $6, $7)
       RETURNING *;`,
      [
        'PARTNER',
        data.partnerId,
        data.grossAmount,
        data.netPayable,
        data.settlementId,
        data.adminId,
        `PO-PARTNER-${data.settlementId}`,
      ],
    );
    return res.rows[0];
  }

  async updatePartnerSettlementApproved(settlementId: string, payoutId: string): Promise<any> {
    const res = await this.db.query(
      `UPDATE partner_settlements
       SET status = 'APPROVED', payout_id = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *;`,
      [payoutId, settlementId],
    );
    return res.rows[0];
  }

  async getPartnerSettlements(partnerId: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT * FROM partner_settlements WHERE partner_id = $1 ORDER BY created_at DESC;`,
      [partnerId],
    );
    return res.rows;
  }

  async findMerchantById(merchantId: string): Promise<any> {
    const res = await this.db.query(`SELECT id FROM merchants WHERE id = $1;`, [merchantId]);
    return res.rows[0] || null;
  }

  async getMerchantSubOrdersStats(
    merchantId: string,
    periodStart: Date,
    periodEnd: Date,
    outletId?: string,
  ) {
    let outletFilter = '';
    const queryParams: any[] = [merchantId, periodStart, periodEnd];
    if (outletId) {
      outletFilter = 'AND s.outlet_id = $4';
      queryParams.push(outletId);
    }

    const res = await this.db.query(
      `SELECT 
         COUNT(*) as order_count,
         COALESCE(SUM(s.subtotal_inr), 0.00) as gross_sales,
         COALESCE(SUM(s.tax_inr), 0.00) as tax_total
       FROM sub_orders s
       WHERE s.merchant_id = $1 AND s.status = 'DELIVERED'
       AND s.created_at >= $2 AND s.created_at <= $3 ${outletFilter};`,
      queryParams,
    );
    return res.rows[0];
  }

  async insertMerchantSettlement(data: any): Promise<any> {
    const res = await this.db.query(
      `INSERT INTO merchant_settlements (
         merchant_id, outlet_id, period_start, period_end, total_orders, gross_sales_inr,
         commission_inr, tax_withheld_tcs_inr, refund_deductions_inr, net_payable_inr, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING')
       RETURNING *;`,
      [
        data.merchantId,
        data.outletId || null,
        data.periodStart,
        data.periodEnd,
        data.totalOrders,
        data.grossSales,
        data.commission,
        data.tcs,
        data.refunds,
        data.netPayable,
      ],
    );
    return res.rows[0];
  }

  async findMerchantSettlementById(settlementId: string): Promise<any> {
    const res = await this.db.query(`SELECT * FROM merchant_settlements WHERE id = $1;`, [
      settlementId,
    ]);
    return res.rows[0] || null;
  }

  async createMerchantPayout(data: any): Promise<any> {
    const res = await this.db.query(
      `INSERT INTO payouts (
         recipient_type, recipient_id, payout_channel, gross_amount_inr, net_amount_inr,
         tcs_amount_inr, status, settlement_id, approved_by_admin_id, idempotency_key
       ) VALUES ($1, $2, 'RAZORPAYX', $3, $4, $5, 'SCHEDULED', $6, $7, $8)
       RETURNING *;`,
      [
        'MERCHANT',
        data.merchantId,
        data.grossSales,
        data.netPayable,
        data.tcs,
        data.settlementId,
        data.adminId,
        `PO-MERCHANT-${data.settlementId}`,
      ],
    );
    return res.rows[0];
  }

  async updateMerchantSettlementApproved(settlementId: string, payoutId: string): Promise<any> {
    const res = await this.db.query(
      `UPDATE merchant_settlements
       SET status = 'APPROVED', payout_id = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *;`,
      [payoutId, settlementId],
    );
    return res.rows[0];
  }

  async getMerchantSettlements(merchantId: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT * FROM merchant_settlements WHERE merchant_id = $1 ORDER BY created_at DESC;`,
      [merchantId],
    );
    return res.rows;
  }
}
