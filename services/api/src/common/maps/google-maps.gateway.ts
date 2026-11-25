import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../config/config.service.js';
import { RedisService } from '../../redis/redis.service.js';
import {
  DistanceMatrixResult,
  GeoPoint,
  GeocodingResult,
  MapsGateway,
  PlacePrediction,
  RouteEstimate,
} from './maps-gateway.interface.js';
import { buildPointKey, calculateHaversineMeters } from './maps.utils.js';

const ROUTE_CACHE_TTL_SECONDS = 1800; // 30 minutes
const MATRIX_CACHE_TTL_SECONDS = 900; // 15 minutes
const GEOCODE_CACHE_TTL_SECONDS = 86400; // 24 hours

@Injectable()
export class GoogleMapsGateway implements MapsGateway {
  private readonly logger = new Logger(GoogleMapsGateway.name);
  private readonly apiKey: string;

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {
    this.apiKey = this.config.googleMapsApiKey || '';
    const isProdOrStaging =
      process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
    if (!this.apiKey && isProdOrStaging) {
      throw new Error(
        'FATAL: GOOGLE_MAPS_SERVER_API_KEY (or GOOGLE_MAPS_API_KEY) is missing. Failing fast in production/staging.',
      );
    }
  }

  async computeRoute(
    origin: GeoPoint,
    destination: GeoPoint,
    travelMode: 'DRIVE' | 'TWO_WHEELER' | 'WALK' = 'TWO_WHEELER',
  ): Promise<RouteEstimate> {
    const origKey = buildPointKey(origin);
    const destKey = buildPointKey(destination);
    const cacheKey = `maps:route:${travelMode}:${origKey}:${destKey}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        return { ...parsed, source: 'CACHE' };
      }
    } catch {}

    if (this.apiKey && this.apiKey !== 'local_test_google_maps_server_api_key') {
      try {
        const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': this.apiKey,
            'X-Goog-FieldMask':
              'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
          },
          body: JSON.stringify({
            origin: {
              location: { latLng: { latitude: origin.latitude, longitude: origin.longitude } },
            },
            destination: {
              location: {
                latLng: { latitude: destination.latitude, longitude: destination.longitude },
              },
            },
            travelMode:
              travelMode === 'TWO_WHEELER'
                ? 'TWO_WHEELER'
                : travelMode === 'WALK'
                  ? 'WALK'
                  : 'DRIVE',
            routingPreference: 'TRAFFIC_AWARE',
          }),
        });

        if (res.ok) {
          const data = (await res.json()) as any;
          if (data.routes && data.routes.length > 0) {
            const r = data.routes[0];
            const durationSec = Number.parseInt(r.duration?.replace('s', '') || '0', 10);
            const estimate: RouteEstimate = {
              distanceMeters: Number(r.distanceMeters) || 0,
              durationSeconds: durationSec,
              encodedPolyline: r.polyline?.encodedPolyline,
              source: 'ROUTES_API',
            };
            await this.redis.set(cacheKey, JSON.stringify(estimate), 'EX', ROUTE_CACHE_TTL_SECONDS);
            return estimate;
          }
        }
      } catch (err: any) {
        const isProdOrStaging =
          process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
        if (isProdOrStaging) {
          throw new Error(`Google Routes API call failed: ${err.message}`);
        }
        this.logger.warn(`Google Routes API call failed: ${err.message}. Using fallback.`);
      }
    } else {
      const isProdOrStaging =
        process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
      if (isProdOrStaging) {
        throw new Error(
          'Google Routes API request failed: Missing or invalid API key in production/staging.',
        );
      }
    }

    const haversineMeters = calculateHaversineMeters(origin, destination);
    const speedKmh = travelMode === 'WALK' ? 4.5 : 25.0;
    const durationSeconds = Math.round((haversineMeters / ((speedKmh * 1000) / 3600)) * 1.3);

    const fallback: RouteEstimate = {
      distanceMeters: Math.round(haversineMeters * 1.25),
      durationSeconds: Math.max(durationSeconds, 60),
      source: 'HAVERSINE_FALLBACK',
    };

    try {
      await this.redis.set(cacheKey, JSON.stringify(fallback), 'EX', ROUTE_CACHE_TTL_SECONDS);
    } catch {}

    return fallback;
  }

  async computeDistanceMatrix(
    origins: GeoPoint[],
    destinations: GeoPoint[],
    travelMode: 'DRIVE' | 'TWO_WHEELER' = 'TWO_WHEELER',
  ): Promise<DistanceMatrixResult[]> {
    const results: DistanceMatrixResult[] = [];
    for (const origin of origins) {
      for (const dest of destinations) {
        const cacheKey = `maps:matrix:${travelMode}:${buildPointKey(origin)}:${buildPointKey(dest)}`;
        let cachedVal: DistanceMatrixResult | null = null;
        try {
          const raw = await this.redis.get(cacheKey);
          if (raw) cachedVal = JSON.parse(raw);
        } catch {}

        if (cachedVal) {
          results.push(cachedVal);
          continue;
        }

        const route = await this.computeRoute(origin, dest, travelMode);
        const matrixItem: DistanceMatrixResult = {
          origin,
          destination: dest,
          distanceMeters: route.distanceMeters,
          durationSeconds: route.durationSeconds,
          status: 'OK',
        };
        try {
          await this.redis.set(
            cacheKey,
            JSON.stringify(matrixItem),
            'EX',
            MATRIX_CACHE_TTL_SECONDS,
          );
        } catch {}
        results.push(matrixItem);
      }
    }
    return results;
  }

  async geocodeAddress(address: string): Promise<GeocodingResult[]> {
    const cacheKey = `maps:geocode:${address.toLowerCase().trim()}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {}

    if (this.apiKey && this.apiKey !== 'local_test_google_maps_server_api_key') {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = (await res.json()) as any;
          if (data.results && data.results.length > 0) {
            const list: GeocodingResult[] = data.results.map((r: any) => ({
              formattedAddress: r.formatted_address,
              location: { latitude: r.geometry.location.lat, longitude: r.geometry.location.lng },
              placeId: r.place_id,
              types: r.types,
            }));
            await this.redis.set(cacheKey, JSON.stringify(list), 'EX', GEOCODE_CACHE_TTL_SECONDS);
            return list;
          }
        }
      } catch (err: any) {
        const isProdOrStaging =
          process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
        if (isProdOrStaging) {
          throw new Error(`Google Geocoding API failed: ${err.message}`);
        }
        this.logger.warn(`Google Geocoding API failed: ${err.message}`);
      }
    } else {
      const isProdOrStaging =
        process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
      if (isProdOrStaging) {
        throw new Error(
          'Google Geocoding API request failed: Missing or invalid API key in production/staging.',
        );
      }
    }
    return [{ formattedAddress: address, location: { latitude: 13.0827, longitude: 80.2707 } }];
  }

  async reverseGeocode(point: GeoPoint): Promise<GeocodingResult | null> {
    const cacheKey = `maps:revgeocode:${buildPointKey(point)}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {}

    if (this.apiKey && this.apiKey !== 'local_test_google_maps_server_api_key') {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${point.latitude},${point.longitude}&key=${this.apiKey}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = (await res.json()) as any;
          if (data.results && data.results.length > 0) {
            const r = data.results[0];
            const item: GeocodingResult = {
              formattedAddress: r.formatted_address,
              location: point,
              placeId: r.place_id,
              types: r.types,
            };
            await this.redis.set(cacheKey, JSON.stringify(item), 'EX', GEOCODE_CACHE_TTL_SECONDS);
            return item;
          }
        }
      } catch (err: any) {
        const isProdOrStaging =
          process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
        if (isProdOrStaging) {
          throw new Error(`Google Reverse Geocoding failed: ${err.message}`);
        }
        this.logger.warn(`Google Reverse Geocoding failed: ${err.message}`);
      }
    } else {
      const isProdOrStaging =
        process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
      if (isProdOrStaging) {
        throw new Error(
          'Google Reverse Geocoding request failed: Missing or invalid API key in production/staging.',
        );
      }
    }
    return {
      formattedAddress: `${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}, Chennai, Tamil Nadu`,
      location: point,
    };
  }

  async searchPlaces(input: string, locationBias?: GeoPoint): Promise<PlacePrediction[]> {
    const cacheKey = `maps:places:${input.toLowerCase().trim()}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {}

    if (this.apiKey && this.apiKey !== 'local_test_google_maps_server_api_key') {
      try {
        let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${this.apiKey}`;
        if (locationBias) {
          url += `&location=${locationBias.latitude},${locationBias.longitude}&radius=50000`;
        }
        const res = await fetch(url);
        if (res.ok) {
          const data = (await res.json()) as any;
          if (data.predictions) {
            const list: PlacePrediction[] = data.predictions.map((p: any) => ({
              placeId: p.place_id,
              description: p.description,
              mainText: p.structured_formatting?.main_text || p.description,
              secondaryText: p.structured_formatting?.secondary_text || '',
            }));
            await this.redis.set(cacheKey, JSON.stringify(list), 'EX', 1800);
            return list;
          }
        }
      } catch (err: any) {
        const isProdOrStaging =
          process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
        if (isProdOrStaging) {
          throw new Error(`Google Places API failed: ${err.message}`);
        }
        this.logger.warn(`Google Places API failed: ${err.message}`);
      }
    } else {
      const isProdOrStaging =
        process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
      if (isProdOrStaging) {
        throw new Error(
          'Google Places API request failed: Missing or invalid API key in production/staging.',
        );
      }
    }
    return [
      {
        placeId: 'plc_mock_' + Buffer.from(input).toString('hex').substring(0, 8),
        description: `${input}, Chennai, Tamil Nadu`,
        mainText: input,
        secondaryText: 'Chennai, Tamil Nadu, India',
      },
    ];
  }
}
