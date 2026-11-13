import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ZonesService } from './zones.service.js';

@Controller('v1/zones')
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @Get('serviceability')
  async checkServiceability(
    @Query('latitude') latStr: string,
    @Query('longitude') lngStr: string,
    @Query('verticalType') verticalType?: string
  ) {
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (isNaN(lat) || isNaN(lng)) {
      throw new BadRequestException('latitude and longitude query parameters must be valid numbers');
    }
    return this.zonesService.checkServiceability(lat, lng, verticalType || 'FOOD');
  }

  @Get('list')
  async listZones(@Query('cityId') cityId?: string) {
    return this.zonesService.getZones(cityId, true);
  }
}
