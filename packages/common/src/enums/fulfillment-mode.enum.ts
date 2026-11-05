/**
 * AllGo Fulfillment Modes (Section 5A Dual Fulfillment Strategy)
 *
 * SEPARATE (Mode A): Independent courier assigned per sub-order / merchant outlet.
 * DELIVER_TOGETHER (Mode B): Single courier batches multiple merchant pick-ups
 * within proximity threshold (<=1.5 km) with perishability-aware routing.
 */
export enum FulfillmentMode {
  SEPARATE = 'SEPARATE',
  DELIVER_TOGETHER = 'DELIVER_TOGETHER',
}

export const ALL_FULFILLMENT_MODES: readonly FulfillmentMode[] = [
  FulfillmentMode.SEPARATE,
  FulfillmentMode.DELIVER_TOGETHER,
];
