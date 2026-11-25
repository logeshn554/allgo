export interface MobilityStats {
  totalRides: number;
  activeRides: number;
  completedRides: number;
  totalParcels: number;
  totalHireDriverBookings: number;
  openSosAlerts: number;
}

export type MobilityStatsData = MobilityStats;

export interface MobilityFeatureFlags {
  stateCode?: string;
  ridesEnabled?: boolean;
  hireDriverEnabled?: boolean;
  bikeTaxiEnabled?: boolean;
}

export interface MobilitySosEvent {
  id: string;
  rideId?: string;
  ride_number?: string;
  userId?: string;
  reporter_name?: string;
  reporter_phone?: string;
  latitude?: number;
  longitude?: number;
  reason?: string;
  status: 'OPEN' | 'TRIGGERED' | 'RESOLVED' | 'FALSE_ALARM';
  resolution_notes?: string;
  notes?: string;
  createdAt?: string;
  created_at?: string;
}

export interface MobilityRideSummary {
  id: string;
  ride_number: string;
  ride_type: string;
  customer_name?: string;
  customer_phone?: string;
  driver_name?: string;
  driver_phone?: string;
  pickup_address: string;
  drop_address: string;
  total_fare_inr: number;
  status: string;
  registration_number?: string;
  created_at: string;
}

export interface MobilityRideAuditEvent {
  id: string;
  event_type: string;
  created_at: string;
}

export interface MobilityRideDetail {
  ride: MobilityRideSummary;
  events: MobilityRideAuditEvent[];
}

export interface MobilityParcelSummary {
  id: string;
  parcel_number: string;
  package_category: string;
  estimated_weight_kg: number;
  sender_name?: string;
  sender_phone?: string;
  recipient_name: string;
  recipient_phone: string;
  courier_name?: string;
  total_amount_inr: number;
  status: string;
}

export interface MobilityHireDriverSummary {
  id: string;
  booking_number: string;
  customer_name?: string;
  customer_phone?: string;
  driver_name?: string;
  driver_phone?: string;
  customer_vehicle_make_model?: string;
  vehicle_make_model?: string;
  customer_vehicle_transmission?: string;
  transmission_type?: string;
  customer_vehicle_fuel_type?: string;
  pickup_address: string;
  pricing_model?: string;
  total_fare_inr: number;
  status: string;
  created_at: string;
}

export interface RideFareConfig {
  id: string;
  vehicle_category: string;
  base_fare_inr: number;
  base_distance_km: number;
  per_km_rate_inr: number;
  per_minute_rate_inr: number;
  minimum_fare_inr: number;
  cancellation_fee_inr: number;
  commission_rate_percentage: number;
}

export interface ParcelFareConfig {
  id: string;
  package_category: string;
  base_fare_inr: number;
  base_distance_km: number;
  per_km_rate_inr: number;
  per_kg_rate_inr: number;
  max_weight_kg: number;
  commission_rate_percentage: number;
}

export interface MobilityFaresData {
  rideFares: RideFareConfig[];
  parcelFares: ParcelFareConfig[];
}

export interface MobilityFeatureFlag {
  id: string;
  state_name: string;
  state_code: string;
  rides_enabled: boolean;
  bike_taxi_enabled: boolean;
  hire_driver_enabled: boolean;
  updated_at: string;
}
