// Job: Proof of Delivery (PoD) validation (Camera Photo, Signature, or 4-digit Handover PIN).

import { loadOrderById, updateOrderStatus } from './orderStorage.ts';
import { verifyDeliveryPin } from './otpVerifier.ts';

export type PodMethod = 'PIN' | 'PHOTO' | 'SIGNATURE';

export interface PodPayload {
  orderId: string;
  method: PodMethod;
  deliveryPin?: string;
  photoUrl?: string;
  signatureDataUri?: string;
  recipientNotes?: string;
  latitude: number;
  longitude: number;
}

export interface PodVerificationResult {
  success: boolean;
  orderId: string;
  method: PodMethod;
  message: string;
  recordedAt: string;
}

export function verifyProofOfDelivery(payload: PodPayload): PodVerificationResult {
  const order = loadOrderById(payload.orderId);
  if (!order) {
    return {
      success: false,
      orderId: payload.orderId,
      method: payload.method,
      message: 'Order not found.',
      recordedAt: new Date().toISOString(),
    };
  }

  if (order.status === 'cancelled') {
    return {
      success: false,
      orderId: payload.orderId,
      method: payload.method,
      message: 'Cannot complete Proof of Delivery for a cancelled order.',
      recordedAt: new Date().toISOString(),
    };
  }

  if (order.status === 'delivered') {
    return {
      success: false,
      orderId: payload.orderId,
      method: payload.method,
      message: 'Order has already been completed and delivered.',
      recordedAt: new Date().toISOString(),
    };
  }

  // 1. PIN-based verification
  if (payload.method === 'PIN') {
    if (!payload.deliveryPin) {
      return {
        success: false,
        orderId: payload.orderId,
        method: 'PIN',
        message: 'Delivery PIN is required for PIN handover.',
        recordedAt: new Date().toISOString(),
      };
    }
    const pinRes = verifyDeliveryPin(payload.orderId, payload.deliveryPin.trim());
    return {
      success: pinRes.ok,
      orderId: payload.orderId,
      method: 'PIN',
      message: pinRes.message,
      recordedAt: new Date().toISOString(),
    };
  }

  // 2. Photo-based contactless verification
  if (payload.method === 'PHOTO') {
    if (!payload.photoUrl || payload.photoUrl.trim().length === 0) {
      return {
        success: false,
        orderId: payload.orderId,
        method: 'PHOTO',
        message: 'A clear photo proof of drop-off is compulsory for contactless handover.',
        recordedAt: new Date().toISOString(),
      };
    }
    updateOrderStatus(payload.orderId, 'delivered');
    return {
      success: true,
      orderId: payload.orderId,
      method: 'PHOTO',
      message: 'Contactless delivery photo verified & uploaded.',
      recordedAt: new Date().toISOString(),
    };
  }

  // 3. Signature-based verification
  if (payload.method === 'SIGNATURE') {
    if (!payload.signatureDataUri || payload.signatureDataUri.trim().length === 0) {
      return {
        success: false,
        orderId: payload.orderId,
        method: 'SIGNATURE',
        message: 'Recipient digital signature capture is required.',
        recordedAt: new Date().toISOString(),
      };
    }
    updateOrderStatus(payload.orderId, 'delivered');
    return {
      success: true,
      orderId: payload.orderId,
      method: 'SIGNATURE',
      message: 'Recipient signature verified & saved.',
      recordedAt: new Date().toISOString(),
    };
  }

  return {
    success: false,
    orderId: payload.orderId,
    method: payload.method,
    message: 'Unsupported PoD verification type.',
    recordedAt: new Date().toISOString(),
  };
}
