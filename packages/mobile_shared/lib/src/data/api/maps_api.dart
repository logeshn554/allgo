import 'dart:convert';
import 'package:http/http.dart' as http;
import 'base_api.dart';

class PlacePredictionModel {
  final String placeId;
  final String description;
  final String mainText;
  final String secondaryText;

  const PlacePredictionModel({
    required this.placeId,
    required this.description,
    required this.mainText,
    required this.secondaryText,
  });

  factory PlacePredictionModel.fromJson(Map<String, dynamic> json) {
    return PlacePredictionModel(
      placeId: json['placeId']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      mainText: json['mainText']?.toString() ?? '',
      secondaryText: json['secondaryText']?.toString() ?? '',
    );
  }
}

class GeocodeLocationModel {
  final String formattedAddress;
  final double latitude;
  final double longitude;
  final String? placeId;

  const GeocodeLocationModel({
    required this.formattedAddress,
    required this.latitude,
    required this.longitude,
    this.placeId,
  });

  factory GeocodeLocationModel.fromJson(Map<String, dynamic> json) {
    final loc = json['location'] as Map<String, dynamic>? ?? {};
    return GeocodeLocationModel(
      formattedAddress: json['formattedAddress']?.toString() ?? '',
      latitude: (loc['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (loc['longitude'] as num?)?.toDouble() ?? 0.0,
      placeId: json['placeId']?.toString(),
    );
  }
}

class RouteEstimateModel {
  final int distanceMeters;
  final int durationSeconds;
  final String? encodedPolyline;
  final String source;

  const RouteEstimateModel({
    required this.distanceMeters,
    required this.durationSeconds,
    this.encodedPolyline,
    required this.source,
  });

  factory RouteEstimateModel.fromJson(Map<String, dynamic> json) {
    return RouteEstimateModel(
      distanceMeters: (json['distanceMeters'] as num?)?.toInt() ?? 0,
      durationSeconds: (json['durationSeconds'] as num?)?.toInt() ?? 0,
      encodedPolyline: json['encodedPolyline']?.toString(),
      source: json['source']?.toString() ?? 'ROUTES_API',
    );
  }
}

class MapsApi {
  final BaseApi base;
  MapsApi(this.base);

  Future<List<PlacePredictionModel>> searchPlaces(
    String input, {
    double? lat,
    double? lng,
  }) async {
    final params = <String>['input=${Uri.encodeComponent(input)}'];
    if (lat != null && lng != null) {
      params.add('lat=$lat');
      params.add('lng=$lng');
    }
    final url = Uri.parse('${base.base.baseUrl}/v1/maps/places?${params.join('&')}');
    final response = await base.httpClient.get(url, headers: base.buildHeaders());
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final list = data as List<dynamic>? ?? [];
      return list.map((item) => PlacePredictionModel.fromJson(item as Map<String, dynamic>)).toList();
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Places search failed');
  }

  Future<GeocodeLocationModel> reverseGeocode(double lat, double lng) async {
    final url = Uri.parse('${base.base.baseUrl}/v1/maps/reverse-geocode?lat=$lat&lng=$lng');
    final response = await base.httpClient.get(url, headers: base.buildHeaders());
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return GeocodeLocationModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Reverse geocoding failed');
  }

  Future<List<GeocodeLocationModel>> geocodeAddress(String address) async {
    final url = Uri.parse('${base.base.baseUrl}/v1/maps/geocode?address=${Uri.encodeComponent(address)}');
    final response = await base.httpClient.get(url, headers: base.buildHeaders());
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final list = data as List<dynamic>? ?? [];
      return list.map((item) => GeocodeLocationModel.fromJson(item as Map<String, dynamic>)).toList();
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Geocoding failed');
  }

  Future<RouteEstimateModel> computeRoute(
    double origLat,
    double origLng,
    double destLat,
    double destLng, {
    String travelMode = 'TWO_WHEELER',
  }) async {
    final url = Uri.parse('${base.base.baseUrl}/v1/maps/route');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(),
      body: jsonEncode({
        'origin': {'latitude': origLat, 'longitude': origLng},
        'destination': {'latitude': destLat, 'longitude': destLng},
        'travelMode': travelMode,
      }),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return RouteEstimateModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Route computation failed');
  }
}
