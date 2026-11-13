import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { LedgerService } from '../ledger/ledger.service.js';

@Injectable()
export class CodReconciliationService {
  private readonly logger = new Logger(CodReconciliationService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly ledger: LedgerService
  ) {}

  /**
   * Record COD cash collected by delivery or mobility partner
   */
  async recordCashCollection(partnerId: string, amountInr: number, bookingReference: string, notes?: string) {
    if (amountInr <= 0) {
      throw new BadRequestException('Cash collected amount must be positive');
    }

    const res = await this.db.query(
      `INSERT INTO cod_reconciliations (
         partner_id, amount_expected_inr, amount_collected_inr, amount_deposited_inr,
         discrepancy_inr, status, reference, notes
       ) VALUES ($1, $2, $2, 0.00, $2, 'PENDING', $3, $4)
       RETURNING *;`,
      [partnerId, amountInr, bookingReference, notes || 'COD Collected from Customer']
    );

    // Ledger posting: Partner holds platform cash
    const txRef = `COD-COLL-${bookingReference}-${Date.now().toString(36)}`;
    await this.ledger.postTransaction({
      transactionReference: txRef,
      description: `COD Cash Collected for ${bookingReference}`,
      entries: [
        {
          partnerId,
          accountType: 'COD_COLLECTED',
          direction: 'DEBIT',
          amountInr,
          description: `Cash in hand held by partner`,
          metadata: { bookingReference, partnerId },
        },
        {
          partnerId,
          accountType: 'COD_HOLDING',
          direction: 'CREDIT',
          amountInr,
          description: `Platform COD receivable liability`,
          metadata: { bookingReference, partnerId },
        },
      ],
      metadata: { bookingReference, partnerId },
    });

    return res.rows[0];
  }

  /**
   * Partner submits cash deposit / handover proof
   */
  async submitCashDeposit(partnerId: string, amountInr: number, depositReference: string, notes?: string) {
    if (amountInr <= 0) {
      throw new BadRequestException('Deposit amount must be positive');
    }

    // Check outstanding collected amount
    const balance = await this.getPartnerCodBalance(partnerId);

    const discrepancy = Math.round((balance.outstandingInr - amountInr) * 100) / 100;
    const status = Math.abs(discrepancy) < 0.01 ? 'PENDING' : 'DISCREPANCY';

    const res = await this.db.query(
      `INSERT INTO cod_reconciliations (
         partner_id, amount_expected_inr, amount_collected_inr, amount_deposited_inr,
         discrepancy_inr, status, reference, notes
       ) VALUES ($1, $2, 0.00, $3, $4, $5, $6, $7)
       RETURNING *;`,
      [
        partnerId,
        balance.outstandingInr,
        amountInr,
        discrepancy,
        status,
        depositReference,
        notes || 'Partner cash deposit submitted',
      ]
    );

    return res.rows[0];
  }

  /**
   * Admin reconciles COD transaction and approves adjustments
   */
  async reconcileCash(reconciliationId: string, adminId: string, approvedAdjustmentInr = 0.00, notes?: string) {
    const res = await this.db.query(
      `SELECT * FROM cod_reconciliations WHERE id = $1;`,
      [reconciliationId]
    );

    if (res.rows.length === 0) {
      throw new NotFoundException(`COD reconciliation record not found: ${reconciliationId}`);
    }

    const recon = res.rows[0];
    const amountDeposited = parseFloat(recon.amount_deposited_inr);
    const amountExpected = parseFloat(recon.amount_expected_inr);
    const currentDiscrepancy = parseFloat(recon.discrepancy_inr);

    const finalDiscrepancy = Math.round((currentDiscrepancy - approvedAdjustmentInr) * 100) / 100;
    const finalStatus = Math.abs(finalDiscrepancy) < 0.01 ? 'RECONCILED' : 'ADJUSTED';

    const updated = await this.db.query(
      `UPDATE cod_reconciliations
       SET status = $1, discrepancy_inr = $2, verified_by_admin_id = $3,
           verified_at = NOW(), notes = COALESCE($4, notes), updated_at = NOW()
       WHERE id = $5 RETURNING *;`,
      [finalStatus, finalDiscrepancy, adminId, notes, reconciliationId]
    );

    // If cash was handed over, post balancing ledger entry
    if (amountDeposited > 0) {
      const txRef = `COD-RECON-${reconciliationId}`;
      await this.ledger.postTransaction({
        transactionReference: txRef,
        description: `COD Cash Handover Reconciled #${reconciliationId}`,
        entries: [
          {
            partnerId: recon.partner_id,
            accountType: 'COD_HOLDING',
            direction: 'DEBIT',
            amountInr: amountDeposited,
            description: `Cash deposit verified by admin`,
            metadata: { reconciliationId, adminId },
          },
          {
            partnerId: recon.partner_id,
            accountType: 'COD_COLLECTED',
            direction: 'CREDIT',
            amountInr: amountDeposited,
            description: `Cash liability cleared`,
            metadata: { reconciliationId, adminId },
          },
        ],
        metadata: { reconciliationId, adminId },
      });
    }

    return updated.rows[0];
  }

  /**
   * Get partner COD balance overview
   */
  async getPartnerCodBalance(partnerId: string) {
    const res = await this.db.query(
      `SELECT 
         COALESCE(SUM(amount_collected_inr), 0.00) as total_collected,
         COALESCE(SUM(amount_deposited_inr), 0.00) as total_deposited
       FROM cod_reconciliations
       WHERE partner_id = $1;`,
      [partnerId]
    );

    const collected = parseFloat(res.rows[0].total_collected);
    const deposited = parseFloat(res.rows[0].total_deposited);
    const outstanding = Math.max(0, Math.round((collected - deposited) * 100) / 100);

    return {
      partnerId,
      totalCollectedInr: collected,
      totalDepositedInr: deposited,
      outstandingInr: outstanding,
    };
  }

  /**
   * List pending reconciliations for admin
   */
  async listPendingReconciliations() {
    const res = await this.db.query(
      `SELECT c.*, p.status as partner_status, u.phone as partner_phone
       FROM cod_reconciliations c
       JOIN partners p ON p.id = c.partner_id
       JOIN users u ON u.id = p.user_id
       WHERE c.status IN ('PENDING', 'DISCREPANCY', 'UNDER_INVESTIGATION')
       ORDER BY c.created_at DESC;`
    );
    return res.rows;
  }
}
