import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { RedisService } from '../redis/redis.service.js';
import { DiscoveryRepository } from './data/discovery.repository.js';
import { CatalogSearchService } from './catalog-search.service.js';
import { SearchSuggestionsService } from './search-suggestions.service.js';
import { NearbyOutletsService } from './nearby-outlets.service.js';
import { SearchQueryDto, SearchSuggestionsDto } from './dto/discovery.dto.js';

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);
  private readonly searchService: CatalogSearchService;
  private readonly suggestionsService: SearchSuggestionsService;
  private readonly nearbyService: NearbyOutletsService;

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    searchService?: CatalogSearchService,
    suggestionsService?: SearchSuggestionsService,
    nearbyService?: NearbyOutletsService,
  ) {
    if (searchService && suggestionsService && nearbyService) {
      this.searchService = searchService;
      this.suggestionsService = suggestionsService;
      this.nearbyService = nearbyService;
    } else {
      const repo = new DiscoveryRepository(db);
      this.searchService = searchService || new CatalogSearchService(repo);
      this.suggestionsService = suggestionsService || new SearchSuggestionsService(repo, redis);
      this.nearbyService = nearbyService || new NearbyOutletsService(repo);
    }
  }

  async search(dto: SearchQueryDto, customerId?: string): Promise<any> {
    return this.searchService.search(dto, customerId);
  }

  async getSuggestions(dto: SearchSuggestionsDto): Promise<any> {
    return this.suggestionsService.getSuggestions(dto);
  }

  async getSearchHistory(customerId: string): Promise<any[]> {
    return this.nearbyService.getSearchHistory(customerId);
  }

  async clearSearchHistory(customerId: string): Promise<any> {
    return this.nearbyService.clearSearchHistory(customerId);
  }

  async listOutlets(verticalType = 'FOOD', lat?: number, lng?: number, radiusKm = 15.0): Promise<any[]> {
    return this.nearbyService.listOutlets(verticalType, lat, lng, radiusKm);
  }

  async listCategories(verticalType = 'FOOD'): Promise<any[]> {
    return this.nearbyService.listCategories(verticalType);
  }

  async recordStoreView(customerId: string, outletId: string): Promise<void> {
    return this.nearbyService.recordStoreView(customerId, outletId);
  }

  async getRecentlyViewedStores(customerId: string): Promise<any[]> {
    return this.nearbyService.getRecentlyViewedStores(customerId);
  }

  async toggleFavoriteStore(customerId: string, outletId: string): Promise<{ isFavorite: boolean }> {
    return this.nearbyService.toggleFavoriteStore(customerId, outletId);
  }

  async getFavoriteStores(customerId: string): Promise<any[]> {
    return this.nearbyService.getFavoriteStores(customerId);
  }
}
