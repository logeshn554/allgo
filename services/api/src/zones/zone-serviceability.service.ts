import { Injectable } from '@nestjs/common';
import { ZoneSettingsRepository } from './data/zone-settings.repository.js';
import { ZoneRepository } from './data/zone.repository.js';

@Injectable()
export class ZoneServiceabilityService {
  constructor(
    private readonly zoneRepo: ZoneRepository,
    private readonly settingsRepo: ZoneSettingsRepository,
  ) {}

  async checkServiceability(lat: number, lng: number, verticalType = 'FOOD'): Promise<any> {
    const matched = await this.zoneRepo.findZoneContainingPoint(lng, lat, verticalType);

    if (!matched) {
      return {
        isServiceable: false,
        reason: 'Location is outside supported AllGo service zones',
        zone: null,
        serviceSettings: null,
        eligibleOutletsCount: 0,
        eligibleOutlets: [],
      };
    }

    const isServiceEnabled = matched.is_service_enabled !== false;

    if (!isServiceEnabled) {
      return {
        isServiceable: false,
        reason: `Service for vertical "${verticalType}" is currently disabled in ${matched.zone_name}`,
        zone: {
          id: matched.zone_id,
          name: matched.zone_name,
          code: matched.zone_code,
        },
        serviceSettings: matched,
        eligibleOutletsCount: 0,
        eligibleOutlets: [],
      };
    }

    let isSurgeActive = Boolean(matched.is_surge_active);
    if (isSurgeActive && matched.surge_expires_at) {
      if (new Date(matched.surge_expires_at) < new Date()) {
        isSurgeActive = false;
      }
    }

    const maxRadiusKm = Number(matched.max_service_radius_km || 15.0);
    const eligibleOutlets = await this.settingsRepo.findEligibleOutlets(
      lng,
      lat,
      matched.zone_id,
      maxRadiusKm,
    );

    return {
      isServiceable: true,
      zone: {
        id: matched.zone_id,
        name: matched.zone_name,
        code: matched.zone_code,
        cityId: matched.city_id,
      },
      serviceSettings: {
        verticalType: matched.vertical_type,
        minOrderValueInr: Number(matched.min_order_value_inr),
        baseDeliveryFeeInr: Number(matched.base_delivery_fee_inr),
        perKmFeeInr: Number(matched.per_km_fee_inr),
        freeDeliveryDistanceKm: Number(matched.free_delivery_distance_km),
        maxServiceRadiusKm: maxRadiusKm,
        surgeMultiplier: isSurgeActive ? Number(matched.surge_multiplier) : 1.0,
        isSurgeActive,
        surgeReason: isSurgeActive ? matched.surge_reason : null,
      },
      eligibleOutletsCount: eligibleOutlets.length,
      eligibleOutlets,
    };
  }
}
