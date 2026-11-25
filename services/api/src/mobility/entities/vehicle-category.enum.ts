/**
 * AllGo Configurable Vehicle Categories
 *
 * Maps passenger transport vehicle tiers to fare formulas in `ride_fares_config`.
 */
export const VehicleCategory = {
  BIKE: 'BIKE',
  AUTO: 'AUTO',
  CAB_ECONOMY: 'CAB_ECONOMY',
  CAB_PREMIUM: 'CAB_PREMIUM',
  CAB_SEDAN: 'CAB_SEDAN',
  CAB_HATCHBACK: 'CAB_HATCHBACK',
  CAB_SUV: 'CAB_SUV',
} as const;

export type VehicleCategory = (typeof VehicleCategory)[keyof typeof VehicleCategory];

/**
 * Standard categories actively configured in ride_fares_config
 */
export const STANDARD_VEHICLE_CATEGORIES: readonly VehicleCategory[] = [
  VehicleCategory.BIKE,
  VehicleCategory.AUTO,
  VehicleCategory.CAB_ECONOMY,
  VehicleCategory.CAB_PREMIUM,
];

/**
 * Vehicle transmission types for passenger cars and hire-driver bookings
 */
export const VehicleTransmission = {
  MANUAL: 'MANUAL',
  AUTOMATIC: 'AUTOMATIC',
} as const;

export type VehicleTransmission = (typeof VehicleTransmission)[keyof typeof VehicleTransmission];

/**
 * Supported customer vehicle fuel types for hire driver duty
 */
export const VehicleFuelType = {
  PETROL: 'PETROL',
  DIESEL: 'DIESEL',
  CNG: 'CNG',
  ELECTRIC: 'ELECTRIC',
  HYBRID: 'HYBRID',
} as const;

export type VehicleFuelType = (typeof VehicleFuelType)[keyof typeof VehicleFuelType];
