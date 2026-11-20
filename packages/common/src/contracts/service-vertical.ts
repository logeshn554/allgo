import { z } from 'zod';

/**
 * AllGo Core Service Verticals
 */
export const ServiceVertical = {
  RIDE_HAILING: 'RIDE_HAILING',
  INSTANT_GROCERY: 'INSTANT_GROCERY',
  PARCEL_DELIVERY: 'PARCEL_DELIVERY',
} as const;

export type ServiceVertical = (typeof ServiceVertical)[keyof typeof ServiceVertical];

export const ServiceVerticalSchema = z.nativeEnum(ServiceVertical);
