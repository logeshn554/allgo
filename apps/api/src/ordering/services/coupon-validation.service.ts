import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { CouponRepository } from '../data/coupon.repository.js';

@Injectable()
export class CouponValidationService {
  constructor(private readonly couponRepo: CouponRepository) {}

  /**
   * Validate coupon code for a specific customer, outlet, and subtotal
   */
  async validateCoupon(
    code: string,
    customerId: string | undefined,
    orderSubtotalInr: number,
    outletId?: string
  ): Promise<any> {
    const coupon = await this.couponRepo.findActiveCouponByCode(code);
    if (!coupon) {
      throw new NotFoundException(`Coupon code "${code}" is invalid or expired`);
    }

    // Check outlet restriction
    if (coupon.outlet_id && outletId && coupon.outlet_id !== outletId) {
      throw new BadRequestException(`Coupon "${code}" is not valid for this outlet`);
    }

    // Check minimum order amount
    const minOrderInr = Number(coupon.min_order_amount_inr || 0);
    if (orderSubtotalInr < minOrderInr) {
      throw new BadRequestException(
        `Coupon "${code}" requires minimum order amount of ₹${minOrderInr.toFixed(2)}`
      );
    }

    // Check global redemption cap
    if (coupon.max_total_redemptions !== null && coupon.total_redeemed_count >= coupon.max_total_redemptions) {
      throw new BadRequestException(`Coupon "${code}" has reached its total maximum usage limit`);
    }

    // Check new customer constraint
    if (coupon.new_customer_only && customerId) {
      const orderCount = await this.couponRepo.countCustomerOrders(customerId);
      if (orderCount > 0) {
        throw new BadRequestException(`Coupon "${code}" is exclusively reserved for first-time customers`);
      }
    }

    // Check per-user limit
    if (customerId) {
      const userCount = await this.couponRepo.countUserRedemptions(coupon.id, customerId);
      if (userCount >= coupon.usage_limit_per_user) {
        throw new BadRequestException(
          `You have reached the maximum redemption limit (${coupon.usage_limit_per_user}) for this coupon`
        );
      }
    }

    let calculatedDiscountInr = 0;
    if (coupon.discount_percentage) {
      const rawDiscount = (orderSubtotalInr * Number(coupon.discount_percentage)) / 100;
      const maxDiscount = coupon.max_discount_inr ? Number(coupon.max_discount_inr) : Infinity;
      calculatedDiscountInr = Math.min(rawDiscount, maxDiscount);
    } else if (coupon.flat_discount_inr) {
      calculatedDiscountInr = Math.min(Number(coupon.flat_discount_inr), orderSubtotalInr);
    }

    return {
      couponId: coupon.id,
      code: coupon.code,
      title: coupon.title,
      discountAmountInr: Math.round(calculatedDiscountInr * 100) / 100,
      description: coupon.discount_percentage
        ? `${coupon.discount_percentage}% OFF up to ₹${coupon.max_discount_inr}`
        : `Flat ₹${coupon.flat_discount_inr} OFF`,
      isAutoApplied: coupon.is_auto_applied,
    };
  }

  /**
   * Find the highest eligible auto-applied coupon for the cart
   */
  async findBestAutoAppliedCoupon(
    customerId: string | undefined,
    outletId: string,
    subtotalInr: number
  ): Promise<any | null> {
    const candidates = await this.couponRepo.findAutoAppliedCandidates(outletId, subtotalInr);
    let bestCoupon: any = null;
    let maxDiscount = 0;

    for (const c of candidates) {
      try {
        const validated = await this.validateCoupon(c.code, customerId, subtotalInr, outletId);
        if (validated && validated.discountAmountInr > maxDiscount) {
          maxDiscount = validated.discountAmountInr;
          bestCoupon = validated;
        }
      } catch {
        // Skip ineligible candidate
      }
    }

    return bestCoupon;
  }

  /**
   * List all eligible and nearby promotions for customer
   */
  async listEligibleCoupons(
    customerId: string | undefined,
    outletId: string,
    subtotalInr: number
  ): Promise<any[]> {
    const coupons = await this.couponRepo.listOutletCoupons(outletId);
    const results: any[] = [];

    for (const c of coupons) {
      let isEligible = true;
      let reason = '';
      let potentialDiscount = 0;

      if (subtotalInr < Number(c.min_order_amount_inr)) {
        isEligible = false;
        reason = `Add ₹${(Number(c.min_order_amount_inr) - subtotalInr).toFixed(2)} more to apply`;
      } else if (c.max_total_redemptions !== null && c.total_redeemed_count >= c.max_total_redemptions) {
        isEligible = false;
        reason = 'Coupon limit exhausted';
      } else {
        try {
          const val = await this.validateCoupon(c.code, customerId, subtotalInr, outletId);
          potentialDiscount = val.discountAmountInr;
        } catch (err: any) {
          isEligible = false;
          reason = err.message;
        }
      }

      results.push({
        id: c.id,
        code: c.code,
        title: c.title || (c.discount_percentage ? `${c.discount_percentage}% OFF` : `₹${c.flat_discount_inr} OFF`),
        isAutoApplied: c.is_auto_applied,
        newCustomerOnly: c.new_customer_only,
        minOrderAmountInr: Number(c.min_order_amount_inr),
        discountPercentage: c.discount_percentage ? Number(c.discount_percentage) : null,
        flatDiscountInr: c.flat_discount_inr ? Number(c.flat_discount_inr) : null,
        maxDiscountInr: c.max_discount_inr ? Number(c.max_discount_inr) : null,
        isEligible,
        reason: isEligible ? 'Eligible' : reason,
        potentialDiscountInr: potentialDiscount,
      });
    }

    return results;
  }
}
