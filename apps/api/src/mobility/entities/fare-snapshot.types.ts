import { ServiceType } from './service-type.enum.js';
import { VehicleCategory } from './vehicle-category.enum.js';

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface ContactInfo {
  name: string;
  phone: string;
}

export interface FareBreakdownItem {
  name: string;
  amountInr: number;
  description?: string;
}

/**
 * Authoritative Server-Side Fare Quote Snapshot
 *
 * Immutable pricing agreement created at quote generation time and stored in `fare_quote_snapshot` JSONB.
 * Validates fare expiry (default 300s) and decimal-safe monetary breakdowns.
 */
export interface FareQuoteSnapshot {
  quoteId: string;
  serviceType: ServiceType;
  vehicleCategory: VehicleCategory;
  pricingRuleVersion: string;
  currency: string; // 'INR'
  baseFareInr: number;
  baseDistanceKm: number;
  perKmRateInr: number;
  perMinuteRateInr: number;
  estimatedDistanceKm: number;
  estimatedDurationMinutes: number;
  distanceFareInr: number;
  timeFareInr: number;
  zoneSurgeMultiplier: number;
  surgeAmountInr: number;
  minimumFareInr: number;
  waitingChargePerMinuteInr?: number;
  serviceSpecificFeeInr?: number;
  nightAllowanceInr?: number;
  platformFeeInr: number;
  gstRate: number; // e.g. 0.05 (5%)
  gstAmountInr: number;
  discountInr: number;
  couponCode?: string;
  totalFareInr: number;
  partnerEstimatedPayoutInr: number;
  breakdown?: FareBreakdownItem[];
  quotedAt: string; // ISO 8601
  expiresAt: string; // ISO 8601
}

/**
 * Authoritative Server-Side Final Fare Snapshot
 *
 * Final financial ledger record computed at trip completion and stored in `final_fare_snapshot` JSONB.
 */
export interface FinalFareSnapshot {
  quoteId?: string;
  pricingRuleVersion: string;
  currency: string; // 'INR'
  actualDistanceKm: number;
  actualDurationMinutes: number;
  waitingDurationMinutes: number;
  waitingChargeInr: number;
  baseFareInr: number;
  distanceFareInr: number;
  timeFareInr: number;
  surgeMultiplier: number;
  surgeAmountInr: number;
  tollChargesInr: number;
  parkingChargesInr: number;
  nightAllowanceInr: number;
  overtimeFeeInr: number;
  platformFeeInr: number;
  gstRate: number; // e.g. 0.05 (5%)
  gstAmountInr: number;
  discountInr: number;
  subtotalInr: number;
  totalFinalFareInr: number;
  partnerPayoutInr: number;
  platformNetRevenueInr: number;
  paymentMethod: 'ONLINE' | 'WALLET' | 'CASH';
  paymentReference?: string;
  settledAt: string; // ISO 8601
}
