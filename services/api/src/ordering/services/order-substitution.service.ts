import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import {
  CustomerSubstitutionDecisionDto,
  ProposeSubstitutionDto,
  SubstitutionResult,
} from '../dto/substitution.dto.js';

@Injectable()
export class OrderSubstitutionService {
  constructor(private readonly db: DatabaseService) {}

  async proposeSubstitution(
    _merchantUserId: string,
    subOrderId: string,
    dto: ProposeSubstitutionDto,
  ): Promise<any> {
    const timeoutSec = dto.timeoutSeconds || 300; // 5 min default customer approval window
    const expiresAt = new Date(Date.now() + timeoutSec * 1000);

    const subPrice = dto.actionType === 'REMOVE' ? 0 : dto.substitutedPriceInr || 0;
    const refundDiff = Math.max(0, dto.originalPriceInr - subPrice);

    const res = await this.db.query(
      `INSERT INTO order_item_substitutions (
         sub_order_id, order_item_id, status, original_item_name, original_price_inr,
         substituted_item_id, substituted_item_name, substituted_price_inr,
         action_type, expires_at, difference_refund_inr
       ) VALUES ($1, $2, 'PENDING_CUSTOMER_APPROVAL', $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *;`,
      [
        subOrderId,
        dto.orderItemId,
        dto.originalItemName,
        dto.originalPriceInr,
        dto.substitutedItemId || null,
        dto.substitutedItemName || null,
        subPrice,
        dto.actionType,
        expiresAt,
        refundDiff,
      ],
    );

    return res.rows[0];
  }

  async respondToSubstitution(
    customerId: string,
    substitutionId: string,
    dto: CustomerSubstitutionDecisionDto,
  ): Promise<SubstitutionResult> {
    const res = await this.db.query(
      `SELECT s.*, o.customer_id FROM order_item_substitutions s
       JOIN sub_orders so ON so.id = s.sub_order_id
       JOIN order_groups o ON o.id = so.order_group_id
       WHERE s.id = $1;`,
      [substitutionId],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException('Substitution request not found.');
    }
    const item = res.rows[0];

    if (item.customer_id !== customerId) {
      throw new BadRequestException('Unauthorized: You do not own this order.');
    }

    if (item.status !== 'PENDING_CUSTOMER_APPROVAL') {
      throw new BadRequestException(`Substitution is already finalized (${item.status}).`);
    }

    const isExpired = new Date(item.expires_at).getTime() < Date.now();
    if (isExpired) {
      // Auto-fallback on timeout: Item is removed and 100% refunded
      await this.db.query(
        `UPDATE order_item_substitutions SET status = 'TIMED_OUT', resolved_at = NOW() WHERE id = $1;`,
        [substitutionId],
      );
      await this.refundToWallet(item.customer_id, Number(item.original_price_inr));
      return {
        id: substitutionId,
        subOrderId: item.sub_order_id,
        status: 'TIMED_OUT',
        refundDifferenceInr: Number(item.original_price_inr),
        message: 'Approval window timed out. Item removed and full price credited to wallet.',
      };
    }

    if (dto.decision === 'REJECT') {
      await this.db.query(
        `UPDATE order_item_substitutions SET status = 'REJECTED', customer_response = 'REJECT', resolved_at = NOW() WHERE id = $1;`,
        [substitutionId],
      );
      await this.refundToWallet(item.customer_id, Number(item.original_price_inr));
      return {
        id: substitutionId,
        subOrderId: item.sub_order_id,
        status: 'REJECTED',
        refundDifferenceInr: Number(item.original_price_inr),
        message: 'Item removed from order. Original item amount credited to your wallet.',
      };
    }

    // Approved: Credit price difference if substitute item is cheaper
    const diff = Number(item.difference_refund_inr);
    await this.db.query(
      `UPDATE order_item_substitutions SET status = 'APPROVED', customer_response = 'APPROVE', resolved_at = NOW() WHERE id = $1;`,
      [substitutionId],
    );

    if (diff > 0) {
      await this.refundToWallet(item.customer_id, diff);
    }

    return {
      id: substitutionId,
      subOrderId: item.sub_order_id,
      status: 'APPROVED',
      refundDifferenceInr: diff,
      message:
        diff > 0
          ? `Substitution accepted! Price difference of ₹${diff.toFixed(2)} refunded to wallet.`
          : 'Substitution accepted with no bill adjustment.',
    };
  }

  private async refundToWallet(customerId: string, amountInr: number): Promise<void> {
    if (amountInr <= 0) return;
    await this.db.query(
      `UPDATE wallets SET refundable_balance_inr = refundable_balance_inr + $1, updated_at = NOW()
       WHERE user_id = $2;`,
      [amountInr, customerId],
    );
  }
}
