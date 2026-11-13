/**
 * AllGo Supported Business Verticals
 *
 * Mobility verticals (RIDE, HIRE_DRIVER) are gated behind per-state feature flags
 * and disabled by default until regulatory clearances are obtained.
 */
export const VerticalType = {
  FOOD: 'FOOD',
  GROCERY: 'GROCERY',
  PARCEL: 'PARCEL',
  RIDE: 'RIDE',
  HIRE_DRIVER: 'HIRE_DRIVER',
  HOME_MADE: 'HOME_MADE',
} as const;

export type VerticalType = (typeof VerticalType)[keyof typeof VerticalType];

export const ALL_VERTICALS: readonly VerticalType[] = Object.values(VerticalType);

/**
 * Verticals operational at initial pilot launch (Tamil Nadu / Chennai)
 */
export const PILOT_LIVE_VERTICALS: readonly VerticalType[] = [
  VerticalType.FOOD,
  VerticalType.GROCERY,
];

/**
 * Verticals requiring explicit state-by-state regulatory clearance
 */
export const GATED_MOBILITY_VERTICALS: readonly VerticalType[] = [
  VerticalType.RIDE,
  VerticalType.HIRE_DRIVER,
];
