// Job: Admin dispatch operations ("God View" map data, manual override, disputes, surge & geofencing).

import { creditWallet } from './walletStorage.ts';

export interface ActiveOrderPin {
  id: string;
  customerName: string;
  status: 'UNASSIGNED' | 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT';
  pickupLat: number;
  pickupLon: number;
  dropoffLat: number;
  dropoffLon: number;
  assignedDriverId?: string;
  stalledMinutes: number;
}

export interface DriverCluster {
  clusterId: string;
  zoneName: string;
  centerLat: number;
  centerLon: number;
  driverCount: number;
  density: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface GeofenceZone {
  id: string;
  name: string;
  polygon: [number, number][]; // [lat, lon] tuples
  activeSupplyDrivers: number;
  activeDemandRequests: number;
  surgeMultiplier: number;
  baseDeliveryFeeCents: number;
}

export interface DisputeAuditRecord {
  disputeId: string;
  orderId: string;
  customerId: string;
  partnerId: string;
  customerClaim: string;
  dropoffLat: number;
  dropoffLon: number;
  driverDropoffLat: number;
  driverDropoffLon: number;
  gpsDistanceMeters: number;
  photoProofUrl?: string;
  refundIssuedCents: number;
  resolutionStatus: 'UNDER_INVESTIGATION' | 'REFUNDED' | 'DISMISSED';
  resolvedAt?: string;
}

export function calculateSupplyDemandSurge(supply: number, demand: number): number {
  if (demand <= 0) return 1.0;
  if (supply <= 0) return 3.0; // Max surge cap 3.0x
  const ratio = demand / supply;
  if (ratio <= 1.0) return 1.0;
  // Dynamic multiplier scale from 1.0x to 3.0x
  const multiplier = 1.0 + (ratio - 1.0) * 0.5;
  return Number(Math.min(3.0, Math.max(1.0, multiplier)).toFixed(2));
}

export function evaluateDisputeGpsProximity(
  dropoffLat: number,
  dropoffLon: number,
  driverLat: number,
  driverLon: number
): { distanceMeters: number; isWithinDeliveryPerimeter: boolean } {
  const dLat = ((driverLat - dropoffLat) * Math.PI) / 180;
  const dLon = ((driverLon - dropoffLon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((dropoffLat * Math.PI) / 180) *
      Math.cos((driverLat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const distanceMeters = Math.round(6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));

  // Delivery perimeter is considered valid within 100 meters
  return {
    distanceMeters,
    isWithinDeliveryPerimeter: distanceMeters <= 100,
  };
}

export function processDisputeRefund(
  orderId: string,
  customerId: string,
  amountCents: number,
  reason: string,
  evidence?: {
    partnerId?: string;
    dropoffLat?: number;
    dropoffLon?: number;
    driverDropoffLat?: number;
    driverDropoffLon?: number;
    photoProofUrl?: string;
  }
): DisputeAuditRecord {
  creditWallet(amountCents, `Dispute Refund: ${reason}`, orderId);

  const dropLat = evidence?.dropoffLat ?? 12.9716;
  const dropLon = evidence?.dropoffLon ?? 77.5946;
  const drvLat = evidence?.driverDropoffLat ?? 12.9780;
  const drvLon = evidence?.driverDropoffLon ?? 77.6020;
  const proximity = evaluateDisputeGpsProximity(dropLat, dropLon, drvLat, drvLon);

  return {
    disputeId: `DSP-${Date.now()}`,
    orderId,
    customerId,
    partnerId: evidence?.partnerId ?? 'partner_default_1',
    customerClaim: reason,
    dropoffLat: dropLat,
    dropoffLon: dropLon,
    driverDropoffLat: drvLat,
    driverDropoffLon: drvLon,
    gpsDistanceMeters: proximity.distanceMeters,
    photoProofUrl: evidence?.photoProofUrl ?? 'storage/proof_mismatch.jpg',
    refundIssuedCents: amountCents,
    resolutionStatus: 'REFUNDED',
    resolvedAt: new Date().toISOString(),
  };
}
