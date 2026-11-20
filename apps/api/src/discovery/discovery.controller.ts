import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { DiscoveryService } from './discovery.service.js';
import { SearchQueryDto, SearchSuggestionsDto } from './dto/discovery.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';

@Controller('v1/discovery')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get('search')
  async search(@Request() req: any, @Query() query: any) {
    const dto: SearchQueryDto = {
      q: query.q || '',
      verticalType: query.verticalType,
      latitude: query.latitude ? parseFloat(query.latitude) : undefined,
      longitude: query.longitude ? parseFloat(query.longitude) : undefined,
      radiusKm: query.radiusKm ? parseFloat(query.radiusKm) : undefined,
      isVeg: query.isVeg === 'true' || query.isVeg === true,
      openNow: query.openNow === 'true' || query.openNow === true,
      minPrice: query.minPrice ? parseFloat(query.minPrice) : undefined,
      maxPrice: query.maxPrice ? parseFloat(query.maxPrice) : undefined,
      sortBy: query.sortBy,
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 20,
    };

    // Extract customer ID if Authorization header was sent
    let customerId: string | undefined;
    if (req.headers?.authorization?.startsWith('Bearer ')) {
      try {
        const token = req.headers.authorization.substring(7);
        const payload = JSON.parse(
          Buffer.from(token.split('.')[1], 'base64').toString('utf8')
        );
        customerId = payload.userId || payload.id;
      } catch (err) {
        // Ignore unverified token for anonymous search
      }
    }

    return this.discoveryService.search(dto, customerId);
  }

  @Get('suggestions')
  async getSuggestions(@Query() query: any) {
    const dto: SearchSuggestionsDto = {
      q: query.q || '',
      verticalType: query.verticalType,
      limit: query.limit ? parseInt(query.limit, 10) : 10,
    };
    return this.discoveryService.getSuggestions(dto);
  }

  @Get('outlets')
  async listOutlets(
    @Query('verticalType') verticalType?: string,
    @Query('latitude') latStr?: string,
    @Query('longitude') lngStr?: string,
    @Query('radiusKm') radiusKmStr?: string
  ) {
    const lat = latStr ? parseFloat(latStr) : undefined;
    const lng = lngStr ? parseFloat(lngStr) : undefined;
    const radiusKm = radiusKmStr ? parseFloat(radiusKmStr) : 15.0;
    return this.discoveryService.listOutlets(verticalType || 'FOOD', lat, lng, radiusKm);
  }

  @Get('categories')
  async listCategories(@Query('verticalType') verticalType?: string) {
    return this.discoveryService.listCategories(verticalType || 'FOOD');
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getSearchHistory(@Request() req: any) {
    const customerId = req.user?.userId || req.user?.id;
    return this.discoveryService.getSearchHistory(customerId);
  }

  @Delete('history')
  @UseGuards(JwtAuthGuard)
  async clearSearchHistory(@Request() req: any) {
    const customerId = req.user?.userId || req.user?.id;
    return this.discoveryService.clearSearchHistory(customerId);
  }

  @Get('favorites')
  @UseGuards(JwtAuthGuard)
  async getFavoriteStores(@Request() req: any) {
    const customerId = req.user?.userId || req.user?.id;
    return this.discoveryService.getFavoriteStores(customerId);
  }

  @Post('favorites/:outletId')
  @UseGuards(JwtAuthGuard)
  async toggleFavoriteStore(@Request() req: any, @Param('outletId') outletId: string) {
    const customerId = req.user?.userId || req.user?.id;
    return this.discoveryService.toggleFavoriteStore(customerId, outletId);
  }

  @Get('recently-viewed')
  @UseGuards(JwtAuthGuard)
  async getRecentlyViewedStores(@Request() req: any) {
    const customerId = req.user?.userId || req.user?.id;
    return this.discoveryService.getRecentlyViewedStores(customerId);
  }

  @Post('recently-viewed/:outletId')
  @UseGuards(JwtAuthGuard)
  async recordStoreView(@Request() req: any, @Param('outletId') outletId: string) {
    const customerId = req.user?.userId || req.user?.id;
    await this.discoveryService.recordStoreView(customerId, outletId);
    return { success: true };
  }
}
