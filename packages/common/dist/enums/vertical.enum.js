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
};
export const ALL_VERTICALS = Object.values(VerticalType);
/**
 * Verticals operational at initial pilot launch (Tamil Nadu / Chennai)
 */
export const PILOT_LIVE_VERTICALS = [
    VerticalType.FOOD,
    VerticalType.GROCERY,
];
/**
 * Verticals requiring explicit state-by-state regulatory clearance
 */
export const GATED_MOBILITY_VERTICALS = [
    VerticalType.RIDE,
    VerticalType.HIRE_DRIVER,
];
//# sourceMappingURL=vertical.enum.js.map