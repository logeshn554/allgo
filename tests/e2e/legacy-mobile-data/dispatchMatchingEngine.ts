// Job: Driver proximity matching, 15-30s acceptance timer, and multi-order route batching.

export interface DispatchOffer {
  id: string;
  orderId: string;
  partnerId: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupLat: number;
  pickupLon: number;
  dropoffLat: number;
  dropoffLon: number;
  courierEarningsCents: number;
  distanceKm: number;
  expiresAtMs: number;
  acceptanceDurationSeconds: number; // 15-30s
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REJECTED';
}

export interface BatchedRouteJob {
  batchId: string;
  orderIds: string[];
  totalEarningsCents: number;
  totalDistanceKm: number;
  waypoints: {
    type: 'PICKUP' | 'DROPOFF';
    orderId: string;
    address: string;
    lat: number;
    lon: number;
  }[];
}

export function createDispatchOffer(
  orderId: string,
  partnerId: string,
  pickup: { address: string; lat: number; lon: number },
  dropoff: { address: string; lat: number; lon: number },
  earningsCents: number,
  countdownSeconds = 25, // 15-30s countdown
): DispatchOffer {
  const clampedSeconds = Math.min(30, Math.max(15, countdownSeconds));
  const rawDistKm = haversineMeters(pickup.lat, pickup.lon, dropoff.lat, dropoff.lon) / 1000;
  const distanceKm = Number(Math.max(0.5, rawDistKm).toFixed(1));

  return {
    id: `off_${Date.now()}`,
    orderId,
    partnerId,
    pickupAddress: pickup.address,
    dropoffAddress: dropoff.address,
    pickupLat: pickup.lat,
    pickupLon: pickup.lon,
    dropoffLat: dropoff.lat,
    dropoffLon: dropoff.lon,
    courierEarningsCents: earningsCents,
    distanceKm,
    acceptanceDurationSeconds: clampedSeconds,
    expiresAtMs: Date.now() + clampedSeconds * 1000,
    status: 'PENDING',
  };
}

export function evaluateBatchingFeasibility(
  primaryOrder: {
    orderId: string;
    pickupLat: number;
    pickupLon: number;
    dropoffLat: number;
    dropoffLon: number;
  },
  candidateOrder: {
    orderId: string;
    pickupLat: number;
    pickupLon: number;
    dropoffLat: number;
    dropoffLon: number;
  },
  maxProximityThresholdMeters = 1500,
): { canBatch: boolean; reason: string; combinedBatch?: BatchedRouteJob } {
  // Compute distance between pickups and dropoffs
  const pickupDist = haversineMeters(
    primaryOrder.pickupLat,
    primaryOrder.pickupLon,
    candidateOrder.pickupLat,
    candidateOrder.pickupLon,
  );
  const dropoffDist = haversineMeters(
    primaryOrder.dropoffLat,
    primaryOrder.dropoffLon,
    candidateOrder.dropoffLat,
    candidateOrder.dropoffLon,
  );

  if (
    pickupDist <= maxProximityThresholdMeters &&
    dropoffDist <= maxProximityThresholdMeters * 1.5
  ) {
    const leg2 = haversineMeters(
      candidateOrder.pickupLat,
      candidateOrder.pickupLon,
      primaryOrder.dropoffLat,
      primaryOrder.dropoffLon,
    );
    const totalMeters = pickupDist + leg2 + dropoffDist;
    const totalDistanceKm = Number((totalMeters / 1000).toFixed(1));
    // Dynamic batch incentive: base fare (₹80) + dynamic corridor distance compensation + batch bonus
    const totalEarningsCents = 8000 + Math.round(totalDistanceKm * 1500) + 3000;

    const combined: BatchedRouteJob = {
      batchId: `batch_${Date.now()}`,
      orderIds: [primaryOrder.orderId, candidateOrder.orderId],
      totalEarningsCents,
      totalDistanceKm,
      waypoints: [
        {
          type: 'PICKUP',
          orderId: primaryOrder.orderId,
          address: 'Outlet A',
          lat: primaryOrder.pickupLat,
          lon: primaryOrder.pickupLon,
        },
        {
          type: 'PICKUP',
          orderId: candidateOrder.orderId,
          address: 'Outlet B (Adjacent)',
          lat: candidateOrder.pickupLat,
          lon: candidateOrder.pickupLon,
        },
        {
          type: 'DROPOFF',
          orderId: primaryOrder.orderId,
          address: 'Dropoff A',
          lat: primaryOrder.dropoffLat,
          lon: primaryOrder.dropoffLon,
        },
        {
          type: 'DROPOFF',
          orderId: candidateOrder.orderId,
          address: 'Dropoff B (En Route)',
          lat: candidateOrder.dropoffLat,
          lon: candidateOrder.dropoffLon,
        },
      ],
    };
    return {
      canBatch: true,
      reason: 'Pickups and dropoffs within corridor tolerance',
      combinedBatch: combined,
    };
  }

  return {
    canBatch: false,
    reason: `Pickups (${pickupDist}m) or dropoffs (${dropoffDist}m) exceed batching corridor`,
  };
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return Math.round(6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
