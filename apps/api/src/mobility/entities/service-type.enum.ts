/**
 * AllGo Phase 8 Ride Trip Service Types
 *
 * Defines the operational duration and geography of passenger rides:
 * - DAILY_RIDE: On-demand point-to-point intra-city travel
 * - RENTAL: Multi-hour vehicle rental package with reserved driver
 * - OUTSTATION: Inter-city long-distance transit between designated zones
 */
export const ServiceType = {
  DAILY_RIDE: 'DAILY_RIDE',
  RENTAL: 'RENTAL',
  OUTSTATION: 'OUTSTATION',
} as const;

export type ServiceType = (typeof ServiceType)[keyof typeof ServiceType];

export const ALL_SERVICE_TYPES: readonly ServiceType[] = [
  ServiceType.DAILY_RIDE,
  ServiceType.RENTAL,
  ServiceType.OUTSTATION,
];

/**
 * AllGo Mobility Service Verticals
 *
 * Distinct mobility offerings approved per partner and configured in mobility_feature_flags
 */
export const MobilityServiceType = {
  BIKE_TAXI: 'BIKE_TAXI',
  AUTO_RICKSHAW: 'AUTO_RICKSHAW',
  CAB: 'CAB',
  HIRE_DRIVER: 'HIRE_DRIVER',
} as const;

export type MobilityServiceType = (typeof MobilityServiceType)[keyof typeof MobilityServiceType];

export const ALL_MOBILITY_SERVICES: readonly MobilityServiceType[] = [
  MobilityServiceType.BIKE_TAXI,
  MobilityServiceType.AUTO_RICKSHAW,
  MobilityServiceType.CAB,
  MobilityServiceType.HIRE_DRIVER,
];
