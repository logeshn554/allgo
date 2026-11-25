import { adminFetch } from './base-client';
import { ListAdminParcelsParams, ListAdminParcelsResponse } from '../types';

export class ParcelsApi {
  async listAdminParcels(params?: ListAdminParcelsParams): Promise<ListAdminParcelsResponse> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.serviceType) query.append('serviceType', params.serviceType);
    if (params?.search) query.append('search', params.search);
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.offset) query.append('offset', String(params.offset));

    return adminFetch<ListAdminParcelsResponse>(`/v1/admin/parcels?${query.toString()}`);
  }

  async getAdminParcelStats(): Promise<any> {
    return adminFetch<any>('/v1/admin/parcels/stats');
  }

  async getAdminParcel(id: string): Promise<any> {
    return adminFetch<any>(`/v1/admin/parcels/${encodeURIComponent(id)}`);
  }

  async getAdminParcelTracking(id: string): Promise<any> {
    return adminFetch<any>(`/v1/admin/parcels/${encodeURIComponent(id)}/tracking`);
  }

  async reassignAdminParcel(id: string, partnerId: string, reason: string): Promise<any> {
    return adminFetch<any>(`/v1/admin/parcels/${encodeURIComponent(id)}/reassign`, {
      method: 'POST',
      body: JSON.stringify({ partnerId, reason }),
    });
  }

  async cancelAdminParcel(id: string, reason: string): Promise<any> {
    return adminFetch<any>(`/v1/admin/parcels/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async authorizeAdminParcelReturn(
    id: string,
    reason: string,
    notes?: string,
  ): Promise<any> {
    return adminFetch<any>(`/v1/admin/parcels/${encodeURIComponent(id)}/authorize-return`, {
      method: 'POST',
      body: JSON.stringify({ reason, notes }),
    });
  }

  async getAdminParcelRestrictions(): Promise<any[]> {
    return adminFetch<any[]>('/v1/admin/parcels/config/restrictions');
  }

  async updateAdminParcelRestriction(category: string, dto: any): Promise<any> {
    return adminFetch<any>(
      `/v1/admin/parcels/config/restrictions/${encodeURIComponent(category)}`,
      {
        method: 'PUT',
        body: JSON.stringify(dto),
      },
    );
  }

  async getAdminParcelServices(): Promise<any[]> {
    return adminFetch<any[]>('/v1/admin/parcels/config/services');
  }

  async updateAdminParcelService(serviceType: string, dto: any): Promise<any> {
    return adminFetch<any>(
      `/v1/admin/parcels/config/services/${encodeURIComponent(serviceType)}`,
      {
        method: 'PUT',
        body: JSON.stringify(dto),
      },
    );
  }
}

export const parcelsApi = new ParcelsApi();
