/**
 * AllGo Domain Event Actor Types
 *
 * Identifies the principal executing an action in immutable event logs (`ride_events`, `hire_driver_events`).
 */
export const ActorType = {
  CUSTOMER: 'CUSTOMER',
  DRIVER: 'DRIVER',
  PARTNER: 'PARTNER',
  ADMIN: 'ADMIN',
  SYSTEM: 'SYSTEM',
} as const;

export type ActorType = (typeof ActorType)[keyof typeof ActorType];

export const ALL_ACTOR_TYPES: readonly ActorType[] = [
  ActorType.CUSTOMER,
  ActorType.DRIVER,
  ActorType.PARTNER,
  ActorType.ADMIN,
  ActorType.SYSTEM,
];
