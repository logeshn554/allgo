import { FulfillmentMode } from '@allgo/common';

export interface BatchingCriteria {
  maxMerchantDistanceKm: number; // Spec: 1.5 km
  maxDelayToleranceMinutes: number; // Spec: 12 minutes
  maxCombinedWeightKg: number; // Spec: 12.0 kg
}

export interface StoreLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  prepTimeMinutes?: number;
}

export interface CustomerChoiceQuote {
  modeA_fastest: {
    fulfillmentMode: 'SEPARATE';
    couriersRequired: number;
    deliveryFeeInr: number;
    estimatedDeliveryMinutes: number;
  };
  modeB_deliverTogether?: {
    fulfillmentMode: 'DELIVER_TOGETHER';
    couriersRequired: 1;
    deliveryFeeInr: number;
    discountInr: number;
    estimatedDeliveryMinutes: number;
  };
  isBatchable: boolean;
}
