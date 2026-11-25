import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CouponRepository } from '../data/coupon.repository.js';
import { CreateCouponDto } from '../dto/ordering.dto.js';

@Injectable()
export class CouponApplicationService {
  constructor(private readonly couponRepo: CouponRepository) {}

  async listActiveCoupons(): Promise<any[]> {
    return this.couponRepo.listActiveCoupons();
  }

  /**
   * Create coupon with audit log
   */
  async createCoupon(dto: CreateCouponDto, adminUserId?: string): Promise<any> {
    const coupon = await this.couponRepo.insertCoupon(dto);

    if (adminUserId) {
      await this.couponRepo.insertPromotionAuditLog(
        adminUserId,
        'PROMOTION',
        coupon.id,
        'CREATED',
        null,
        coupon,
        'Coupon created',
      );
    }

    return coupon;
  }

  async toggleCouponActive(
    couponId: string,
    isActive: boolean,
    adminUserId?: string,
  ): Promise<any> {
    const prev = await this.couponRepo.findCouponById(couponId);
    if (!prev) throw new NotFoundException('Coupon not found');

    const updated = await this.couponRepo.updateCouponActive(couponId, isActive);

    if (adminUserId) {
      await this.couponRepo.insertPromotionAuditLog(
        adminUserId,
        'PROMOTION',
        couponId,
        'UPDATED',
        prev,
        updated,
        `Coupon active status changed to ${isActive}`,
      );
    }

    return updated;
  }

  /**
   * Atomic coupon redemption with cap guard
   */
  async redeemCoupon(
    client: any,
    couponId: string,
    customerId: string,
    orderId: string,
    discountInr: number,
    couponCode?: string,
  ): Promise<any> {
    const updated = await this.couponRepo.incrementCouponRedemptions(client, couponId);

    if (!updated) {
      throw new BadRequestException('Coupon redemption cap reached');
    }

    const code = couponCode || updated.code;

    return this.couponRepo.insertCouponRedemption(
      client,
      couponId,
      customerId,
      orderId,
      code,
      discountInr,
    );
  }
}
