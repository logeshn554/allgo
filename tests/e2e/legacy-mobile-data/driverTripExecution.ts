import { type GpsCoords, checkGeofenceProximity } from './gpsLoader.ts';
import { loadFromCache, saveToCache } from './localCache.ts';

export type TripStatus =
  | 'DRIVER_ASSIGNED'
  | 'ARRIVED_AT_PICKUP'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'ARRIVED_AT_DROP'
  | 'DELIVERED';

export interface DriverActiveTrip {
  orderId: string;
  vertical: 'RIDE' | 'GROCERY' | 'PARCEL';
  status: TripStatus;
  pickupCoords: GpsCoords;
  pickupAddress: string;
  dropCoords: GpsCoords;
  dropAddress: string;
  customerName: string;
  customerPhone: string;
  rideStartPin?: string;
  merchantHandoverOtp?: string;
  recipientDropOtp?: string;
  dropPhotoUrl?: string;
  fareInr: number;
}

const DEFAULT_ACTIVE_TRIP: DriverActiveTrip = {
  orderId: 'ORD-882319',
  vertical: 'GROCERY',
  status: 'DRIVER_ASSIGNED',
  pickupCoords: { lat: 12.9716, lng: 77.5946 },
  pickupAddress: 'AllGo Dark Store #4, Indiranagar',
  dropCoords: { lat: 12.9352, lng: 77.6245 },
  dropAddress: 'Flat 402, Green Glen Layout, Bellandur',
  customerName: 'Priya R',
  customerPhone: '+91 98450 11223',
  rideStartPin: '1234',
  merchantHandoverOtp: '4821',
  recipientDropOtp: '5678',
  fareInr: 125,
};

export function loadDriverActiveTrip(): DriverActiveTrip | null {
  return loadFromCache<DriverActiveTrip | null>('allgo_driver_active_trip', DEFAULT_ACTIVE_TRIP);
}

export function saveDriverActiveTrip(trip: DriverActiveTrip | null): void {
  saveToCache('allgo_driver_active_trip', trip);
}

export function canArriveAtPickup(
  driverCoords: GpsCoords,
  trip: DriverActiveTrip,
): { allowed: boolean; distanceMeters: number } {
  const check = checkGeofenceProximity(driverCoords, trip.pickupCoords, 150);
  return { allowed: check.isInside, distanceMeters: check.distanceMeters };
}

export function canArriveAtDrop(
  driverCoords: GpsCoords,
  trip: DriverActiveTrip,
): { allowed: boolean; distanceMeters: number } {
  const check = checkGeofenceProximity(driverCoords, trip.dropCoords, 150);
  return { allowed: check.isInside, distanceMeters: check.distanceMeters };
}

export function verifyPickupGate(
  trip: DriverActiveTrip,
  enteredCode: string,
): { success: boolean; message: string; updatedTrip?: DriverActiveTrip } {
  const cleanCode = enteredCode.trim();

  if (trip.vertical === 'RIDE') {
    if (trip.rideStartPin && trip.rideStartPin !== cleanCode) {
      return { success: false, message: 'Invalid 4-digit Customer Ride Start PIN.' };
    }
  } else {
    // Grocery or Parcel Merchant handover
    if (trip.merchantHandoverOtp && trip.merchantHandoverOtp !== cleanCode) {
      return { success: false, message: 'Invalid Merchant / Sender Handover OTP.' };
    }
  }

  trip.status = 'PICKED_UP';
  saveDriverActiveTrip(trip);
  return {
    success: true,
    message: 'Pickup verified! Trip in transit to customer drop-off.',
    updatedTrip: trip,
  };
}

export function verifyDropPoD(
  trip: DriverActiveTrip,
  enteredOtp: string,
  photoUrl?: string,
): { success: boolean; message: string; updatedTrip?: DriverActiveTrip } {
  if (trip.vertical !== 'RIDE') {
    if (!photoUrl || photoUrl.trim().length === 0) {
      return {
        success: false,
        message: 'Proof of Delivery (PoD) photo is required for parcel/grocery drop-off.',
      };
    }
    if (trip.recipientDropOtp && trip.recipientDropOtp !== enteredOtp.trim()) {
      return { success: false, message: 'Invalid Recipient Drop OTP.' };
    }
  }

  trip.status = 'DELIVERED';
  trip.dropPhotoUrl = photoUrl;
  saveDriverActiveTrip(trip);
  return {
    success: true,
    message: 'Delivery completed! Earnings credited to driver wallet.',
    updatedTrip: trip,
  };
}

export function generateGoogleMapsDeepLink(coords: GpsCoords, label: string): string {
  const encodedLabel = encodeURIComponent(label);
  return `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}&destination_place_id=${encodedLabel}`;
}
