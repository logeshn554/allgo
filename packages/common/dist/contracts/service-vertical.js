import { z } from 'zod';
/**
 * AllGo Core Service Verticals
 */
export const ServiceVertical = {
    RIDE_HAILING: 'RIDE_HAILING',
    INSTANT_GROCERY: 'INSTANT_GROCERY',
    PARCEL_DELIVERY: 'PARCEL_DELIVERY',
};
export const ServiceVerticalSchema = z.nativeEnum(ServiceVertical);
//# sourceMappingURL=service-vertical.js.map