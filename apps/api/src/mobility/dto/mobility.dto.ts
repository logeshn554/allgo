export interface CoordinatesDto {
  latitude: number;
  longitude: number;
}

export type VehicleCategory = 'BIKE' | 'AUTO' | 'CAB_ECONOMY' | 'CAB_PREMIUM';
export type ParcelVehicleType = 'TWO_WHEELER' | 'THREE_WHEELER' | 'TATA_ACE' | 'PICKUP_TRUCK';
export type PackageCategory = 'DOCUMENTS' | 'FOOD_BOX' | 'ELECTRONICS' | 'CLOTHES_ITEMS' | 'GENERAL';
export type VehicleTransmission = 'MANUAL' | 'AUTOMATIC';
export type PartnerOperationalMode = 'DELIVERIES_ONLY' | 'RIDES_ONLY' | 'ALL_JOBS';
export type VerticalLock = 'FOOD' | 'GROCERY' | 'PARCEL' | 'RIDE' | 'HIRE_DRIVER';

export interface EstimateRideFareDto {
  pickupLocation: CoordinatesDto;
  dropoffLocation: CoordinatesDto;
  stateCode?: string;
}

export interface BookRideDto {
  pickupLocation: CoordinatesDto;
  pickupAddress: string;
  dropoffLocation: CoordinatesDto;
  dropoffAddress: string;
  vehicleCategory: VehicleCategory;
  paymentMethod?: 'ONLINE' | 'WALLET' | 'CASH';
  stateCode?: string;
  serviceType?: string;
  passengerCount?: number;
  specialInstructions?: string;
  pickupContactName?: string;
  pickupContactPhone?: string;
  dropContactName?: string;
  dropContactPhone?: string;
}

export interface StartTripDto {
  startOtp: string;
}

export interface CompleteTripDto {
  actualDistanceKm?: number;
  actualDurationMinutes?: number;
}

export interface TriggerSosDto {
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface QuoteParcelFareDto {
  pickupLocation: CoordinatesDto;
  dropoffLocation: CoordinatesDto;
  packageCategory?: PackageCategory;
  vehicleType?: ParcelVehicleType;
  weightKg?: number;
  isFragile?: boolean;
}

export interface CreateParcelDeliveryDto {
  pickupLocation: CoordinatesDto;
  pickupAddress: string;
  pickupContactName: string;
  pickupContactPhone: string;
  dropoffLocation: CoordinatesDto;
  dropoffAddress: string;
  dropoffContactName: string;
  dropoffContactPhone: string;
  packageCategory?: PackageCategory;
  vehicleType?: ParcelVehicleType;
  weightKg?: number;
  packageDescription?: string;
  isFragile?: boolean;
  paymentMethod?: 'COD' | 'UPI' | 'CARD' | 'WALLET';
}

export interface VerifyParcelOtpDto {
  otp: string;
}

export interface EstimateHireDriverDto {
  durationHours: 4 | 8 | 12;
  vehicleTransmission: VehicleTransmission;
  scheduledStartTime: string;
}

export interface BookHireDriverDto {
  durationHours: 4 | 8 | 12;
  vehicleTransmission: VehicleTransmission;
  pickupLocation: CoordinatesDto;
  pickupAddress: string;
  scheduledStartTime: string;
  stateCode?: string;
}

export interface StartHireDutyDto {
  startOtp: string;
  odometerKm?: number;
}

export interface EndHireDutyDto {
  endOtp: string;
  odometerKm?: number;
}

export interface UpdatePartnerModeDto {
  mode: PartnerOperationalMode;
}
