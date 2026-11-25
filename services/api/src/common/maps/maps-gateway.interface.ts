export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface RouteEstimate {
  distanceMeters: number;
  durationSeconds: number;
  encodedPolyline?: string;
  source: 'CACHE' | 'ROUTES_API' | 'HAVERSINE_FALLBACK';
}

export interface DistanceMatrixResult {
  origin: GeoPoint;
  destination: GeoPoint;
  distanceMeters: number;
  durationSeconds: number;
  status: 'OK' | 'ZERO_RESULTS' | 'NOT_FOUND';
}

export interface GeocodingResult {
  formattedAddress: string;
  location: GeoPoint;
  placeId?: string;
  types?: string[];
}

export interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface MapsGateway {
  computeRoute(
    origin: GeoPoint,
    destination: GeoPoint,
    travelMode?: 'DRIVE' | 'TWO_WHEELER' | 'WALK',
  ): Promise<RouteEstimate>;

  computeDistanceMatrix(
    origins: GeoPoint[],
    destinations: GeoPoint[],
    travelMode?: 'DRIVE' | 'TWO_WHEELER',
  ): Promise<DistanceMatrixResult[]>;

  geocodeAddress(address: string): Promise<GeocodingResult[]>;

  reverseGeocode(point: GeoPoint): Promise<GeocodingResult | null>;

  searchPlaces(input: string, locationBias?: GeoPoint): Promise<PlacePrediction[]>;
}
