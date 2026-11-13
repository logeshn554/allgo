export interface CatalogProduct {
  id: string;
  outletId: string;
  name: string;
  description?: string;
  priceInr: number;
  categoryName?: string;
  imageUrl?: string;
  isAvailable: boolean;
  adminStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  preparationTimeMinutes?: number;
}

export interface ListCatalogProductsResponse {
  items: any[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminCategory {
  id: string;
  name: string;
  parentId?: string;
  displayOrder?: number;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
}

export interface CreateAdminCategoryDto {
  name: string;
  parentId?: string;
  displayOrder?: number;
  description?: string;
  imageUrl?: string;
}

export interface UpdateAdminCategoryDto {
  name?: string;
  parentId?: string;
  displayOrder?: number;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
}
