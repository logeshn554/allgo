import { z } from 'zod';
/**
 * AllGo Core Service Verticals
 */
export declare const ServiceVertical: {
    readonly RIDE_HAILING: "RIDE_HAILING";
    readonly INSTANT_GROCERY: "INSTANT_GROCERY";
    readonly PARCEL_DELIVERY: "PARCEL_DELIVERY";
};
export type ServiceVertical = (typeof ServiceVertical)[keyof typeof ServiceVertical];
export declare const ServiceVerticalSchema: z.ZodEnum<{
    readonly RIDE_HAILING: "RIDE_HAILING";
    readonly INSTANT_GROCERY: "INSTANT_GROCERY";
    readonly PARCEL_DELIVERY: "PARCEL_DELIVERY";
}>;
//# sourceMappingURL=service-vertical.d.ts.map