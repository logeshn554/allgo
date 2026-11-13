import { Injectable, BadRequestException } from '@nestjs/common';
import { PricingRepository } from '../data/pricing.repository.js';
import { SurgePricingCalculatorService } from './surge-pricing-calculator.service.js';
import { CouponsService } from './coupons.service.js';

export interface CalculatedCartBreakdown {
  itemsSubtotalInr: number;
  deliveryFeeInr: number;
  packagingFeeInr: number;
  platformFeeInr: number;
  gstAmountInr: number;
  discountAmountInr: number;
  finalPayableAmountInr: number;
  distanceKm: number;
  appliedCoupon?: {
    code: string;
    discountInr: number;
    title?: string;
    isAutoApplied?: boolean;
  };
  zoneInfo?: {
    zoneId?: string;
    zoneName?: string;
    surgeMultiplier: number;
    isSurgeActive: boolean;
    surgeReason?: string;
    isPeakHour: boolean;
  };
  itemsBreakdown: Array<{
    itemId: string;
    itemName: string;
    unitPriceInr: number;
    quantity: number;
    totalPriceInr: number;
    optionsTotalInr: number;
    selectedOptions: any[];
  }>;
}

@Injectable()
export class DeliveryPricingService {
  constructor(
    private readonly pricingRepo: PricingRepository,
    private readonly surgeCalculator: SurgePricingCalculatorService,
    private readonly couponsService: CouponsService
  ) {}

  async calculateCheckoutTotals(
    cartItems: any[],
    outletId: string,
    customerLocation?: { latitude: number; longitude: number },
    couponCode?: string,
    customerId?: string
  ): Promise<CalculatedCartBreakdown> {
    if (!cartItems || cartItems.length === 0) {
      throw new BadRequestException('Cannot calculate pricing for an empty cart');
    }

    const outlet = await this.pricingRepo.getOutletLocation(outletId);
    if (!outlet) {
      throw new BadRequestException(`Outlet not found`);
    }

    let distanceKm = 2.5;
    if (customerLocation && outlet.lat && outlet.lng) {
      distanceKm = this.surgeCalculator.calculateDistanceKm(
        Number(outlet.lat),
        Number(outlet.lng),
        Number(customerLocation.latitude),
        Number(customerLocation.longitude)
      );
    }

    const itemIds = cartItems.map((ci) => ci.item_id);
    const itemRows = await this.pricingRepo.getItemsWithOverrides(outletId, itemIds);
    const itemMap = new Map<string, any>();
    for (const r of itemRows) {
      itemMap.set(r.id, r);
    }

    let itemsSubtotalPaisa = 0;
    const itemsBreakdown: any[] = [];

    for (const ci of cartItems) {
      const dbItem = itemMap.get(ci.item_id);
      if (!dbItem) {
        throw new BadRequestException(`Item ${ci.item_id} is no longer available`);
      }

      if (dbItem.is_active === false || dbItem.outlet_available === false) {
        throw new BadRequestException(`Item "${dbItem.name}" is currently unavailable at this outlet`);
      }

      const basePriceInr = Number(dbItem.price_override_inr ?? dbItem.base_price_inr);
      let unitPricePaisa = this.surgeCalculator.toPaisa(basePriceInr);

      if (ci.variant_id) {
        const variant = await this.pricingRepo.getItemVariant(ci.variant_id, ci.item_id);
        if (variant && variant.is_available) {
          unitPricePaisa += this.surgeCalculator.toPaisa(Number(variant.additional_price_inr));
        }
      }

      let optionsTotalPaisa = 0;
      const selectedOptions: any[] = Array.isArray(ci.selected_options) ? ci.selected_options : [];
      if (selectedOptions.length > 0) {
        const optionIds = selectedOptions.map((o: any) => o.optionId).filter(Boolean);
        if (optionIds.length > 0) {
          const options = await this.pricingRepo.getItemOptions(optionIds);
          for (const optRow of options) {
            optionsTotalPaisa += this.surgeCalculator.toPaisa(Number(optRow.price_inr || 0));
          }
        }
      }

      const totalItemUnitPricePaisa = unitPricePaisa + optionsTotalPaisa;
      const totalItemLinePaisa = totalItemUnitPricePaisa * ci.quantity;
      itemsSubtotalPaisa += totalItemLinePaisa;

      itemsBreakdown.push({
        itemId: dbItem.id,
        itemName: dbItem.name,
        unitPriceInr: this.surgeCalculator.fromPaisa(totalItemUnitPricePaisa),
        quantity: ci.quantity,
        totalPriceInr: this.surgeCalculator.fromPaisa(totalItemLinePaisa),
        optionsTotalInr: this.surgeCalculator.fromPaisa(optionsTotalPaisa),
        selectedOptions,
      });
    }

    const { deliveryFeePaisa, deliveryFeeInr, zoneInfo } = await this.surgeCalculator.calculateDeliveryFee(
      distanceKm,
      customerLocation
    );

    const packagingFeePaisa = this.surgeCalculator.toPaisa(15.0);
    const platformFeePaisa = this.surgeCalculator.toPaisa(5.0);
    const gstAmountPaisa = Math.round(itemsSubtotalPaisa * 0.05);

    let discountPaisa = 0;
    let appliedCouponInfo: { code: string; discountInr: number; title?: string; isAutoApplied?: boolean } | undefined;

    if (couponCode) {
      const validated = await this.couponsService.validateCoupon(
        couponCode,
        customerId,
        this.surgeCalculator.fromPaisa(itemsSubtotalPaisa),
        outletId
      );
      discountPaisa = this.surgeCalculator.toPaisa(validated.discountAmountInr);
      appliedCouponInfo = {
        code: validated.code,
        discountInr: validated.discountAmountInr,
        title: validated.title,
        isAutoApplied: false,
      };
    } else {
      const autoCoupon = await this.couponsService.findBestAutoAppliedCoupon(
        customerId,
        outletId,
        this.surgeCalculator.fromPaisa(itemsSubtotalPaisa)
      );
      if (autoCoupon) {
        discountPaisa = this.surgeCalculator.toPaisa(autoCoupon.discountAmountInr);
        appliedCouponInfo = {
          code: autoCoupon.code,
          discountInr: autoCoupon.discountAmountInr,
          title: autoCoupon.title,
          isAutoApplied: true,
        };
      }
    }

    const finalPayablePaisa = Math.max(
      0,
      itemsSubtotalPaisa + deliveryFeePaisa + packagingFeePaisa + platformFeePaisa + gstAmountPaisa - discountPaisa
    );

    return {
      itemsSubtotalInr: this.surgeCalculator.fromPaisa(itemsSubtotalPaisa),
      deliveryFeeInr,
      packagingFeeInr: this.surgeCalculator.fromPaisa(packagingFeePaisa),
      platformFeeInr: this.surgeCalculator.fromPaisa(platformFeePaisa),
      gstAmountInr: this.surgeCalculator.fromPaisa(gstAmountPaisa),
      discountAmountInr: this.surgeCalculator.fromPaisa(discountPaisa),
      finalPayableAmountInr: this.surgeCalculator.fromPaisa(finalPayablePaisa),
      distanceKm,
      appliedCoupon: appliedCouponInfo,
      zoneInfo,
      itemsBreakdown,
    };
  }
}
