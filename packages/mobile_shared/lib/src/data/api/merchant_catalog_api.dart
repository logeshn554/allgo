import 'dart:convert';
import 'base_api.dart';
import '../../models/product_item.dart';
import '../../models/option_group.dart';

class MerchantCatalogApi {
  final BaseApi base;
  MerchantCatalogApi(this.base);

  Future<List<ProductItem>> getMerchantProducts({String? categoryId, String? search}) async {
    final token = await base.tokenStorage.getAccessToken();
    final params = <String>[];
    if (categoryId != null) params.add('categoryId=$categoryId');
    if (search != null) params.add('search=${Uri.encodeComponent(search)}');
    final uri = '${base.base.baseUrl}/v1/merchants/products${params.isNotEmpty ? '?${params.join('&')}' : ''}';

    final response = await base.httpClient.get(
      Uri.parse(uri),
      headers: base.buildHeaders(token: token),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final list = res as List<dynamic>? ?? [];
      return list.map((e) => ProductItem.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to fetch products');
  }

  Future<ProductItem> createMerchantProduct(Map<String, dynamic> data) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/products');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token),
      body: jsonEncode(data),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return ProductItem.fromJson(res as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to create product');
  }

  Future<void> updateMerchantProduct(String productId, Map<String, dynamic> data) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/products/$productId');
    final response = await base.httpClient.patch(
      url,
      headers: base.buildHeaders(token: token),
      body: jsonEncode(data),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final res = jsonDecode(response.body);
      throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to update product');
    }
  }

  Future<void> deleteMerchantProduct(String productId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/products/$productId');
    final response = await base.httpClient.delete(
      url,
      headers: base.buildHeaders(token: token),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final res = jsonDecode(response.body);
      throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to delete product');
    }
  }

  Future<void> updateMerchantInventory(String itemId, {int? stockQuantity, bool? isInStock}) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/inventory/$itemId');
    final Map<String, dynamic> body = {};
    if (stockQuantity != null) body['stockQuantity'] = stockQuantity;
    if (isInStock != null) body['isInStock'] = isInStock;

    final response = await base.httpClient.patch(
      url,
      headers: base.buildHeaders(token: token),
      body: jsonEncode(body),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final res = jsonDecode(response.body);
      throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to update inventory');
    }
  }

  Future<List<dynamic>> getOutletCategories(String outletId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/outlets/$outletId/categories');
    final response = await base.httpClient.get(url, headers: base.buildHeaders(token: token));
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return res as List<dynamic>? ?? [];
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to get categories');
  }

  Future<Map<String, dynamic>> createOutletCategory(String outletId, Map<String, dynamic> data) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/outlets/$outletId/categories');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token),
      body: jsonEncode(data),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return res as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to create category');
  }

  Future<Map<String, dynamic>> getOutletProducts(
    String outletId, {
    String? categoryId,
    String? search,
    int? page,
    int? limit,
  }) async {
    final token = await base.tokenStorage.getAccessToken();
    final params = <String>[];
    if (categoryId != null) params.add('categoryId=$categoryId');
    if (search != null && search.isNotEmpty) params.add('search=${Uri.encodeComponent(search)}');
    if (page != null) params.add('page=$page');
    if (limit != null) params.add('limit=$limit');

    final uri = '${base.base.baseUrl}/v1/merchants/outlets/$outletId/products${params.isNotEmpty ? '?${params.join('&')}' : ''}';
    final response = await base.httpClient.get(Uri.parse(uri), headers: base.buildHeaders(token: token));
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return res as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to get outlet products');
  }

  Future<ProductItem> createOutletProduct(String outletId, Map<String, dynamic> data) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/outlets/$outletId/products');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token),
      body: jsonEncode(data),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return ProductItem.fromJson(res as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to create outlet product');
  }

  Future<ProductItem> updateCatalogProduct(String productId, Map<String, dynamic> data) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/catalog/products/$productId');
    final response = await base.httpClient.put(
      url,
      headers: base.buildHeaders(token: token),
      body: jsonEncode(data),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return ProductItem.fromJson(res as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to update product');
  }

  Future<void> archiveCatalogProduct(String productId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/catalog/products/$productId/archive');
    final response = await base.httpClient.post(url, headers: base.buildHeaders(token: token));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final res = jsonDecode(response.body);
      throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to archive product');
    }
  }

  Future<ProductVariant> createProductVariant(String productId, Map<String, dynamic> data) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/products/$productId/variants');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token),
      body: jsonEncode(data),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return ProductVariant.fromJson(res as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to create variant');
  }

  Future<List<ProductVariant>> getProductVariants(String productId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/products/$productId/variants');
    final response = await base.httpClient.get(url, headers: base.buildHeaders(token: token));
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final list = res as List<dynamic>? ?? [];
      return list.map((e) => ProductVariant.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to fetch variants');
  }

  Future<OptionGroup> createProductOptionGroup(String productId, Map<String, dynamic> data) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/products/$productId/option-groups');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token),
      body: jsonEncode(data),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return OptionGroup.fromJson(res as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to create option group');
  }

  Future<List<OptionGroup>> getProductOptionGroups(String productId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/products/$productId/option-groups');
    final response = await base.httpClient.get(url, headers: base.buildHeaders(token: token));
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final list = res as List<dynamic>? ?? [];
      return list.map((e) => OptionGroup.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to fetch option groups');
  }

  Future<OptionItem> createProductOption(String groupId, Map<String, dynamic> data) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/option-groups/$groupId/options');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token),
      body: jsonEncode(data),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return OptionItem.fromJson(res as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to create option item');
  }

  Future<void> setOutletProductOverride(
    String outletId,
    String productId,
    Map<String, dynamic> data,
  ) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/outlets/$outletId/products/$productId/override');
    final response = await base.httpClient.put(
      url,
      headers: base.buildHeaders(token: token),
      body: jsonEncode(data),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final res = jsonDecode(response.body);
      throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to set outlet override');
    }
  }

  Future<void> updateOutletStock(
    String outletId,
    String productId,
    int stockQuantity, {
    String? reason,
  }) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/outlets/$outletId/products/$productId/stock');
    final response = await base.httpClient.put(
      url,
      headers: base.buildHeaders(token: token),
      body: jsonEncode({
        'stockQuantity': stockQuantity,
        if (reason != null) 'reason': reason,
      }),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final res = jsonDecode(response.body);
      throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to update stock');
    }
  }

}