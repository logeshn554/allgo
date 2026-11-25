import { adminFetch } from './base-client';
import { DispatchJobFilters, ListDispatchJobsResponse } from '../types';

export class DispatchApi {
  async getDispatchStats(): Promise<any> {
    return adminFetch<any>('/v1/admin/dispatch/stats');
  }

  async listDispatchJobs(filters: DispatchJobFilters = {}): Promise<ListDispatchJobsResponse> {
    const query = new URLSearchParams();
    if (filters.status) query.append('status', filters.status);
    if (filters.verticalType) query.append('verticalType', filters.verticalType);
    if (filters.outletId) query.append('outletId', filters.outletId);
    if (filters.limit) query.append('limit', String(filters.limit));
    if (filters.offset) query.append('offset', String(filters.offset));

    return adminFetch<ListDispatchJobsResponse>(`/v1/admin/dispatch/jobs?${query.toString()}`);
  }

  async getDispatchJob(jobId: string): Promise<any> {
    return adminFetch<any>(`/v1/admin/dispatch/jobs/${jobId}`);
  }

  async listOnlinePartners(): Promise<any[]> {
    return adminFetch<any[]>('/v1/admin/dispatch/partners/online');
  }

  async listDispatchExceptions(status?: string): Promise<any[]> {
    const query = new URLSearchParams();
    if (status) query.append('status', status);
    return adminFetch<any[]>(`/v1/admin/dispatch/exceptions?${query.toString()}`);
  }

  async manualAssignJob(jobId: string, partnerId: string, reason?: string): Promise<any> {
    return adminFetch<any>(`/v1/admin/dispatch/jobs/${jobId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ partnerId, reason }),
    });
  }

  async cancelDispatchJob(
    jobId: string,
    reasonCode: string,
    reasonDetails?: string,
  ): Promise<any> {
    return adminFetch<any>(`/v1/admin/dispatch/jobs/${jobId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reasonCode, reasonDetails }),
    });
  }

  async triggerDispatch(jobId: string): Promise<any> {
    return adminFetch<any>(`/v1/admin/dispatch/jobs/${jobId}/dispatch`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }
}

export const dispatchApi = new DispatchApi();
