import { Injectable } from '@nestjs/common';
import { DiscoveryRepository } from './data/discovery.repository.js';

@Injectable()
export class NearbyOutletsService {
  constructor(private readonly discoveryRepo: DiscoveryRepository) {}

  async listOutlets(verticalType = 'FOOD', lat?: number, lng?: number, radiusKm = 15.0): Promise<any[]> {
    return this.discoveryRepo.listOutlets(verticalType, lat, lng, radiusKm);
  }

  async listCategories(verticalType = 'FOOD'): Promise<any[]> {
    return this.discoveryRepo.listCategories(verticalType);
  }

  async getSearchHistory(customerId: string): Promise<any[]> {
    return this.discoveryRepo.getSearchHistory(customerId);
  }

  async clearSearchHistory(customerId: string): Promise<{ success: boolean }> {
    await this.discoveryRepo.clearSearchHistory(customerId);
    return { success: true };
  }
}
