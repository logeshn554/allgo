export interface ListAdminParcelsParams {
  status?: string;
  serviceType?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ListAdminParcelsResponse {
  parcels: any[];
  total: number;
}
