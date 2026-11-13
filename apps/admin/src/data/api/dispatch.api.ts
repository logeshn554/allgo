import { API_BASE, getAdminHeaders } from './base-client';
import { DispatchJobFilters, ListDispatchJobsResponse } from '../types';

export class DispatchApi {
  async getDispatchStats(): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/dispatch/stats`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch dispatch statistics');
    }
    return data;
  }

  async listDispatchJobs(filters: DispatchJobFilters = {}): Promise<ListDispatchJobsResponse> {
    const query = new URLSearchParams();
    if (filters.status) query.append('status', filters.status);
    if (filters.verticalType) query.append('verticalType', filters.verticalType);
    if (filters.outletId) query.append('outletId', filters.outletId);
    if (filters.limit) query.append('limit', String(filters.limit));
    if (filters.offset) query.append('offset', String(filters.offset));

    const res = await fetch(`${API_BASE}/v1/admin/dispatch/jobs?${query.toString()}`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to list dispatch jobs');
    }
    return data;
  }

  async getDispatchJob(jobId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/dispatch/jobs/${jobId}`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch job details');
    }
    return data;
  }

  async listOnlinePartners(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/v1/admin/dispatch/partners/online`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to list online partners');
    }
    return data;
  }

  async listDispatchExceptions(status?: string): Promise<any[]> {
    const query = new URLSearchParams();
    if (status) query.append('status', status);

    const res = await fetch(`${API_BASE}/v1/admin/dispatch/exceptions?${query.toString()}`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to list dispatch exceptions');
    }
    return data;
  }

  async manualAssignJob(jobId: string, partnerId: string, reason?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/dispatch/jobs/${jobId}/assign`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ partnerId, reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to manually assign partner');
    }
    return data;
  }

  async cancelDispatchJob(jobId: string, reasonCode: string, reasonDetails?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/dispatch/jobs/${jobId}/cancel`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ reasonCode, reasonDetails }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to cancel dispatch job');
    }
    return data;
  }

  async triggerDispatch(jobId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/dispatch/jobs/${jobId}/dispatch`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to trigger automated dispatch');
    }
    return data;
  }
}

export const dispatchApi = new DispatchApi();
