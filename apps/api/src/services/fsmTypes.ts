import type { ServiceVertical, OrderStatus } from '@allgo/common';

export type { ServiceVertical, OrderStatus };

export interface FsmOrderRecord {
  id: string;
  vertical: ServiceVertical;
  status: OrderStatus;
  pickup_otp?: string | null;
  delivery_pin?: string | null;
  customer_id?: string;
  driver_id?: string | null;
  merchant_id?: string | null;
  updated_at?: Date | string;
}

export interface FsmTransitionRequest {
  orderId: string;
  targetStatus: OrderStatus;
  vertical?: ServiceVertical;
  actorId: string;
  actorRole: string;
  otp?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface FsmTransitionResult {
  orderId: string;
  vertical: ServiceVertical;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  transitionedAt: string;
  actorId: string;
  actorRole: string;
  metadata?: Record<string, unknown>;
}

export class InvalidTransitionError extends Error {
  constructor(
    public readonly vertical: string,
    public readonly currentStatus: string,
    public readonly targetStatus: string
  ) {
    super(`INVALID_FSM_TRANSITION: Cannot transition ${vertical} order from '${currentStatus}' to '${targetStatus}'`);
    this.name = 'InvalidTransitionError';
  }
}

export class OtpVerificationError extends Error {
  constructor(message = 'INVALID_OTP: 4-digit verification code is missing or does not match') {
    super(message);
    this.name = 'OtpVerificationError';
  }
}

export class OrderNotFoundError extends Error {
  constructor(orderId: string) {
    super(`ORDER_NOT_FOUND: Order with ID '${orderId}' does not exist`);
    this.name = 'OrderNotFoundError';
  }
}
