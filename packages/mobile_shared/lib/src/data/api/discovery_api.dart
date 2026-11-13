import 'dart:convert';
import 'package:http/http.dart' as http;
import 'base_api.dart';
import '../../models/discovery.dart';
import '../../models/product_item.dart';
import '../../models/operating_hours.dart';

class DiscoveryApi {
  final BaseApi base;
  DiscoveryApi(this.base);

  Future<List<dynamic>> getCustomerOutlets({
    String? cityId,
    String? zoneId,
    String? merchantType,
  }) async {
    final params = <String>[];
    if (cityId != null) params.add('cityId=$cityId');
    if (zoneId != null) params.add('zoneId=$zoneId');
    if (merchantType != null) params.add('merchantType=$merchantType');

    final uri = '${base.base.baseUrl}/v1/customer/outlets${params.isNotEmpty ? '?${params.join('&')}' : ''}';
    final response = await base.httpClient.get(
      Uri.parse(uri),
      headers: base.buildHeaders(requiresAuth: false),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return res as List<dynamic>? ?? [];
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to fetch customer outlets');
  }

  Future<Map<String, dynamic>> getCustomerOutletDetails(String outletId) async {
    final url = Uri.parse('${base.base.baseUrl}/v1/customer/outlets/$outletId');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(requiresAuth: false),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return res as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to get outlet details');
  }

  Future<OutletOpenStatusModel> getCustomerOutletStatus(String outletId) async {
    final url = Uri.parse('${base.base.baseUrl}/v1/customer/outlets/$outletId/status');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(requiresAuth: false),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return OutletOpenStatusModel.fromJson(res as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to get outlet status');
  }

  Future<List<dynamic>> getCustomerOutletCategories(String outletId) async {
    final url = Uri.parse('${base.base.baseUrl}/v1/customer/outlets/$outletId/categories');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(requiresAuth: false),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return res as List<dynamic>? ?? [];
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to get categories');
  }

  Future<Map<String, dynamic>> getCustomerOutletProducts(
    String outletId, {
    String? categoryId,
    bool? isVeg,
    String? search,
    int? page,
    int? limit,
  }) async {
    final params = <String>[];
    if (categoryId != null) params.add('categoryId=$categoryId');
    if (isVeg != null) params.add('isVeg=$isVeg');
    if (search != null && search.isNotEmpty) params.add('search=${Uri.encodeComponent(search)}');
    if (page != null) params.add('page=$page');
    if (limit != null) params.add('limit=$limit');

    final uri = '${base.base.baseUrl}/v1/customer/outlets/$outletId/products${params.isNotEmpty ? '?${params.join('&')}' : ''}';
    final response = await base.httpClient.get(
      Uri.parse(uri),
      headers: base.buildHeaders(requiresAuth: false),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return res as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to get outlet products');
  }

  Future<ProductItem> getCustomerProductDetails(String productId, {String? outletId}) async {
    final uri = '${base.base.baseUrl}/v1/customer/products/$productId${outletId != null ? '?outletId=$outletId' : ''}';
    final response = await base.httpClient.get(
      Uri.parse(uri),
      headers: base.buildHeaders(requiresAuth: false),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return ProductItem.fromJson(res as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to get product details');
  }

  Future<DiscoverySearchResult> searchDiscovery({
    required String query,
    String? verticalType,
    double? latitude,
    double? longitude,
    double? radiusKm,
    bool? isVeg,
    String? sortBy,
    int page = 1,
    int limit = 20,
  }) async {
    final token = await base.tokenStorage.getAccessToken();
    final queryParams = <String, String>{
      'q': query,
      if (verticalType != null) 'verticalType': verticalType,
      if (latitude != null) 'latitude': latitude.toString(),
      if (longitude != null) 'longitude': longitude.toString(),
      if (radiusKm != null) 'radiusKm': radiusKm.toString(),
      if (isVeg != null) 'isVeg': isVeg.toString(),
      if (sortBy != null) 'sortBy': sortBy,
      'page': page.toString(),
      'limit': limit.toString(),
    };

    final uri = Uri.parse('${base.base.baseUrl}/v1/discovery/search').replace(queryParameters: queryParams);
    final response = await base.httpClient.get(
      uri,
      headers: base.buildHeaders(token: token, requiresAuth: token != null),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return DiscoverySearchResult.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Search failed');
  }

  Future<List<SearchSuggestion>> getSearchSuggestions(String query, {String? verticalType}) async {
    final queryParams = <String, String>{
      'q': query,
      if (verticalType != null) 'verticalType': verticalType,
    };
    final uri = Uri.parse('${base.base.baseUrl}/v1/discovery/suggestions').replace(queryParameters: queryParams);
    final response = await base.httpClient.get(
      uri,
      headers: base.buildHeaders(requiresAuth: false),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final list = data['suggestions'] as List<dynamic>? ?? [];
      return list.map((e) => SearchSuggestion.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to get suggestions');
  }

  Future<ServiceabilityResult> checkServiceability({
    required double latitude,
    required double longitude,
    String? verticalType,
  }) async {
    final queryParams = <String, String>{
      'latitude': latitude.toString(),
      'longitude': longitude.toString(),
      if (verticalType != null) 'verticalType': verticalType,
    };
    final uri = Uri.parse('${base.base.baseUrl}/v1/zones/serviceability').replace(queryParameters: queryParams);
    final response = await base.httpClient.get(
      uri,
      headers: base.buildHeaders(requiresAuth: false),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return ServiceabilityResult.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to check serviceability');
  }

  Future<List<DiscoveryOutlet>> listServiceableOutlets({
    String? verticalType,
    double? latitude,
    double? longitude,
    double? radiusKm,
  }) async {
    final queryParams = <String, String>{
      if (verticalType != null) 'verticalType': verticalType,
      if (latitude != null) 'latitude': latitude.toString(),
      if (longitude != null) 'longitude': longitude.toString(),
      if (radiusKm != null) 'radiusKm': radiusKm.toString(),
    };
    final uri = Uri.parse('${base.base.baseUrl}/v1/discovery/outlets').replace(queryParameters: queryParams);
    final response = await base.httpClient.get(
      uri,
      headers: base.buildHeaders(requiresAuth: false),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return (data as List<dynamic>).map((e) => DiscoveryOutlet.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to list outlets');
  }

  Future<List<DiscoveryCategory>> listCategories({String? verticalType}) async {
    final queryParams = <String, String>{
      if (verticalType != null) 'verticalType': verticalType,
    };
    final uri = Uri.parse('${base.base.baseUrl}/v1/discovery/categories').replace(queryParameters: queryParams);
    final response = await base.httpClient.get(
      uri,
      headers: base.buildHeaders(requiresAuth: false),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return (data as List<dynamic>).map((e) => DiscoveryCategory.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to list categories');
  }

  Future<List<EligiblePromotion>> listEligiblePromotions() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/checkout/promotions');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return (data as List<dynamic>).map((e) => EligiblePromotion.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to list promotions');
  }

}