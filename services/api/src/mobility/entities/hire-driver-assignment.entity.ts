import { AssignmentStatus } from './assignment-status.enum.js';

/**
 * Raw PostgreSQL Table Row Interface for `hire_driver_assignments`
 */
export interface HireDriverAssignmentRow {
  id: string; // UUID
  booking_id: string; // UUID
  driver_id?: string; // UUID
  partner_id: string; // UUID
  attempt_number: number;
  status: string; // AssignmentStatus
  offer_sent_at: Date | string;
  offer_expires_at: Date | string;
  responded_at: Date | string | null;
  rejection_reason: string | null;
  reassignment_reason: string | null;
  distance_to_pickup_meters: string | number | null; // numeric(10,2)
  estimated_pickup_eta_seconds: number | null;
  created_at: Date | string;
  updated_at: Date | string;
}

/**
 * Domain Entity Interface for Hire Driver Assignment Offer
 */
export interface HireDriverAssignment {
  id: string;
  bookingId: string;
  driverId?: string;
  partnerId: string;
  attemptNumber: number;
  status: AssignmentStatus;
  offerSentAt: Date;
  offerExpiresAt: Date;
  respondedAt?: Date;
  rejectionReason?: string;
  reassignmentReason?: string;
  distanceToPickupMeters?: number;
  estimatedPickupEtaSeconds?: number;
  createdAt: Date;
  updatedAt: Date;
}
