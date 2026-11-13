export class CreateZoneDto {
  name!: string;
  code!: string;
  cityId!: string;
  polygonGeoJson!: any; // GeoJSON geometry or { coordinates: number[][][] }
  serviceSettings?: ZoneServiceSettingDto[];
}

export class UpdateZoneDto {
  name?: string;
  code?: string;
  polygonGeoJson?: any;
  isActive?: boolean;
}

export class ZoneServiceSettingDto {
  verticalType!: string;
  isServiceEnabled?: boolean;
  minOrderValueInr?: number;
  baseDeliveryFeeInr?: number;
  perKmFeeInr?: number;
  freeDeliveryDistanceKm?: number;
  maxServiceRadiusKm?: number;
  surgeMultiplier?: number;
  surgeReason?: string;
  isSurgeActive?: boolean;
  surgeExpiresAt?: string;
  priority?: number;
}

export class UpdateSurgeDto {
  surgeMultiplier!: number;
  reason!: string;
  isSurgeActive!: boolean;
  surgeExpiresAt?: string;
  verticalType?: string;
}

export class CheckServiceabilityDto {
  latitude!: number;
  longitude!: number;
  verticalType?: string;
}

export class AssignOutletsDto {
  outletIds!: string[];
  isPrimary?: boolean;
}
