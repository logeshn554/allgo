import { API_BASE, getAdminHeaders } from './base-client';
import { ListCatalogProductsResponse, CreateAdminCategoryDto, UpdateAdminCategoryDto } from '../types';

export class CatalogApi {
  async listCatalogProducts(status?: string, page = 1, limit = 50): Promise<ListCatalogProductsResponse> {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status && status !== 'ALL') query.append('status', status);

    const res = await fetch(`${API_BASE}/v1/admin/catalog/products?${query.toString()}`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to retrieve catalog products');
    }
    return data;
  }

  async moderateProduct(id: string, adminStatus: 'APPROVED' | 'REJECTED', rejectionReason?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/catalog/products/${id}/moderate`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ adminStatus, rejectionReason }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to moderate catalog product');
    }
    return data;
  }

  async getOutletCatalogInspect(outletId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/catalog/outlets/${outletId}`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to inspect outlet catalog');
    }
    return data;
  }

  async listAdminCategories(verticalType?: string): Promise<any[]> {
    const query = new URLSearchParams();
    if (verticalType) query.append('verticalType', verticalType);

    const res = await fetch(`${API_BASE}/v1/admin/catalog/categories?${query.toString()}`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to retrieve categories');
    }
    return data;
  }

  async createAdminCategory(category: CreateAdminCategoryDto): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/catalog/categories`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify(category),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to create platform category');
    }
    return data;
  }

  async updateAdminCategory(id: string, category: UpdateAdminCategoryDto): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/catalog/categories/${id}`, {
      method: 'PUT',
      headers: getAdminHeaders(),
      body: JSON.stringify(category),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to update category');
    }
    return data;
  }

  async deleteAdminCategory(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/admin/catalog/categories/${id}`, {
      method: 'DELETE',
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to delete category');
    }
    return data;
  }
}

export const catalogApi = new CatalogApi();
