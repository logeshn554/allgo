/**
 * AllGo Supported Business Verticals
 *
 * Mobility verticals (RIDE, HIRE_DRIVER) are gated behind per-state feature flags
 * and disabled by default until regulatory clearances are obtained.
 */
export declare const VerticalType: {
    readonly FOOD: "FOOD";
    readonly GROCERY: "GROCERY";
    readonly PARCEL: "PARCEL";
    readonly RIDE: "RIDE";
    readonly HIRE_DRIVER: "HIRE_DRIVER";
    readonly HOME_MADE: "HOME_MADE";
};
export type VerticalType = (typeof VerticalType)[keyof typeof VerticalType];
export declare const ALL_VERTICALS: readonly VerticalType[];
/**
 * Verticals operational at initial pilot launch (Tamil Nadu / Chennai)
 */
export declare const PILOT_LIVE_VERTICALS: readonly VerticalType[];
/**
 * Verticals requiring explicit state-by-state regulatory clearance
 */
export declare const GATED_MOBILITY_VERTICALS: readonly VerticalType[];
//# sourceMappingURL=vertical.enum.d.ts.map