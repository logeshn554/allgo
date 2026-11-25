import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service.js';
import { DiscoveryRepository } from './data/discovery.repository.js';
import { SearchSuggestionsDto } from './dto/discovery.dto.js';

@Injectable()
export class SearchSuggestionsService {
  private readonly logger = new Logger(SearchSuggestionsService.name);

  constructor(
    private readonly discoveryRepo: DiscoveryRepository,
    private readonly redis: RedisService,
  ) {}

  async getSuggestions(dto: SearchSuggestionsDto): Promise<any> {
    const rawQ = (dto.q || '').trim();
    if (!rawQ || rawQ.length < 2) {
      return { query: rawQ, suggestions: [] };
    }

    const cacheKey = `discovery:suggestions:${rawQ.toLowerCase()}:${dto.verticalType || 'ALL'}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err: any) {
      // Redis offline/failure fallback
    }

    const [items, outlets, categories] = await Promise.all([
      this.discoveryRepo.getSuggestionItems(rawQ, dto.verticalType),
      this.discoveryRepo.getSuggestionOutlets(rawQ),
      this.discoveryRepo.getSuggestionCategories(rawQ, dto.verticalType),
    ]);

    const suggestions = [...items, ...outlets, ...categories];
    const result = {
      query: rawQ,
      suggestions,
    };

    try {
      await this.redis.setex(cacheKey, 300, JSON.stringify(result));
    } catch (err) {
      // Ignore cache write errors
    }

    return result;
  }
}
