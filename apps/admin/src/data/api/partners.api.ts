import { API_BASE, getAdminHeaders } from './base-client';

export class PartnersApi {
  async listPartners(status?: string): Promise<any[]> {
    const query = new URLSearchParams();
    if (status) query.append('status', status);

    const res = await fetch(`${API_BASE}/v1/admin/partners?${query.toString()}`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to retrieve partner applications');
    }
    return data;
  }

  async updatePartnerStatus(id: string, status: string, reason?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/partners/${id}/status`, {
      method: 'PATCH',
      headers: getAdminHeaders(),
      body: JSON.stringify({ status, reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to update partner status');
    }
    return data;
  }

  async updatePartnerServiceStatus(id: string, serviceType: string, status: string, reason?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/partners/${id}/services/${serviceType}/status`, {
      method: 'PATCH',
      headers: getAdminHeaders(),
      body: JSON.stringify({ status, reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to update partner service status');
    }
    return data;
  }
}

export const partnersApi = new PartnersApi();
