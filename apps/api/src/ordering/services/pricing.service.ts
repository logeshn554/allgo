import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { CouponsService } from './coupons.service.js';
import { PricingRepository } from '../data/pricing.repository.js';
import { SurgePricingCalculatorService } from './surge-pricing-calculator.service.js';
import { DeliveryPricingService, CalculatedCartBreakdown, OutletPricingBreakdown } from './delivery-pricing.service.js';

export type { CalculatedCartBreakdown, OutletPricingBreakdown };

@Injectable()
export class PricingService {
  private readonly couponsService: CouponsService;
  private readonly surgeCalculator: SurgePricingCalculatorService;
  private readonly deliveryPricing: DeliveryPricingService;

  constructor(
    private readonly db: DatabaseService,
    couponsService?: CouponsService,
    surgeCalculator?: SurgePricingCalculatorService,
    deliveryPricing?: DeliveryPricingService
  ) {
    this.couponsService = couponsService ?? new CouponsService(db);
    const repo = new PricingRepository(db);
    this.surgeCalculator = surgeCalculator ?? new SurgePricingCalculatorService(repo);
    this.deliveryPricing =
      deliveryPricing ?? new DeliveryPricingService(repo, this.surgeCalculator, this.couponsService);
  }

  calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    return this.surgeCalculator.calculateDistanceKm(lat1, lon1, lat2, lon2);
  }

  async calculateCheckoutTotals(
    cartItems: any[],
    outletId?: string,
    customerLocation?: { latitude: number; longitude: number },
    couponCode?: string,
    customerId?: string
  ): Promise<CalculatedCartBreakdown> {
    return this.deliveryPricing.calculateCheckoutTotals(
      cartItems,
      outletId,
      customerLocation,
      couponCode,
      customerId
    );
  }
}
