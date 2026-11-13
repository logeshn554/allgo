import { API_BASE, getAdminHeaders } from './base-client';
import { MobilityStats } from '../types';

export class MobilityApi {
  async getMobilityStats(): Promise<MobilityStats> {
    const res = await fetch(`${API_BASE}/v1/admin/mobility/stats`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch mobility stats');
    return data;
  }

  async getMobilityRides(status?: string): Promise<any[]> {
    const url = status
      ? `${API_BASE}/v1/admin/mobility/rides?status=${encodeURIComponent(status)}`
      : `${API_BASE}/v1/admin/mobility/rides`;
    const res = await fetch(url, { headers: getAdminHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch rides');
    return data;
  }

  async getMobilityParcels(status?: string): Promise<any[]> {
    const url = status
      ? `${API_BASE}/v1/admin/mobility/parcels?status=${encodeURIComponent(status)}`
      : `${API_BASE}/v1/admin/mobility/parcels`;
    const res = await fetch(url, { headers: getAdminHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch parcels');
    return data;
  }

  async getMobilitySosEvents(status?: string): Promise<any[]> {
    const url = status
      ? `${API_BASE}/v1/admin/mobility/sos?status=${encodeURIComponent(status)}`
      : `${API_BASE}/v1/admin/mobility/sos`;
    const res = await fetch(url, { headers: getAdminHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch SOS events');
    return data;
  }

  async resolveMobilitySos(
    eventId: string,
    notes?: string,
    status: 'RESOLVED' | 'FALSE_ALARM' = 'RESOLVED'
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/mobility/sos/${eventId}/resolve`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ notes, status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to resolve SOS event');
    return data;
  }

  async getMobilityFeatureFlags(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/v1/admin/mobility/feature-flags`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch feature flags');
    return data;
  }

  async updateMobilityFeatureFlags(
    stateCode: string,
    flags: { ridesEnabled?: boolean; hireDriverEnabled?: boolean; bikeTaxiEnabled?: boolean }
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/mobility/feature-flags/${encodeURIComponent(stateCode)}`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify(flags),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update feature flags');
    return data;
  }

  async getMobilityHireDriver(status?: string): Promise<any[]> {
    const url = status
      ? `${API_BASE}/v1/admin/mobility/hire-driver?status=${encodeURIComponent(status)}`
      : `${API_BASE}/v1/admin/mobility/hire-driver`;
    const res = await fetch(url, { headers: getAdminHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch hire driver bookings');
    return data;
  }

  async getMobilityRideDetail(rideId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/mobility/rides/${encodeURIComponent(rideId)}`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch ride detail');
    return data;
  }

  async getMobilityFares(): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/mobility/fares`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch mobility fares');
    return data;
  }
}

export const mobilityApi = new MobilityApi();
