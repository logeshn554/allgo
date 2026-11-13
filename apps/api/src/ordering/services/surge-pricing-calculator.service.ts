import { Injectable } from '@nestjs/common';
import { PricingRepository } from '../data/pricing.repository.js';

export interface ZoneSurgeCalculationResult {
  deliveryFeePaisa: number;
  deliveryFeeInr: number;
  zoneInfo: {
    zoneId?: string;
    zoneName?: string;
    surgeMultiplier: number;
    isSurgeActive: boolean;
    surgeReason?: string;
    isPeakHour: boolean;
  };
}

@Injectable()
export class SurgePricingCalculatorService {
  constructor(private readonly pricingRepo: PricingRepository) {}

  toPaisa(val: number): number {
    return Math.round(Number(val) * 100);
  }

  fromPaisa(paisa: number): number {
    return Math.round(paisa) / 100;
  }

  calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
    const crowDistance = R * c;
    return Math.round(crowDistance * 1.25 * 10) / 10;
  }

  async calculateDeliveryFee(
    distanceKm: number,
    customerLocation?: { latitude: number; longitude: number }
  ): Promise<ZoneSurgeCalculationResult> {
    let baseDeliveryFeeInr = 30.0;
    let freeDistanceKm = 3.0;
    let perKmFeeInr = 10.0;
    let surgeMultiplier = 1.0;
    let isSurgeActive = false;
    let surgeReason: string | undefined;
    let zoneId: string | undefined;
    let zoneName: string | undefined;

    if (customerLocation && customerLocation.latitude && customerLocation.longitude) {
      try {
        const z = await this.pricingRepo.findZoneDeliverySettings(
          Number(customerLocation.longitude),
          Number(customerLocation.latitude),
          'FOOD'
        );

        if (z) {
          zoneId = z.zone_id;
          zoneName = z.zone_name;
          baseDeliveryFeeInr = Number(z.base_delivery_fee_inr ?? 30.0);
          freeDistanceKm = Number(z.free_delivery_distance_km ?? 3.0);
          perKmFeeInr = Number(z.per_km_fee_inr ?? 10.0);

          let surgeActive = Boolean(z.is_surge_active);
          if (surgeActive && z.surge_expires_at && new Date(z.surge_expires_at) < new Date()) {
            surgeActive = false;
          }
          if (surgeActive) {
            isSurgeActive = true;
            surgeMultiplier = Math.min(3.0, Math.max(1.0, Number(z.surge_multiplier || 1.0)));
            surgeReason = z.surge_reason;
          }
        }
      } catch {
        // Fallback to default fee structure if spatial query fails
      }
    }

    let rawDeliveryFeePaisa = this.toPaisa(baseDeliveryFeeInr);
    if (distanceKm > freeDistanceKm) {
      const extraKm = Math.ceil(distanceKm - freeDistanceKm);
      rawDeliveryFeePaisa += this.toPaisa(extraKm * perKmFeeInr);
    }

    // Apply surge multiplier if active
    if (isSurgeActive && surgeMultiplier > 1.0) {
      rawDeliveryFeePaisa = Math.round(rawDeliveryFeePaisa * surgeMultiplier);
    }

    // Peak hour check (late-night 23:00 - 05:00 IST)
    const now = new Date();
    const istHours = (now.getUTCHours() + 5.5) % 24;
    const isPeakHour = istHours >= 23 || istHours < 5;
    if (isPeakHour) {
      rawDeliveryFeePaisa += this.toPaisa(15.0);
    }

    const deliveryFeePaisa = rawDeliveryFeePaisa;

    return {
      deliveryFeePaisa,
      deliveryFeeInr: this.fromPaisa(deliveryFeePaisa),
      zoneInfo: {
        zoneId,
        zoneName,
        surgeMultiplier,
        isSurgeActive,
        surgeReason,
        isPeakHour,
      },
    };
  }
}
