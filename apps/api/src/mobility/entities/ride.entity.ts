import { RideStatus } from './ride-status.enum.js';
import { ServiceType } from './service-type.enum.js';
import { VehicleCategory } from './vehicle-category.enum.js';
import { FareQuoteSnapshot, FinalFareSnapshot, GeoCoordinates, ContactInfo } from './fare-snapshot.types.js';

/**
 * Raw PostgreSQL Table Row Interface for `rides`
 * Reflects columns returned by the pg driver from PostgreSQL.
 * Note: Postgres numeric(12,2) is returned as string by pg driver.
 */
export interface RideRow {
  id: string; // UUID
  ride_number: string;
  customer_id: string; // UUID
  partner_id: string | null; // UUID
  vehicle_id: string | null; // UUID
  city_id: string; // UUID
  zone_id: string | null; // UUID
  service_type: string; // DAILY_RIDE, RENTAL, OUTSTATION, BIKE_TAXI, etc.
  vehicle_category: string; // BIKE, AUTO, CAB_ECONOMY, CAB_PREMIUM
  ride_type: string; // Legacy column alias for vehicle_category
  status: string; // 15-state RideStatus
  pickup_address: string;
  pickup_location: any; // PostGIS Point geometry
  drop_address: string;
  drop_location: any; // PostGIS Point geometry
  pickup_contact_name: string | null;
  pickup_contact_phone: string | null;
  drop_contact_name: string | null;
  drop_contact_phone: string | null;
  passenger_count: number;
  special_instructions: string | null;
  start_otp: string;
  otp_hash: string | null;
  otp_attempts: number;
  estimated_distance_km: string | number; // numeric(8,2)
  actual_distance_km: string | number | null; // numeric(8,2)
  estimated_duration_minutes: number;
  actual_duration_minutes: number | null;
  fare_base_inr: string | number; // numeric(12,2)
  fare_distance_inr: string | number; // numeric(12,2)
  fare_time_inr: string | number; // numeric(12,2)
  surge_multiplier: string | number; // numeric(4,2)
  platform_fee_inr: string | number; // numeric(12,2)
  tax_total_inr: string | number; // numeric(12,2)
  discount_inr: string | number; // numeric(12,2)
  total_fare_inr: string | number; // numeric(12,2)
  partner_payout_inr: string | number; // numeric(12,2)
  fare_quote_snapshot: FareQuoteSnapshot | null; // JSONB
  final_fare_snapshot: FinalFareSnapshot | null; // JSONB
  pricing_rule_version: string | null;
  payment_method: string; // 'ONLINE' | 'WALLET' | 'CASH'
  payment_status: string; // 'PENDING' | 'AUTHORIZED' | 'CAPTURED' | 'COMPLETED' | 'REFUNDED' | 'FAILED'
  payment_reference: string | null;
  scheduled_pickup_time: Date | string | null;
  driver_assigned_at: Date | string | null;
  driver_accepted_at: Date | string | null;
  driver_arrived_at: Date | string | null;
  trip_started_at: Date | string | null;
  trip_completed_at: Date | string | null;
  cancellation_reason: string | null;
  cancelled_by_user_id: string | null;
  sos_triggered_at: Date | string | null;
  sos_status: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

/**
 * Domain Entity Interface for Ride
 * Clean application model with strongly typed properties and parsed numbers.
 */
export interface Ride {
  id: string;
  rideNumber: string;
  customerId: string;
  partnerId: string | null;
  vehicleId: string | null;
  cityId: string;
  zoneId: string | null;
  serviceType: ServiceType;
  vehicleCategory: VehicleCategory;
  status: RideStatus;
  pickupAddress: string;
  pickupLocation: GeoCoordinates;
  dropAddress: string;
  dropLocation: GeoCoordinates;
  pickupContact?: ContactInfo;
  dropContact?: ContactInfo;
  passengerCount: number;
  specialInstructions?: string;
  startOtp?: string;
  otpHash?: string;
  otpAttempts: number;
  estimatedDistanceKm: number;
  actualDistanceKm?: number;
  estimatedDurationMinutes: number;
  actualDurationMinutes?: number;
  baseFareInr: number;
  distanceFareInr: number;
  timeFareInr: number;
  surgeMultiplier: number;
  platformFeeInr: number;
  taxTotalInr: number;
  discountInr: number;
  totalFareInr: number;
  partnerPayoutInr: number;
  fareQuoteSnapshot?: FareQuoteSnapshot;
  finalFareSnapshot?: FinalFareSnapshot;
  pricingRuleVersion?: string;
  paymentMethod: 'ONLINE' | 'WALLET' | 'CASH';
  paymentStatus: string;
  paymentReference?: string;
  scheduledPickupTime?: Date;
  driverAssignedAt?: Date;
  driverAcceptedAt?: Date;
  driverArrivedAt?: Date;
  tripStartedAt?: Date;
  tripCompletedAt?: Date;
  cancellationReason?: string;
  cancelledByUserId?: string;
  sosTriggeredAt?: Date;
  sosStatus?: string;
  createdAt: Date;
  updatedAt: Date;
}
