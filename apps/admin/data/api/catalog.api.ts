import type {
  CreateAdminCategoryDto,
  ListCatalogProductsResponse,
  UpdateAdminCategoryDto,
} from '../types';
import { adminFetch } from './base-client';

export class CatalogApi {
  async listCatalogProducts(
    status?: string,
    page = 1,
    limit = 50,
  ): Promise<ListCatalogProductsResponse> {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status && status !== 'ALL') query.append('status', status);

    const data = await adminFetch<any>(`/v1/admin/catalog/products?${query.toString()}`);

    const items = (data.items || []).map((p: any) => ({
      ...p,
      basePriceInr: Number(p.basePriceInr ?? p.base_price_inr ?? 0),
      salePriceInr:
        p.salePriceInr != null
          ? Number(p.salePriceInr)
          : p.sale_price_inr != null
            ? Number(p.sale_price_inr)
            : null,
      categoryName: p.categoryName || p.category_name || 'General',
      businessName: p.businessName || p.business_name || '',
      outletName: p.outletName || p.outlet_name || '',
      isVeg: Boolean(p.isVeg ?? p.is_veg ?? false),
      adminStatus: p.adminStatus || p.admin_status || 'PENDING_REVIEW',
      rejectionReason: p.rejectionReason || p.rejection_reason || undefined,
      dietaryFlags: Array.isArray(p.dietaryFlags)
        ? p.dietaryFlags
        : Array.isArray(p.dietary_flags)
          ? p.dietary_flags
          : [],
      stockQuantity: Number(p.stockQuantity ?? p.stock_quantity ?? 0),
    }));

    return {
      ...data,
      items,
    };
  }

  async moderateProduct(
    id: string,
    adminStatus: 'APPROVED' | 'REJECTED',
    rejectionReason?: string,
  ): Promise<any> {
    return adminFetch<any>(`/v1/admin/catalog/products/${id}/moderate`, {
      method: 'POST',
      body: JSON.stringify({ adminStatus, rejectionReason }),
    });
  }

  async getOutletCatalogInspect(outletId: string): Promise<any> {
    return adminFetch<any>(`/v1/admin/catalog/outlets/${outletId}`);
  }

  async listAdminCategories(verticalType?: string): Promise<any[]> {
    const query = new URLSearchParams();
    if (verticalType) query.append('verticalType', verticalType);
    return adminFetch<any[]>(`/v1/admin/catalog/categories?${query.toString()}`);
  }

  async createAdminCategory(category: CreateAdminCategoryDto): Promise<any> {
    return adminFetch<any>('/v1/admin/catalog/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    });
  }

  async updateAdminCategory(id: string, category: UpdateAdminCategoryDto): Promise<any> {
    return adminFetch<any>(`/v1/admin/catalog/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(category),
    });
  }

  async deleteAdminCategory(id: string): Promise<any> {
    return adminFetch<any>(`/v1/admin/catalog/categories/${id}`, {
      method: 'DELETE',
    });
  }
}

export const catalogApi = new CatalogApi();
