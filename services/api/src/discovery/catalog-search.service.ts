import { Injectable, Logger } from '@nestjs/common';
import { DiscoveryRepository } from './data/discovery.repository.js';
import { SearchQueryDto } from './dto/discovery.dto.js';

@Injectable()
export class CatalogSearchService {
  private readonly logger = new Logger(CatalogSearchService.name);

  constructor(private readonly discoveryRepo: DiscoveryRepository) {}

  async search(dto: SearchQueryDto, customerId?: string): Promise<any> {
    const rawQ = (dto.q || '').trim();
    const vertical = dto.verticalType;
    const lat = dto.latitude ? Number(dto.latitude) : null;
    const lng = dto.longitude ? Number(dto.longitude) : null;
    const radiusKm = dto.radiusKm ? Number(dto.radiusKm) : 15.0;
    const limit = dto.limit ? Math.min(Number(dto.limit), 50) : 20;
    const page = dto.page ? Math.max(Number(dto.page), 1) : 1;
    const offset = (page - 1) * limit;

    if (customerId && rawQ.length > 0) {
      try {
        await this.discoveryRepo.recordSearchHistory(
          customerId,
          rawQ,
          vertical || null,
          JSON.stringify({ isVeg: dto.isVeg, sortBy: dto.sortBy }),
        );
      } catch (err: any) {
        this.logger.warn(`Failed to record search history: ${err.message}`);
      }
    }

    if (!rawQ) {
      return {
        query: '',
        verticalType: vertical || null,
        results: { items: [], outlets: [], categories: [] },
        totalItems: 0,
        totalOutlets: 0,
        page,
        limit,
      };
    }

    const [items, outlets, categories] = await Promise.all([
      this.discoveryRepo.searchItems(dto, rawQ, lat, lng, radiusKm, limit, offset),
      this.discoveryRepo.searchOutlets(rawQ, lat, lng, radiusKm),
      this.discoveryRepo.searchCategories(rawQ, vertical),
    ]);

    return {
      query: rawQ,
      verticalType: vertical || null,
      results: { items, outlets, categories },
      totalItems: items.length,
      totalOutlets: outlets.length,
      page,
      limit,
    };
  }
}
