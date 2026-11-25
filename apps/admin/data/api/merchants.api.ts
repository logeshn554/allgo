import type {
  ListMerchantsOptions,
  ListMerchantsResponse,
  MerchantApplicationSummary,
  UpdateMerchantStatusResponse,
} from '../types';
import { adminFetch } from './base-client';

export class MerchantsApi {
  async listMerchants(options: ListMerchantsOptions = {}): Promise<ListMerchantsResponse> {
    const query = new URLSearchParams({
      page: String(options.page || 1),
      limit: String(options.limit || 20),
    });
    if (options.status) query.append('status', options.status);
    return adminFetch<ListMerchantsResponse>(`/v1/admin/merchants?${query.toString()}`);
  }

  async getMerchant(id: string): Promise<MerchantApplicationSummary> {
    return adminFetch<MerchantApplicationSummary>(`/v1/admin/merchants/${id}`);
  }

  async updateMerchantStatus(
    id: string,
    status: string,
    notes?: string,
  ): Promise<UpdateMerchantStatusResponse> {
    return adminFetch<UpdateMerchantStatusResponse>(`/v1/admin/merchants/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
  }

  async getMerchantDocuments(id: string): Promise<any[]> {
    return adminFetch<any[]>(`/v1/admin/merchants/${id}/documents`);
  }

  async updateMerchantOutletStatus(
    outletId: string,
    status: string,
    reason?: string,
  ): Promise<any> {
    return adminFetch<any>(`/v1/admin/merchants/outlets/${outletId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    });
  }
}

export const merchantsApi = new MerchantsApi();
