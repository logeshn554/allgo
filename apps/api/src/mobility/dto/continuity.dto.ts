export interface PartnerUnifiedEarnings {
  partnerId: string;
  totalEarningsInr: number;
  deliveryEarningsInr: number;
  rideEarningsInr: number;
  hireDriverEarningsInr: number;
  completedJobsCount: number;
  activeMode: string;
}

export interface NextJobProximityMatch {
  jobId: string;
  vertical: string;
  pickupAddress: string;
  distanceFromLastDropKm: number;
  payoutInr: number;
}
