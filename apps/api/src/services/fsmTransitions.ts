import { OrderStatus, type ServiceVertical } from '@allgo/common';
import { InvalidTransitionError, OtpVerificationError } from './fsmTypes.js';

export const VERTICAL_STATE_TRANSITIONS: Record<ServiceVertical, Partial<Record<OrderStatus, OrderStatus[]>>> = {
  RIDE_HAILING: {
    [OrderStatus.CREATED]: [OrderStatus.PAYMENT_PENDING, OrderStatus.CONFIRMED, OrderStatus.DISPATCHING, OrderStatus.CANCELLED],
    [OrderStatus.PAYMENT_PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    [OrderStatus.CONFIRMED]: [OrderStatus.DISPATCHING, OrderStatus.CANCELLED],
    [OrderStatus.DISPATCHING]: [OrderStatus.DRIVER_ASSIGNED, OrderStatus.CANCELLED],
    [OrderStatus.DRIVER_ASSIGNED]: [OrderStatus.ARRIVED_AT_PICKUP, OrderStatus.DISPATCHING, OrderStatus.CANCELLED],
    [OrderStatus.ARRIVED_AT_PICKUP]: [OrderStatus.PICKED_UP, OrderStatus.CANCELLED],
    [OrderStatus.PICKED_UP]: [OrderStatus.IN_TRANSIT],
    [OrderStatus.IN_TRANSIT]: [OrderStatus.ARRIVED_AT_DROP, OrderStatus.COMPLETED],
    [OrderStatus.ARRIVED_AT_DROP]: [OrderStatus.COMPLETED, OrderStatus.DELIVERED],
    [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED, OrderStatus.DISPUTED],
    [OrderStatus.COMPLETED]: [OrderStatus.DISPUTED],
    [OrderStatus.CANCELLED]: [],
    [OrderStatus.DISPUTED]: [],
  },

  INSTANT_GROCERY: {
    [OrderStatus.CREATED]: [OrderStatus.PAYMENT_PENDING, OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    [OrderStatus.PAYMENT_PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    [OrderStatus.CONFIRMED]: [OrderStatus.MERCHANT_ACCEPTED, OrderStatus.CANCELLED],
    [OrderStatus.MERCHANT_ACCEPTED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
    [OrderStatus.PREPARING]: [OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED],
    [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.DISPATCHING, OrderStatus.DRIVER_ASSIGNED],
    [OrderStatus.DISPATCHING]: [OrderStatus.DRIVER_ASSIGNED, OrderStatus.CANCELLED],
    [OrderStatus.DRIVER_ASSIGNED]: [OrderStatus.ARRIVED_AT_PICKUP, OrderStatus.DISPATCHING, OrderStatus.CANCELLED],
    [OrderStatus.ARRIVED_AT_PICKUP]: [OrderStatus.PICKED_UP, OrderStatus.CANCELLED],
    [OrderStatus.PICKED_UP]: [OrderStatus.IN_TRANSIT],
    [OrderStatus.IN_TRANSIT]: [OrderStatus.ARRIVED_AT_DROP],
    [OrderStatus.ARRIVED_AT_DROP]: [OrderStatus.DELIVERED],
    [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED, OrderStatus.DISPUTED],
    [OrderStatus.COMPLETED]: [OrderStatus.DISPUTED],
    [OrderStatus.CANCELLED]: [],
    [OrderStatus.DISPUTED]: [],
  },

  PARCEL_DELIVERY: {
    [OrderStatus.CREATED]: [OrderStatus.PAYMENT_PENDING, OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    [OrderStatus.PAYMENT_PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    [OrderStatus.CONFIRMED]: [OrderStatus.DISPATCHING, OrderStatus.CANCELLED],
    [OrderStatus.DISPATCHING]: [OrderStatus.DRIVER_ASSIGNED, OrderStatus.CANCELLED],
    [OrderStatus.DRIVER_ASSIGNED]: [OrderStatus.ARRIVED_AT_PICKUP, OrderStatus.DISPATCHING, OrderStatus.CANCELLED],
    [OrderStatus.ARRIVED_AT_PICKUP]: [OrderStatus.PICKED_UP, OrderStatus.CANCELLED],
    [OrderStatus.PICKED_UP]: [OrderStatus.IN_TRANSIT],
    [OrderStatus.IN_TRANSIT]: [OrderStatus.ARRIVED_AT_DROP],
    [OrderStatus.ARRIVED_AT_DROP]: [OrderStatus.DELIVERED],
    [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED, OrderStatus.DISPUTED],
    [OrderStatus.COMPLETED]: [OrderStatus.DISPUTED],
    [OrderStatus.CANCELLED]: [],
    [OrderStatus.DISPUTED]: [],
  },
};

export function validateFsmTransition(
  vertical: ServiceVertical,
  currentStatus: OrderStatus,
  targetStatus: OrderStatus
): void {
  if (currentStatus === targetStatus) {
    return;
  }

  const verticalMatrix = VERTICAL_STATE_TRANSITIONS[vertical];
  if (!verticalMatrix) {
    throw new InvalidTransitionError(vertical, currentStatus, targetStatus);
  }

  const allowedTargets = verticalMatrix[currentStatus] || [];
  if (!allowedTargets.includes(targetStatus)) {
    throw new InvalidTransitionError(vertical, currentStatus, targetStatus);
  }
}

export function requiresCryptographicOtp(targetStatus: OrderStatus): 'PICKUP' | 'DROP' | null {
  if (targetStatus === OrderStatus.PICKED_UP) {
    return 'PICKUP';
  }
  if (targetStatus === OrderStatus.DELIVERED) {
    return 'DROP';
  }
  return null;
}

export function verify4DigitOtp(inputOtp?: string, expectedOtp?: string | null): void {
  if (!inputOtp || !/^\d{4}$/.test(inputOtp.trim())) {
    throw new OtpVerificationError('INVALID_OTP: A 4-digit numeric OTP is required for this transition');
  }

  if (!expectedOtp || inputOtp.trim() !== expectedOtp.trim()) {
    throw new OtpVerificationError('INVALID_OTP: 4-digit code does not match the expected security pin');
  }
}
