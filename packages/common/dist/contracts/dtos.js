import { z } from 'zod';
import { ServiceVerticalSchema } from "./service-vertical.js";
/**
 * Location coordinate pair with human-readable address
 */
export const LocationCoordinateSchema = z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    address: z.string().min(1),
    name: z.string().optional(),
});
/**
 * 1. FareQuote Contract
 */
export const FareQuoteSchema = z.object({
    quoteId: z.string().uuid(),
    vertical: ServiceVerticalSchema,
    baseFareInr: z.number().nonnegative(),
    distanceKm: z.number().nonnegative(),
    durationMinutes: z.number().nonnegative(),
    surgeMultiplier: z.number().min(1.0).default(1.0),
    taxInr: z.number().nonnegative().default(0),
    totalFareInr: z.number().nonnegative(),
    currency: z.literal('INR').default('INR'),
    expiresAt: z.string().datetime(),
});
/**
 * 2. CartPricingBreakdown Contract
 */
export const CartPricingBreakdownSchema = z.object({
    itemTotalInr: z.number().nonnegative(),
    packagingFeeInr: z.number().nonnegative().default(0),
    deliveryFeeInr: z.number().nonnegative().default(0),
    surgeFeeInr: z.number().nonnegative().default(0),
    platformFeeInr: z.number().nonnegative().default(0),
    taxGstInr: z.number().nonnegative().default(0),
    tipInr: z.number().nonnegative().default(0),
    discountInr: z.number().nonnegative().default(0),
    finalTotalInr: z.number().nonnegative(),
    currency: z.literal('INR').default('INR'),
});
/**
 * 3. DispatchOfferPayload Contract
 */
export const DispatchOfferPayloadSchema = z.object({
    offerId: z.string().uuid(),
    orderId: z.string().uuid(),
    vertical: ServiceVerticalSchema,
    pickupLocation: LocationCoordinateSchema,
    dropoffLocation: LocationCoordinateSchema,
    driverPayoutInr: z.number().positive(),
    estimatedDistanceKm: z.number().nonnegative(),
    estimatedDurationMinutes: z.number().nonnegative(),
    expiresAtSeconds: z.number().positive().default(45),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
/**
 * 4. DriverLocationPing Contract
 */
export const DriverLocationPingSchema = z.object({
    driverId: z.string(),
    partnerId: z.string().optional(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    heading: z.number().min(0).max(360).optional(),
    speedMps: z.number().nonnegative().optional(),
    accuracyMeters: z.number().nonnegative().optional(),
    recordedAt: z.string().datetime().optional(),
    activeVerticalLock: ServiceVerticalSchema.optional(),
});
/**
 * 5. ProofOfDelivery Contract
 */
export const ProofOfDeliverySchema = z.object({
    orderId: z.string().uuid(),
    deliveryPin: z.string().length(4).or(z.string().length(6)).optional(),
    recipientSignature: z.string().optional(),
    photoStorageKey: z.string().optional(),
    proofType: z.enum(['OTP', 'PHOTO', 'SIGNATURE', 'CONTACTLESS']),
    confirmedAt: z.string().datetime(),
    dropLocation: z
        .object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
    })
        .optional(),
});
//# sourceMappingURL=dtos.js.map