import { adminFetch } from './base-client';
import { DashboardSummary } from '../types';

export class DashboardApi {
  async getDashboardSummary(): Promise<DashboardSummary> {
    return adminFetch<DashboardSummary>('/v1/admin/dashboard/summary');
  }
}

export const dashboardApi = new DashboardApi();
