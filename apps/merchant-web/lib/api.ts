import { createApiClient, getCookie } from '@allgo/api-client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const client = createApiClient({
  baseUrl: API_BASE,
  role: 'MERCHANT',
  client: 'web',
  getAuthToken: () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('allgo_merchant_token') || getCookie('allgo_merchant_token');
  },
});

export const merchantApi = {
  // Auth
  sendOtp: (phone: string) => client.post('/v1/auth/otp/send', { phone }),
  verifyOtp: (phone: string, code: string) =>
    client.post<{ accessToken?: string }>('/v1/auth/otp/verify', {
      phone,
      code,
      platform: 'WEB',
    }),
  getMe: () => client.get<any>('/v1/auth/me'),

  // Dashboard & Orders
  getDashboard: () => client.get<any>('/v1/merchants/dashboard'),
  listOrders: (status?: string) => {
    const q = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
    return client.get<any[]>(`/v1/merchants/orders${q}`);
  },
  acceptOrder: (subOrderId: string, prepTimeMinutes = 20) =>
    client.post<any>(`/v1/merchants/orders/${encodeURIComponent(subOrderId)}/accept`, {
      prepTimeMinutes,
    }),
  markPreparing: (subOrderId: string) =>
    client.post<any>(`/v1/merchants/orders/${encodeURIComponent(subOrderId)}/preparing`, {}),
  markReady: (subOrderId: string) =>
    client.post<any>(`/v1/merchants/orders/${encodeURIComponent(subOrderId)}/ready`, {}),
  rejectOrder: (subOrderId: string, reason: string) =>
    client.post<any>(`/v1/merchants/orders/${encodeURIComponent(subOrderId)}/reject`, { reason }),
  updateOutletStatus: (outletId: string, isOpen: boolean) =>
    client.patch<any>(`/v1/merchants/outlets/${encodeURIComponent(outletId)}/status`, { isOpen }),
  proposeSubstitution: (subOrderId: string, payload: any) =>
    client.post<any>(
      `/v1/orders/sub-orders/${encodeURIComponent(subOrderId)}/substitutions`,
      payload,
    ),

  // Catalog & CSV
  listProducts: () => client.get<any[]>('/v1/merchants/products'),
  createProduct: (outletId: string, payload: any) =>
    client.post<any>(`/v1/merchants/outlets/${encodeURIComponent(outletId)}/products`, payload),
  toggleStock: (itemId: string, isInStock: boolean) =>
    client.patch<any>(`/v1/merchants/inventory/${encodeURIComponent(itemId)}`, { isInStock }),
  uploadBulkCsv: (outletId: string, csvContent: string) =>
    client.post<any>(`/v1/merchants/outlets/${encodeURIComponent(outletId)}/catalog/bulk-csv`, {
      csvContent,
    }),

  // Hours & Closures
  getHours: (outletId: string) =>
    client.get<any[]>(`/v1/merchants/outlets/${encodeURIComponent(outletId)}/hours`),
  toggleTemporaryClosure: (outletId: string, isTemporarilyClosed: boolean, reason?: string) =>
    client.post<any>(`/v1/merchants/outlets/${encodeURIComponent(outletId)}/temporary-closure`, {
      isTemporarilyClosed,
      temporaryClosureReason: reason,
    }),

  // Finance
  getEarnings: () => client.get<any>('/v1/merchants/earnings'),
  getPayouts: () => client.get<any[]>('/v1/merchants/payouts'),
};
