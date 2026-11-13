import { API_BASE, getAdminHeaders } from './base-client';
import { CreateCouponDto } from '../types';

export class OrdersApi {
  async listAdminOrders(status?: string, limit?: number): Promise<any[]> {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.append('status', status);
    if (limit) params.append('limit', limit.toString());

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/v1/admin/orders${query}`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to list admin orders');
    return data;
  }

  async getAdminOrderDetail(orderId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/orders/${encodeURIComponent(orderId)}`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch order details');
    return data;
  }

  async cancelAdminOrder(orderId: string, reason: string): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/orders/${encodeURIComponent(orderId)}/cancel`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to cancel order');
    return data;
  }

  async listCoupons(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/v1/admin/orders/coupons`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to list coupons');
    return data;
  }

  async createCoupon(dto: CreateCouponDto): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/orders/coupons`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify(dto),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create coupon');
    return data;
  }

  async toggleCoupon(id: string, isActive: boolean): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/orders/coupons/${encodeURIComponent(id)}/toggle`, {
      method: 'PUT',
      headers: getAdminHeaders(),
      body: JSON.stringify({ isActive }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to toggle coupon status');
    return data;
  }
}

export const ordersApi = new OrdersApi();
