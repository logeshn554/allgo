import type { CreateCouponDto } from '../types';
import { adminFetch } from './base-client';

export class OrdersApi {
  async listAdminOrders(status?: string, limit?: number): Promise<any[]> {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.append('status', status);
    if (limit) params.append('limit', limit.toString());

    const query = params.toString() ? `?${params.toString()}` : '';
    return adminFetch<any[]>(`/v1/admin/orders${query}`);
  }

  async getAdminOrderDetail(orderId: string): Promise<any> {
    return adminFetch<any>(`/v1/admin/orders/${encodeURIComponent(orderId)}`);
  }

  async cancelAdminOrder(orderId: string, reason: string): Promise<any> {
    return adminFetch<any>(`/v1/admin/orders/${encodeURIComponent(orderId)}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async listCoupons(): Promise<any[]> {
    return adminFetch<any[]>('/v1/admin/orders/coupons');
  }

  async createCoupon(dto: CreateCouponDto): Promise<any> {
    return adminFetch<any>('/v1/admin/orders/coupons', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async toggleCoupon(id: string, isActive: boolean): Promise<any> {
    return adminFetch<any>(`/v1/admin/orders/coupons/${encodeURIComponent(id)}/toggle`, {
      method: 'PUT',
      body: JSON.stringify({ isActive }),
    });
  }
}

export const ordersApi = new OrdersApi();
