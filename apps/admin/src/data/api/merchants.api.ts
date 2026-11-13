import { API_BASE, getAdminHeaders } from './base-client';
import { MerchantApplicationSummary, ListMerchantsOptions, ListMerchantsResponse, UpdateMerchantStatusResponse } from '../types';

export class MerchantsApi {
  async listMerchants(options: ListMerchantsOptions = {}): Promise<ListMerchantsResponse> {
    const query = new URLSearchParams({
      page: String(options.page || 1),
      limit: String(options.limit || 20),
    });
    if (options.status) query.append('status', options.status);

    const res = await fetch(`${API_BASE}/v1/admin/merchants?${query.toString()}`, {
      headers: getAdminHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to retrieve merchant applications');
    }
    return data;
  }

  async getMerchant(id: string): Promise<MerchantApplicationSummary> {
    const res = await fetch(`${API_BASE}/v1/admin/merchants/${id}`, {
      headers: getAdminHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Merchant application not found');
    }
    return data;
  }

  async updateMerchantStatus(id: string, status: string, notes?: string): Promise<UpdateMerchantStatusResponse> {
    const res = await fetch(`${API_BASE}/v1/admin/merchants/${id}/status`, {
      method: 'PATCH',
      headers: getAdminHeaders(),
      body: JSON.stringify({ status, notes }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to update merchant status');
    }
    return data;
  }

  async getMerchantDocuments(id: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/v1/admin/merchants/${id}/documents`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to retrieve merchant documents');
    }
    return data;
  }

  async updateMerchantOutletStatus(outletId: string, status: string, reason?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/merchants/outlets/${outletId}/status`, {
      method: 'PATCH',
      headers: getAdminHeaders(),
      body: JSON.stringify({ status, reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to update outlet status');
    }
    return data;
  }
}

export const merchantsApi = new MerchantsApi();
