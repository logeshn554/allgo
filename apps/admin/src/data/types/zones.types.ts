export interface ZoneServiceSetting {
  verticalType: 'FOOD' | 'GROCERY' | 'PARCEL' | 'RIDE' | 'HOME_MADE' | string;
  isServiceEnabled: boolean;
  minOrderValueInr: number;
  baseDeliveryFeeInr: number;
  perKmFeeInr: number;
  freeDeliveryDistanceKm: number;
  maxServiceRadiusKm: number;
  priority?: number;
  surgeMultiplier?: number;
  isSurgeActive?: boolean;
  surgeReason?: string;
}

export interface ServiceZone {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  area_sq_km?: string;
  service_settings?: ZoneServiceSetting[];
}

export interface CreateZoneDto {
  name: string;
  code: string;
  cityId: string;
  polygonGeoJson: any;
  serviceSettings?: any[];
}

export interface UpdateZoneSurgeDto {
  surgeMultiplier: number;
  reason: string;
  isSurgeActive: boolean;
  verticalType?: string;
}

export interface ServiceabilitySimulationResult {
  isServiceable: boolean;
  reason?: string;
  zone?: { name: string; code: string };
  serviceSettings?: {
    baseDeliveryFeeInr: number;
    freeDeliveryDistanceKm: number;
    surgeMultiplier: number;
    isSurgeActive: boolean;
  };
  eligibleOutletsCount?: number;
}
