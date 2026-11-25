/**
 * AllGo Phase 8 Ride Lifecycle Statuses (15 States)
 *
 * Models the complete, authoritative state machine for passenger mobility rides.
 * Aligns with PostgreSQL Migration 010 check constraint `chk_ride_status`.
 */
export const RideStatus = {
  RIDE_REQUESTED: 'RIDE_REQUESTED',
  SEARCHING_FOR_DRIVER: 'SEARCHING_FOR_DRIVER',
  DRIVER_ASSIGNED: 'DRIVER_ASSIGNED',
  DRIVER_ACCEPTED: 'DRIVER_ACCEPTED',
  DRIVER_REJECTED: 'DRIVER_REJECTED',
  DRIVER_ARRIVING: 'DRIVER_ARRIVING',
  DRIVER_ARRIVED: 'DRIVER_ARRIVED',
  TRIP_STARTED: 'TRIP_STARTED',
  TRIP_IN_PROGRESS: 'TRIP_IN_PROGRESS',
  TRIP_COMPLETED: 'TRIP_COMPLETED',
  RIDE_CANCELLED: 'RIDE_CANCELLED',
  DRIVER_CANCELLED: 'DRIVER_CANCELLED',
  CUSTOMER_CANCELLED: 'CUSTOMER_CANCELLED',
  RIDE_EXPIRED: 'RIDE_EXPIRED',
  DISPUTED: 'DISPUTED',
} as const;

export type RideStatus = (typeof RideStatus)[keyof typeof RideStatus];

/**
 * All 15 canonical ride statuses in lifecycle sequence
 */
export const ALL_RIDE_STATUSES: readonly RideStatus[] = [
  RideStatus.RIDE_REQUESTED,
  RideStatus.SEARCHING_FOR_DRIVER,
  RideStatus.DRIVER_ASSIGNED,
  RideStatus.DRIVER_ACCEPTED,
  RideStatus.DRIVER_REJECTED,
  RideStatus.DRIVER_ARRIVING,
  RideStatus.DRIVER_ARRIVED,
  RideStatus.TRIP_STARTED,
  RideStatus.TRIP_IN_PROGRESS,
  RideStatus.TRIP_COMPLETED,
  RideStatus.RIDE_CANCELLED,
  RideStatus.DRIVER_CANCELLED,
  RideStatus.CUSTOMER_CANCELLED,
  RideStatus.RIDE_EXPIRED,
  RideStatus.DISPUTED,
];

/**
 * Terminal statuses where no standard forward transitions can occur
 */
export const TERMINAL_RIDE_STATUSES: readonly RideStatus[] = [
  RideStatus.TRIP_COMPLETED,
  RideStatus.RIDE_CANCELLED,
  RideStatus.DRIVER_CANCELLED,
  RideStatus.CUSTOMER_CANCELLED,
  RideStatus.RIDE_EXPIRED,
  RideStatus.DISPUTED,
];

/**
 * In-flight statuses where ride occupies driver vertical lock and operational tracking
 */
export const ACTIVE_RIDE_STATUSES: readonly RideStatus[] = [
  RideStatus.RIDE_REQUESTED,
  RideStatus.SEARCHING_FOR_DRIVER,
  RideStatus.DRIVER_ASSIGNED,
  RideStatus.DRIVER_ACCEPTED,
  RideStatus.DRIVER_ARRIVING,
  RideStatus.DRIVER_ARRIVED,
  RideStatus.TRIP_STARTED,
  RideStatus.TRIP_IN_PROGRESS,
];

/**
 * Statuses from which cancellation is permitted
 */
export const CANCELLABLE_RIDE_STATUSES: readonly RideStatus[] = [
  RideStatus.RIDE_REQUESTED,
  RideStatus.SEARCHING_FOR_DRIVER,
  RideStatus.DRIVER_ASSIGNED,
  RideStatus.DRIVER_ACCEPTED,
  RideStatus.DRIVER_ARRIVING,
  RideStatus.DRIVER_ARRIVED,
];

/**
 * Authoritative state machine transition graph.
 * Any transition not present in this map throws BadRequestException.
 */
export const VALID_RIDE_TRANSITIONS: Record<RideStatus, readonly RideStatus[]> = {
  [RideStatus.RIDE_REQUESTED]: [
    RideStatus.SEARCHING_FOR_DRIVER,
    RideStatus.CUSTOMER_CANCELLED,
    RideStatus.RIDE_CANCELLED,
    RideStatus.RIDE_EXPIRED,
  ],
  [RideStatus.SEARCHING_FOR_DRIVER]: [
    RideStatus.DRIVER_ASSIGNED,
    RideStatus.CUSTOMER_CANCELLED,
    RideStatus.RIDE_CANCELLED,
    RideStatus.RIDE_EXPIRED,
  ],
  [RideStatus.DRIVER_ASSIGNED]: [
    RideStatus.DRIVER_ACCEPTED,
    RideStatus.DRIVER_REJECTED,
    RideStatus.SEARCHING_FOR_DRIVER,
    RideStatus.CUSTOMER_CANCELLED,
    RideStatus.RIDE_CANCELLED,
    RideStatus.RIDE_EXPIRED,
  ],
  [RideStatus.DRIVER_ACCEPTED]: [
    RideStatus.DRIVER_ARRIVING,
    RideStatus.DRIVER_ARRIVED,
    RideStatus.DRIVER_CANCELLED,
    RideStatus.CUSTOMER_CANCELLED,
    RideStatus.RIDE_CANCELLED,
  ],
  [RideStatus.DRIVER_REJECTED]: [RideStatus.SEARCHING_FOR_DRIVER, RideStatus.RIDE_EXPIRED],
  [RideStatus.DRIVER_ARRIVING]: [
    RideStatus.DRIVER_ARRIVED,
    RideStatus.DRIVER_CANCELLED,
    RideStatus.CUSTOMER_CANCELLED,
    RideStatus.RIDE_CANCELLED,
  ],
  [RideStatus.DRIVER_ARRIVED]: [
    RideStatus.TRIP_STARTED,
    RideStatus.DRIVER_CANCELLED,
    RideStatus.CUSTOMER_CANCELLED,
    RideStatus.RIDE_CANCELLED,
  ],
  [RideStatus.TRIP_STARTED]: [
    RideStatus.TRIP_IN_PROGRESS,
    RideStatus.TRIP_COMPLETED,
    RideStatus.DISPUTED,
  ],
  [RideStatus.TRIP_IN_PROGRESS]: [RideStatus.TRIP_COMPLETED, RideStatus.DISPUTED],
  [RideStatus.TRIP_COMPLETED]: [RideStatus.DISPUTED],
  [RideStatus.RIDE_CANCELLED]: [RideStatus.DISPUTED],
  [RideStatus.DRIVER_CANCELLED]: [RideStatus.DISPUTED],
  [RideStatus.CUSTOMER_CANCELLED]: [RideStatus.DISPUTED],
  [RideStatus.RIDE_EXPIRED]: [],
  [RideStatus.DISPUTED]: [],
};

/**
 * Validates whether transition from current status to target status is permitted
 */
export function isValidRideTransition(from: RideStatus, to: RideStatus): boolean {
  const allowed = VALID_RIDE_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}
