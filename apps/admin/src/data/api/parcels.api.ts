import { API_BASE, getAdminHeaders } from './base-client';
import { ListAdminParcelsParams, ListAdminParcelsResponse } from '../types';

export class ParcelsApi {
  async listAdminParcels(params?: ListAdminParcelsParams): Promise<ListAdminParcelsResponse> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.serviceType) query.append('serviceType', params.serviceType);
    if (params?.search) query.append('search', params.search);
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.offset) query.append('offset', String(params.offset));

    const res = await fetch(`${API_BASE}/v1/admin/parcels?${query.toString()}`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to list parcel bookings');
    return data;
  }

  async getAdminParcelStats(): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/parcels/stats`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to get parcel stats');
    return data;
  }

  async getAdminParcel(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/parcels/${encodeURIComponent(id)}`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to get parcel details');
    return data;
  }

  async getAdminParcelTracking(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/parcels/${encodeURIComponent(id)}/tracking`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to get parcel tracking');
    return data;
  }

  async reassignAdminParcel(id: string, partnerId: string, reason: string): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/parcels/${encodeURIComponent(id)}/reassign`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ partnerId, reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to reassign parcel');
    return data;
  }

  async cancelAdminParcel(id: string, reason: string): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/parcels/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to cancel parcel');
    return data;
  }

  async authorizeAdminParcelReturn(id: string, reason: string, notes?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/parcels/${encodeURIComponent(id)}/authorize-return`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ reason, notes }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to authorize return to sender');
    return data;
  }

  async getAdminParcelRestrictions(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/v1/admin/parcels/config/restrictions`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to get parcel restrictions');
    return data;
  }

  async updateAdminParcelRestriction(category: string, dto: any): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/parcels/config/restrictions/${encodeURIComponent(category)}`, {
      method: 'PUT',
      headers: getAdminHeaders(),
      body: JSON.stringify(dto),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update restriction');
    return data;
  }

  async getAdminParcelServices(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/v1/admin/parcels/config/services`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to get parcel services');
    return data;
  }

  async updateAdminParcelService(serviceType: string, dto: any): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/parcels/config/services/${encodeURIComponent(serviceType)}`, {
      method: 'PUT',
      headers: getAdminHeaders(),
      body: JSON.stringify(dto),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update service config');
    return data;
  }
}

export const parcelsApi = new ParcelsApi();
