/**
 * AllGo Mobility Dispatch Offer & Assignment Lifecycle Statuses
 *
 * Tracks individual partner dispatch attempts in `ride_assignments` and `hire_driver_assignments`.
 * Prevents concurrent acceptance through partial unique index WHERE status = 'OFFERED'.
 */
export const AssignmentStatus = {
  OFFERED: 'OFFERED',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;

export type AssignmentStatus = (typeof AssignmentStatus)[keyof typeof AssignmentStatus];

export const ALL_ASSIGNMENT_STATUSES: readonly AssignmentStatus[] = [
  AssignmentStatus.OFFERED,
  AssignmentStatus.ACCEPTED,
  AssignmentStatus.REJECTED,
  AssignmentStatus.EXPIRED,
  AssignmentStatus.CANCELLED,
];

export const TERMINAL_ASSIGNMENT_STATUSES: readonly AssignmentStatus[] = [
  AssignmentStatus.ACCEPTED,
  AssignmentStatus.REJECTED,
  AssignmentStatus.EXPIRED,
  AssignmentStatus.CANCELLED,
];
