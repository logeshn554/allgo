import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { RedisModule } from '../redis/redis.module.js';
import { DiscoveryRepository } from './data/discovery.repository.js';
import { CatalogSearchService } from './catalog-search.service.js';
import { SearchSuggestionsService } from './search-suggestions.service.js';
import { NearbyOutletsService } from './nearby-outlets.service.js';
import { DiscoveryService } from './discovery.service.js';
import { DiscoveryController } from './discovery.controller.js';

@Module({
  imports: [DatabaseModule, RedisModule],
  controllers: [DiscoveryController],
  providers: [
    DiscoveryRepository,
    CatalogSearchService,
    SearchSuggestionsService,
    NearbyOutletsService,
    DiscoveryService,
  ],
  exports: [
    DiscoveryRepository,
    CatalogSearchService,
    SearchSuggestionsService,
    NearbyOutletsService,
    DiscoveryService,
  ],
})
export class DiscoveryModule {}
