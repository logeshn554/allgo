import { Injectable, BadRequestException } from '@nestjs/common';
import { PricingRepository } from '../data/pricing.repository.js';
import { SurgePricingCalculatorService } from './surge-pricing-calculator.service.js';
import { CouponsService } from './coupons.service.js';

export interface OutletPricingBreakdown {
  outletId: string;
  itemsSubtotalInr: number;
  deliveryFeeInr: number;
  packagingFeeInr: number;
  gstAmountInr: number;
  distanceKm: number;
  itemCount: number;
}

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
    outletId?: string;
    unitPriceInr: number;
    quantity: number;
    totalPriceInr: number;
    optionsTotalInr: number;
    selectedOptions: any[];
  }>;
  outletsBreakdown?: OutletPricingBreakdown[];
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
    outletId?: string,
    customerLocation?: { latitude: number; longitude: number },
    couponCode?: string,
    customerId?: string
  ): Promise<CalculatedCartBreakdown> {
    if (!cartItems || cartItems.length === 0) {
      throw new BadRequestException('Cannot calculate pricing for an empty cart');
    }

    const rawOutletIds = cartItems
      .map((ci) => ci.outlet_id || ci.outletId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
    const uniqueOutletIds = Array.from(new Set(rawOutletIds));
    if (uniqueOutletIds.length === 0 && outletId) {
      uniqueOutletIds.push(outletId);
    }
    if (uniqueOutletIds.length === 0) {
      throw new BadRequestException('No outlet associated with cart items');
    }

    const primaryOutletId = uniqueOutletIds[0] as string;
    let totalItemsSubtotalPaisa = 0;
    let totalDeliveryFeePaisa = 0;
    let totalPackagingFeePaisa = 0;
    let totalGstAmountPaisa = 0;
    let maxDistanceKm = 0;
    let primaryZoneInfo: any = undefined;

    const allItemsBreakdown: any[] = [];
    const outletsBreakdown: OutletPricingBreakdown[] = [];

    for (const currOutletId of uniqueOutletIds) {
      const outlet = await this.pricingRepo.getOutletLocation(currOutletId);
      if (!outlet) {
        throw new BadRequestException(`Outlet not found: ${currOutletId}`);
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
      if (distanceKm > maxDistanceKm) {
        maxDistanceKm = distanceKm;
      }

      const currOutletItems = cartItems.filter(
        (ci) => (ci.outlet_id || ci.outletId || outletId) === currOutletId
      );

      const itemIds = currOutletItems.map((ci) => ci.item_id || ci.itemId);
      const itemRows = await this.pricingRepo.getItemsWithOverrides(currOutletId, itemIds);
      const itemMap = new Map<string, any>();
      for (const r of itemRows) {
        itemMap.set(r.id, r);
      }

      let outletItemsSubtotalPaisa = 0;

      for (const ci of currOutletItems) {
        const iId = ci.item_id || ci.itemId;
        const dbItem = itemMap.get(iId);
        if (!dbItem) {
          throw new BadRequestException(`Item ${iId} is no longer available`);
        }

        if (dbItem.is_active === false || dbItem.outlet_available === false) {
          throw new BadRequestException(`Item "${dbItem.name}" is currently unavailable at this outlet`);
        }

        const basePriceInr = Number(dbItem.price_override_inr ?? dbItem.base_price_inr);
        let unitPricePaisa = this.surgeCalculator.toPaisa(basePriceInr);

        const varId = ci.variant_id || ci.variantId;
        if (varId) {
          const variant = await this.pricingRepo.getItemVariant(varId, iId);
          if (variant && variant.is_available) {
            unitPricePaisa += this.surgeCalculator.toPaisa(Number(variant.additional_price_inr));
          }
        }

        let optionsTotalPaisa = 0;
        const selectedOptions: any[] = Array.isArray(ci.selected_options || ci.selectedOptions)
          ? (ci.selected_options || ci.selectedOptions)
          : [];
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
        outletItemsSubtotalPaisa += totalItemLinePaisa;

        allItemsBreakdown.push({
          itemId: dbItem.id,
          itemName: dbItem.name,
          outletId: currOutletId,
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

      if (!primaryZoneInfo) {
        primaryZoneInfo = zoneInfo;
      }

      const packagingFeePaisa = this.surgeCalculator.toPaisa(15.0);
      const outletGstPaisa = Math.round(outletItemsSubtotalPaisa * 0.05);

      totalItemsSubtotalPaisa += outletItemsSubtotalPaisa;
      totalDeliveryFeePaisa += deliveryFeePaisa;
      totalPackagingFeePaisa += packagingFeePaisa;
      totalGstAmountPaisa += outletGstPaisa;

      outletsBreakdown.push({
        outletId: currOutletId,
        itemsSubtotalInr: this.surgeCalculator.fromPaisa(outletItemsSubtotalPaisa),
        deliveryFeeInr,
        packagingFeeInr: this.surgeCalculator.fromPaisa(packagingFeePaisa),
        gstAmountInr: this.surgeCalculator.fromPaisa(outletGstPaisa),
        distanceKm,
        itemCount: currOutletItems.reduce((acc, ci) => acc + (ci.quantity || 1), 0),
      });
    }

    const platformFeePaisa = this.surgeCalculator.toPaisa(5.0);

    let discountPaisa = 0;
    let appliedCouponInfo: { code: string; discountInr: number; title?: string; isAutoApplied?: boolean } | undefined;

    if (couponCode) {
      const validated = await this.couponsService.validateCoupon(
        couponCode,
        customerId,
        this.surgeCalculator.fromPaisa(totalItemsSubtotalPaisa),
        primaryOutletId
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
        primaryOutletId,
        this.surgeCalculator.fromPaisa(totalItemsSubtotalPaisa)
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
      totalItemsSubtotalPaisa + totalDeliveryFeePaisa + totalPackagingFeePaisa + platformFeePaisa + totalGstAmountPaisa - discountPaisa
    );

    return {
      itemsSubtotalInr: this.surgeCalculator.fromPaisa(totalItemsSubtotalPaisa),
      deliveryFeeInr: this.surgeCalculator.fromPaisa(totalDeliveryFeePaisa),
      packagingFeeInr: this.surgeCalculator.fromPaisa(totalPackagingFeePaisa),
      platformFeeInr: this.surgeCalculator.fromPaisa(platformFeePaisa),
      gstAmountInr: this.surgeCalculator.fromPaisa(totalGstAmountPaisa),
      discountAmountInr: this.surgeCalculator.fromPaisa(discountPaisa),
      finalPayableAmountInr: this.surgeCalculator.fromPaisa(finalPayablePaisa),
      distanceKm: maxDistanceKm,
      appliedCoupon: appliedCouponInfo,
      zoneInfo: primaryZoneInfo,
      itemsBreakdown: allItemsBreakdown,
      outletsBreakdown,
    };
  }
}
