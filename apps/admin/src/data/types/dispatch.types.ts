export interface DispatchStats {
  totalActiveJobs: number;
  pendingAssignment: number;
  assigned: number;
  inTransit: number;
  deliveredToday: number;
  unassignedAlerts: number;
}

export interface DispatchJobFilters {
  status?: string;
  verticalType?: string;
  outletId?: string;
  limit?: number;
  offset?: number;
}

export interface ListDispatchJobsResponse {
  items: any[];
  total: number;
}
