import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { CouponRepository } from '../data/coupon.repository.js';
import { CreateCouponDto } from '../dto/ordering.dto.js';
import { CouponApplicationService } from './coupon-application.service.js';
import { CouponValidationService } from './coupon-validation.service.js';

@Injectable()
export class CouponsService {
  private readonly validation: CouponValidationService;
  private readonly application: CouponApplicationService;

  constructor(
    private readonly db: DatabaseService,
    validationService?: CouponValidationService,
    applicationService?: CouponApplicationService,
  ) {
    if (validationService && applicationService) {
      this.validation = validationService;
      this.application = applicationService;
    } else {
      const repo = new CouponRepository(db);
      this.validation = new CouponValidationService(repo);
      this.application = new CouponApplicationService(repo);
    }
  }

  async listActiveCoupons(): Promise<any[]> {
    return this.application.listActiveCoupons();
  }

  async validateCoupon(
    code: string,
    customerId: string | undefined,
    orderSubtotalInr: number,
    outletId?: string,
  ): Promise<any> {
    return this.validation.validateCoupon(code, customerId, orderSubtotalInr, outletId);
  }

  async findBestAutoAppliedCoupon(
    customerId: string | undefined,
    outletId: string,
    subtotalInr: number,
  ): Promise<any | null> {
    return this.validation.findBestAutoAppliedCoupon(customerId, outletId, subtotalInr);
  }

  async listEligibleCoupons(
    customerId: string | undefined,
    outletId: string,
    subtotalInr: number,
  ): Promise<any[]> {
    return this.validation.listEligibleCoupons(customerId, outletId, subtotalInr);
  }

  async createCoupon(dto: CreateCouponDto, adminUserId?: string): Promise<any> {
    return this.application.createCoupon(dto, adminUserId);
  }

  async toggleCouponActive(
    couponId: string,
    isActive: boolean,
    adminUserId?: string,
  ): Promise<any> {
    return this.application.toggleCouponActive(couponId, isActive, adminUserId);
  }

  async redeemCoupon(
    client: any,
    couponId: string,
    customerId: string,
    orderId: string,
    discountInr: number,
    couponCode?: string,
  ): Promise<any> {
    return this.application.redeemCoupon(
      client,
      couponId,
      customerId,
      orderId,
      discountInr,
      couponCode,
    );
  }
}
