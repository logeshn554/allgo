export interface DashboardSummary {
  totalUsers: number;
  newUsersToday: number;
  activeCouriersAndDrivers: number;
  onlinePartners: number;
  liveMerchantOutlets: number;
  activeZonesCount: number;
  todayOrdersCount: number;
  todayGmvInr: number;
  infrastructure: {
    postgres: {
      status: 'up' | 'down';
      latencyMs: number;
      details?: string;
    };
    redis: {
      status: 'up' | 'down';
      latencyMs: number;
      details?: string;
    };
    apiGateway: {
      status: 'up' | 'down';
      uptimeSeconds: number;
      environment: string;
    };
  };
}
