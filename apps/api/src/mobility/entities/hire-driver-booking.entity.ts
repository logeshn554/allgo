import { PricingModel } from './pricing-model.enum.js';
import { VehicleTransmission, VehicleFuelType } from './vehicle-category.enum.js';
import { FareQuoteSnapshot, FinalFareSnapshot, GeoCoordinates } from './fare-snapshot.types.js';

/**
 * Raw PostgreSQL Table Row Interface for `hire_driver_bookings`
 */
export interface HireDriverBookingRow {
  id: string; // UUID
  booking_number: string;
  customer_id: string; // UUID
  partner_id: string | null; // UUID
  city_id: string; // UUID
  status: string; // 'BOOKED' | 'SEARCHING_FOR_DRIVER' | 'DRIVER_ASSIGNED' | ...
  booking_type: string; // 'HOURLY' | 'ONE_WAY' | 'OUTSTATION'
  pricing_model: string; // 'HOURLY' | 'FIXED' | 'DISTANCE_BASED' | 'PACKAGE'
  duration_hours: number;
  scheduled_start_time: Date | string;
  actual_start_time: Date | string | null;
  actual_end_time: Date | string | null;
  pickup_address: string;
  pickup_location: any; // PostGIS Point geometry
  drop_address: string | null;
  drop_location: any | null; // PostGIS Point geometry
  vehicle_transmission: string; // 'MANUAL' | 'AUTOMATIC'
  vehicle_model: string | null;
  customer_vehicle_registration: string | null;
  customer_vehicle_make_model: string | null;
  customer_vehicle_fuel_type: string | null;
  customer_vehicle_transmission: string | null;
  start_otp: string;
  start_otp_hash: string | null;
  start_otp_attempts: number;
  end_otp: string;
  end_otp_hash: string | null;
  end_otp_attempts: number;
  otp_attempts?: number;
  start_odometer_km: number | null;
  end_odometer_km: number | null;
  duty_started_at: Date | string | null;
  duty_completed_at: Date | string | null;
  base_fee_inr: string | number; // numeric(12,2)
  extra_hours_fee_inr: string | number; // numeric(12,2)
  night_allowance_inr: string | number; // numeric(12,2)
  platform_fee_inr: string | number; // numeric(12,2)
  tax_total_inr: string | number; // numeric(12,2)
  total_amount_inr: string | number; // numeric(12,2)
  partner_payout_inr: string | number; // numeric(12,2)
  fare_quote_snapshot: FareQuoteSnapshot | null; // JSONB
  final_fare_snapshot: FinalFareSnapshot | null; // JSONB
  payment_method?: string;
  payment_status: string;
  payment_reference: string | null;
  cancellation_reason: string | null;
  cancelled_by_user_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

/**
 * Domain Entity Interface for Hire Driver Booking
 */
export interface HireDriverBooking {
  id: string;
  bookingNumber: string;
  customerId: string;
  partnerId: string | null;
  cityId: string;
  status: string;
  pricingModel: PricingModel;
  durationHours: number;
  scheduledStartTime: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  pickupAddress: string;
  pickupLocation: GeoCoordinates;
  dropAddress?: string;
  dropLocation?: GeoCoordinates;
  vehicleTransmission: VehicleTransmission;
  customerVehicleRegistration?: string;
  customerVehicleMakeModel?: string;
  customerVehicleFuelType?: VehicleFuelType;
  customerVehicleTransmission?: VehicleTransmission;
  startOtp?: string;
  startOtpHash?: string;
  startOtpAttempts: number;
  endOtp?: string;
  endOtpHash?: string;
  endOtpAttempts: number;
  startOdometerKm?: number;
  endOdometerKm?: number;
  dutyStartedAt?: Date;
  dutyCompletedAt?: Date;
  baseFeeInr: number;
  extraHoursFeeInr: number;
  nightAllowanceInr: number;
  platformFeeInr: number;
  taxTotalInr: number;
  totalAmountInr: number;
  partnerPayoutInr: number;
  fareQuoteSnapshot?: FareQuoteSnapshot;
  finalFareSnapshot?: FinalFareSnapshot;
  paymentMethod: string;
  paymentStatus: string;
  paymentReference?: string;
  cancellationReason?: string;
  cancelledByUserId?: string;
  createdAt: Date;
  updatedAt: Date;
}
