/**
 * AllGo Fulfillment Modes (Section 5A Dual Fulfillment Strategy)
 *
 * SEPARATE (Mode A): Independent courier assigned per sub-order / merchant outlet.
 * DELIVER_TOGETHER (Mode B): Single courier batches multiple merchant pick-ups
 * within proximity threshold (<=1.5 km) with perishability-aware routing.
 */
export declare const FulfillmentMode: {
    readonly SEPARATE: "SEPARATE";
    readonly DELIVER_TOGETHER: "DELIVER_TOGETHER";
};
export type FulfillmentMode = (typeof FulfillmentMode)[keyof typeof FulfillmentMode];
export declare const ALL_FULFILLMENT_MODES: readonly FulfillmentMode[];
//# sourceMappingURL=fulfillment-mode.enum.d.ts.map