/**
 * AllGo Distinct Hire Driver Pricing Models
 *
 * Configurable pricing engines for designated driver services where the customer owns the vehicle.
 */
export const PricingModel = {
  HOURLY: 'HOURLY',
  FIXED: 'FIXED',
  DISTANCE_BASED: 'DISTANCE_BASED',
  PACKAGE: 'PACKAGE',
} as const;

export type PricingModel = (typeof PricingModel)[keyof typeof PricingModel];

export const ALL_PRICING_MODELS: readonly PricingModel[] = [
  PricingModel.HOURLY,
  PricingModel.FIXED,
  PricingModel.DISTANCE_BASED,
  PricingModel.PACKAGE,
];
