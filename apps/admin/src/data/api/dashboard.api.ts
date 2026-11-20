import { API_BASE, getAdminHeaders } from './base-client';
import { DashboardSummary } from '../types';

export class DashboardApi {
  async getDashboardSummary(): Promise<DashboardSummary> {
    const res = await fetch(`${API_BASE}/v1/admin/dashboard/summary`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch dashboard summary');
    }
    return data as DashboardSummary;
  }
}

export const dashboardApi = new DashboardApi();
