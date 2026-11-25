import type { MobilityStats } from '../types';
import { adminFetch } from './base-client';

export class MobilityApi {
  async getMobilityStats(): Promise<MobilityStats> {
    return adminFetch<MobilityStats>('/v1/admin/mobility/stats');
  }

  async getMobilityRides(status?: string): Promise<any[]> {
    const endpoint = status
      ? `/v1/admin/mobility/rides?status=${encodeURIComponent(status)}`
      : '/v1/admin/mobility/rides';
    return adminFetch<any[]>(endpoint);
  }

  async getMobilityParcels(status?: string): Promise<any[]> {
    const endpoint = status
      ? `/v1/admin/mobility/parcels?status=${encodeURIComponent(status)}`
      : '/v1/admin/mobility/parcels';
    return adminFetch<any[]>(endpoint);
  }

  async getMobilitySosEvents(status?: string): Promise<any[]> {
    const endpoint = status
      ? `/v1/admin/mobility/sos?status=${encodeURIComponent(status)}`
      : '/v1/admin/mobility/sos';
    return adminFetch<any[]>(endpoint);
  }

  async resolveMobilitySos(
    eventId: string,
    notes?: string,
    status: 'RESOLVED' | 'FALSE_ALARM' = 'RESOLVED',
  ): Promise<any> {
    return adminFetch<any>(`/v1/admin/mobility/sos/${eventId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ notes, status }),
    });
  }

  async getMobilityFeatureFlags(): Promise<any[]> {
    return adminFetch<any[]>('/v1/admin/mobility/feature-flags');
  }

  async updateMobilityFeatureFlags(
    stateCode: string,
    flags: { ridesEnabled?: boolean; hireDriverEnabled?: boolean; bikeTaxiEnabled?: boolean },
  ): Promise<any> {
    return adminFetch<any>(`/v1/admin/mobility/feature-flags/${encodeURIComponent(stateCode)}`, {
      method: 'POST',
      body: JSON.stringify(flags),
    });
  }

  async getMobilityHireDriver(status?: string): Promise<any[]> {
    const endpoint = status
      ? `/v1/admin/mobility/hire-driver?status=${encodeURIComponent(status)}`
      : '/v1/admin/mobility/hire-driver';
    return adminFetch<any[]>(endpoint);
  }

  async getMobilityRideDetail(rideId: string): Promise<any> {
    return adminFetch<any>(`/v1/admin/mobility/rides/${encodeURIComponent(rideId)}`);
  }

  async getMobilityFares(): Promise<any> {
    return adminFetch<any>('/v1/admin/mobility/fares');
  }
}

export const mobilityApi = new MobilityApi();
