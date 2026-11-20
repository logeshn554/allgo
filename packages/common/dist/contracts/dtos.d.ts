import { z } from 'zod';
/**
 * Location coordinate pair with human-readable address
 */
export declare const LocationCoordinateSchema: z.ZodObject<{
    latitude: z.ZodNumber;
    longitude: z.ZodNumber;
    address: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type LocationCoordinate = z.infer<typeof LocationCoordinateSchema>;
/**
 * 1. FareQuote Contract
 */
export declare const FareQuoteSchema: z.ZodObject<{
    quoteId: z.ZodString;
    vertical: z.ZodEnum<{
        readonly RIDE_HAILING: "RIDE_HAILING";
        readonly INSTANT_GROCERY: "INSTANT_GROCERY";
        readonly PARCEL_DELIVERY: "PARCEL_DELIVERY";
    }>;
    baseFareInr: z.ZodNumber;
    distanceKm: z.ZodNumber;
    durationMinutes: z.ZodNumber;
    surgeMultiplier: z.ZodDefault<z.ZodNumber>;
    taxInr: z.ZodDefault<z.ZodNumber>;
    totalFareInr: z.ZodNumber;
    currency: z.ZodDefault<z.ZodLiteral<"INR">>;
    expiresAt: z.ZodString;
}, z.core.$strip>;
export type FareQuote = z.infer<typeof FareQuoteSchema>;
/**
 * 2. CartPricingBreakdown Contract
 */
export declare const CartPricingBreakdownSchema: z.ZodObject<{
    itemTotalInr: z.ZodNumber;
    packagingFeeInr: z.ZodDefault<z.ZodNumber>;
    deliveryFeeInr: z.ZodDefault<z.ZodNumber>;
    surgeFeeInr: z.ZodDefault<z.ZodNumber>;
    platformFeeInr: z.ZodDefault<z.ZodNumber>;
    taxGstInr: z.ZodDefault<z.ZodNumber>;
    tipInr: z.ZodDefault<z.ZodNumber>;
    discountInr: z.ZodDefault<z.ZodNumber>;
    finalTotalInr: z.ZodNumber;
    currency: z.ZodDefault<z.ZodLiteral<"INR">>;
}, z.core.$strip>;
export type CartPricingBreakdown = z.infer<typeof CartPricingBreakdownSchema>;
/**
 * 3. DispatchOfferPayload Contract
 */
export declare const DispatchOfferPayloadSchema: z.ZodObject<{
    offerId: z.ZodString;
    orderId: z.ZodString;
    vertical: z.ZodEnum<{
        readonly RIDE_HAILING: "RIDE_HAILING";
        readonly INSTANT_GROCERY: "INSTANT_GROCERY";
        readonly PARCEL_DELIVERY: "PARCEL_DELIVERY";
    }>;
    pickupLocation: z.ZodObject<{
        latitude: z.ZodNumber;
        longitude: z.ZodNumber;
        address: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    dropoffLocation: z.ZodObject<{
        latitude: z.ZodNumber;
        longitude: z.ZodNumber;
        address: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    driverPayoutInr: z.ZodNumber;
    estimatedDistanceKm: z.ZodNumber;
    estimatedDurationMinutes: z.ZodNumber;
    expiresAtSeconds: z.ZodDefault<z.ZodNumber>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export type DispatchOfferPayload = z.infer<typeof DispatchOfferPayloadSchema>;
/**
 * 4. DriverLocationPing Contract
 */
export declare const DriverLocationPingSchema: z.ZodObject<{
    driverId: z.ZodString;
    partnerId: z.ZodOptional<z.ZodString>;
    latitude: z.ZodNumber;
    longitude: z.ZodNumber;
    heading: z.ZodOptional<z.ZodNumber>;
    speedMps: z.ZodOptional<z.ZodNumber>;
    accuracyMeters: z.ZodOptional<z.ZodNumber>;
    recordedAt: z.ZodOptional<z.ZodString>;
    activeVerticalLock: z.ZodOptional<z.ZodEnum<{
        readonly RIDE_HAILING: "RIDE_HAILING";
        readonly INSTANT_GROCERY: "INSTANT_GROCERY";
        readonly PARCEL_DELIVERY: "PARCEL_DELIVERY";
    }>>;
}, z.core.$strip>;
export type DriverLocationPing = z.infer<typeof DriverLocationPingSchema>;
/**
 * 5. ProofOfDelivery Contract
 */
export declare const ProofOfDeliverySchema: z.ZodObject<{
    orderId: z.ZodString;
    deliveryPin: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
    recipientSignature: z.ZodOptional<z.ZodString>;
    photoStorageKey: z.ZodOptional<z.ZodString>;
    proofType: z.ZodEnum<{
        OTP: "OTP";
        PHOTO: "PHOTO";
        SIGNATURE: "SIGNATURE";
        CONTACTLESS: "CONTACTLESS";
    }>;
    confirmedAt: z.ZodString;
    dropLocation: z.ZodOptional<z.ZodObject<{
        latitude: z.ZodNumber;
        longitude: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type ProofOfDelivery = z.infer<typeof ProofOfDeliverySchema>;
//# sourceMappingURL=dtos.d.ts.map