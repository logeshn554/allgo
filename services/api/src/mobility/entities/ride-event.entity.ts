import { ActorType } from './actor-type.enum.js';
import { RideEventType } from './event-type.enum.js';
import { GeoCoordinates } from './fare-snapshot.types.js';

/**
 * Raw PostgreSQL Table Row Interface for `ride_events`
 * Table is append-only and immutable.
 */
export interface RideEventRow {
  id: string; // UUID
  ride_id: string; // UUID
  event_type: string; // RideEventType
  from_status: string | null;
  to_status: string | null;
  actor_id: string | null; // UUID
  actor_role: string; // ActorType
  actor_type?: string; // ActorType
  location: any | null; // PostGIS Point geometry
  reason: string | null;
  metadata: Record<string, any>; // JSONB
  payload?: Record<string, any>; // JSONB
  created_at: Date | string;
}

/**
 * Domain Entity Interface for Ride Event Audit Log
 */
export interface RideEvent {
  id: string;
  rideId: string;
  eventType: RideEventType;
  fromStatus?: string;
  toStatus?: string;
  actorId?: string;
  actorType: ActorType;
  actorRole?: ActorType;
  location?: GeoCoordinates;
  reason?: string;
  metadata: Record<string, any>;
  payload?: Record<string, any>;
  createdAt: Date;
}
