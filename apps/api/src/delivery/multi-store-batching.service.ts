import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { BatchingCriteria, StoreLocation, CustomerChoiceQuote } from './dto/batching.dto.js';

@Injectable()
export class MultiStoreBatchingService {
  private readonly logger = new Logger(MultiStoreBatchingService.name);

  // Section 5A defaults: 1.5 km max store spacing, 12 min max prep difference, 12 kg weight
  private readonly defaultCriteria: BatchingCriteria = {
    maxMerchantDistanceKm: 1.5,
    maxDelayToleranceMinutes: 12,
    maxCombinedWeightKg: 12.0,
  };

  constructor(private readonly db: DatabaseService) {}

  calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(2));
  }

  evaluateBatchability(
    stores: StoreLocation[],
    criteria: Partial<BatchingCriteria> = {}
  ): { eligible: boolean; distanceKm: number; prepDelayMinutes: number; reason?: string } {
    const crit = { ...this.defaultCriteria, ...criteria };

    if (stores.length < 2 || !stores[0] || !stores[1]) {
      return { eligible: false, distanceKm: 0, prepDelayMinutes: 0, reason: 'Single store order' };
    }

    const storeA = stores[0];
    const storeB = stores[1];

    // Measure merchant-to-merchant separation
    const dist = this.calculateHaversineDistanceKm(
      storeA.latitude,
      storeA.longitude,
      storeB.latitude,
      storeB.longitude
    );

    if (dist > crit.maxMerchantDistanceKm) {
      return {
        eligible: false,
        distanceKm: dist,
        prepDelayMinutes: 0,
        reason: `Merchants are ${dist} km apart (exceeds ${crit.maxMerchantDistanceKm} km limit)`,
      };
    }

    const prep1 = storeA.prepTimeMinutes ?? 15;
    const prep2 = storeB.prepTimeMinutes ?? 15;
    const prepDiff = Math.abs(prep1 - prep2);

    if (prepDiff > crit.maxDelayToleranceMinutes) {
      return {
        eligible: false,
        distanceKm: dist,
        prepDelayMinutes: prepDiff,
        reason: `Prep time disparity of ${prepDiff}m exceeds tolerance of ${crit.maxDelayToleranceMinutes}m`,
      };
    }

    return { eligible: true, distanceKm: dist, prepDelayMinutes: prepDiff };
  }

  generateCustomerFulfillmentChoice(
    stores: StoreLocation[],
    baseDeliveryFeePerStoreInr: number = 40
  ): CustomerChoiceQuote {
    const evaluation = this.evaluateBatchability(stores);

    const modeA_fastest = {
      fulfillmentMode: 'SEPARATE' as const,
      couriersRequired: stores.length,
      deliveryFeeInr: stores.length * baseDeliveryFeePerStoreInr,
      estimatedDeliveryMinutes: 30,
    };

    if (!evaluation.eligible) {
      return {
        modeA_fastest,
        isBatchable: false,
      };
    }

    // Mode B discount: ₹25 saving per Section 5A spec
    const modeB_deliverTogether = {
      fulfillmentMode: 'DELIVER_TOGETHER' as const,
      couriersRequired: 1 as const,
      deliveryFeeInr: stores.length * baseDeliveryFeePerStoreInr - 25,
      discountInr: 25,
      estimatedDeliveryMinutes: 40,
    };

    return {
      modeA_fastest,
      modeB_deliverTogether,
      isBatchable: true,
    };
  }

  generateLegHandoverOtp(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }
}
