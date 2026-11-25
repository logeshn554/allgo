import { adminFetch } from './base-client';

export class PartnersApi {
  async listPartners(status?: string): Promise<any[]> {
    const query = new URLSearchParams();
    if (status) query.append('status', status);
    return adminFetch<any[]>(`/v1/admin/partners?${query.toString()}`);
  }

  async updatePartnerStatus(id: string, status: string, reason?: string): Promise<any> {
    return adminFetch<any>(`/v1/admin/partners/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    });
  }

  async updatePartnerServiceStatus(
    id: string,
    serviceType: string,
    status: string,
    reason?: string,
  ): Promise<any> {
    return adminFetch<any>(`/v1/admin/partners/${id}/services/${serviceType}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    });
  }
}

export const partnersApi = new PartnersApi();
