import { BadRequestException, Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { GoogleMapsGateway } from './google-maps.gateway.js';
import { GeoPoint } from './maps-gateway.interface.js';

export class RouteRequestDto {
  origin!: GeoPoint;
  destination!: GeoPoint;
  travelMode?: 'DRIVE' | 'TWO_WHEELER' | 'WALK';
}

@ApiTags('maps')
@Controller('v1/maps')
@UseGuards(JwtAuthGuard)
export class MapsController {
  constructor(private readonly mapsGateway: GoogleMapsGateway) {}

  @Get('places')
  @ApiOperation({ summary: 'Search places via Google Places autocomplete' })
  @ApiResponse({ status: 200, description: 'List of matching place predictions' })
  async searchPlaces(
    @Query('input') input: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    if (!input || input.trim().length === 0) {
      return [];
    }
    let locationBias: GeoPoint | undefined;
    if (lat && lng) {
      const latitude = Number.parseFloat(lat);
      const longitude = Number.parseFloat(lng);
      if (!isNaN(latitude) && !isNaN(longitude)) {
        locationBias = { latitude, longitude };
      }
    }
    return this.mapsGateway.searchPlaces(input.trim(), locationBias);
  }

  @Get('geocode')
  @ApiOperation({ summary: 'Geocode a textual address into GPS coordinates' })
  @ApiResponse({ status: 200, description: 'Geocoding result' })
  async geocode(@Query('address') address: string) {
    if (!address || address.trim().length === 0) {
      throw new BadRequestException('Address parameter is required');
    }
    return this.mapsGateway.geocodeAddress(address.trim());
  }

  @Get('reverse-geocode')
  @ApiOperation({ summary: 'Convert GPS coordinates into a structured formatted address' })
  @ApiResponse({ status: 200, description: 'Reverse geocoding result' })
  async reverseGeocode(@Query('lat') lat: string, @Query('lng') lng: string) {
    const latitude = Number.parseFloat(lat);
    const longitude = Number.parseFloat(lng);
    if (isNaN(latitude) || isNaN(longitude)) {
      throw new BadRequestException('Valid lat and lng query parameters are required');
    }
    const result = await this.mapsGateway.reverseGeocode({ latitude, longitude });
    return (
      result || {
        formattedAddress: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
        location: { latitude, longitude },
      }
    );
  }

  @Post('route')
  @ApiOperation({
    summary: 'Calculate route distance, duration and polyline between two coordinates',
  })
  @ApiResponse({ status: 200, description: 'Route estimation' })
  async computeRoute(@Body() dto: RouteRequestDto) {
    if (!dto.origin || !dto.destination) {
      throw new BadRequestException('Both origin and destination coordinates are required');
    }
    return this.mapsGateway.computeRoute(
      dto.origin,
      dto.destination,
      dto.travelMode || 'TWO_WHEELER',
    );
  }
}
