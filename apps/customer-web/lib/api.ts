import { createApiClient, getCookie } from '@allgo/api-client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const client = createApiClient({
  baseUrl: API_BASE,
  role: 'CUSTOMER',
  client: 'web',
  getAuthToken: () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('allgo_customer_token') || getCookie('allgo_customer_token');
  },
});

export const customerApi = {
  // Auth
  sendOtp: (phone: string) => client.post('/v1/auth/otp/send', { phone }),
  verifyOtp: (phone: string, code: string) =>
    client.post<{ accessToken?: string; user?: any }>('/v1/auth/otp/verify', {
      phone,
      code,
      platform: 'WEB',
    }),
  getMe: () => client.get<any>('/v1/auth/me'),

  // Discovery & Catalog
  listOutlets: (verticalType?: string) => {
    const query =
      verticalType && verticalType !== 'ALL'
        ? `?merchantType=${encodeURIComponent(verticalType)}`
        : '';
    return client.get<any[]>(`/v1/customer/outlets${query}`);
  },
  searchDiscovery: (q: string, verticalType?: string) => {
    const params = new URLSearchParams({ q });
    if (verticalType && verticalType !== 'ALL') params.set('verticalType', verticalType);
    return client.get<any>(`/v1/discovery/search?${params.toString()}`);
  },
  getOutletDetails: (outletId: string) =>
    client.get<any>(`/v1/customer/outlets/${encodeURIComponent(outletId)}`),
  getOutletProducts: (outletId: string) =>
    client.get<any>(`/v1/customer/outlets/${encodeURIComponent(outletId)}/products`),

  // Cart & Checkout
  getCart: () => client.get<any>('/v1/cart'),
  addToCart: (outletId: string, itemId: string, quantity = 1) =>
    client.post<any>('/v1/cart/items', { outletId, itemId, quantity }),
  updateCartItem: (cartItemId: string, quantity: number) =>
    client.patch<any>(`/v1/cart/items/${encodeURIComponent(cartItemId)}`, { quantity }),
  removeCartItem: (cartItemId: string) =>
    client.delete<any>(`/v1/cart/items/${encodeURIComponent(cartItemId)}`),
  getCheckoutEstimate: (outletId: string, items: any[], couponCode?: string) =>
    client.post<any>('/v1/checkout/estimate', { outletId, items, couponCode }),
  placeOrder: (payload: {
    deliveryAddressId: string;
    paymentMethod: string;
    couponCode?: string;
    deliveryInstructions?: string;
    idempotencyKey?: string;
  }) => client.post<any>('/v1/orders/place', payload),

  // Addresses & Orders
  listAddresses: () => client.get<any[]>('/v1/customer/addresses'),
  createAddress: (payload: any) => client.post<any>('/v1/customer/addresses', payload),
  listOrders: () => client.get<any[]>('/v1/orders'),
  getOrderDetail: (id: string) => client.get<any>(`/v1/orders/${encodeURIComponent(id)}`),
  cancelOrder: (id: string, reason: string) =>
    client.post<any>(`/v1/orders/${encodeURIComponent(id)}/cancel`, { reason }),
  getOrderInvoice: (id: string) => client.get<any>(`/v1/orders/${encodeURIComponent(id)}/invoice`),

  // Rides
  estimateRideFare: (payload: {
    pickupLat: number;
    pickupLng: number;
    dropoffLat: number;
    dropoffLng: number;
    stateCode?: string;
  }) => client.post<any[]>('/v1/rides/fare-estimate', { stateCode: 'TN', ...payload }),
  bookRide: (payload: {
    vehicleCategory: string;
    pickupLat: number;
    pickupLng: number;
    pickupAddress: string;
    dropoffLat: number;
    dropoffLng: number;
    dropoffAddress: string;
    stateCode?: string;
  }) => client.post<any>('/v1/rides/book', { stateCode: 'TN', ...payload }),
  listRides: () => client.get<any[]>('/v1/rides'),
  getRide: (rideId: string) => client.get<any>(`/v1/rides/${encodeURIComponent(rideId)}`),
  cancelRide: (rideId: string, reason: string) =>
    client.post<any>(`/v1/rides/${encodeURIComponent(rideId)}/cancel`, { reason }),
};
