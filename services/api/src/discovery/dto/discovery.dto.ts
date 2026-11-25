export class SearchQueryDto {
  q!: string;
  verticalType?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  isVeg?: boolean;
  openNow?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'relevance' | 'distance' | 'price_low_high' | 'price_high_low';
  page?: number;
  limit?: number;
}

export class SearchSuggestionsDto {
  q!: string;
  verticalType?: string;
  limit?: number;
}
