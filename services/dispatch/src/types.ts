export interface DispatchRequest {
  jobId: string;
  vertical: 'FOOD' | 'GROCERY' | 'PARCEL' | 'RIDE_HAILING' | 'HIRE_DRIVER';
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  requiredVehicleType?: string;
  orderAmountInr?: number;
}

export interface DispatchCandidate {
  partnerId: string;
  distanceKm: number;
  estimatedArrivalMinutes: number;
  score: number;
}

export interface DispatchOffer {
  attemptId: string;
  jobId: string;
  partnerId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  offerExpiresAt: string;
}

export interface DispatchState {
  healthy: boolean;
  version: string;
  uptimeSeconds: number;
  pendingOffersCount: number;
}
