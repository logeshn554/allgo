import 'dart:convert';
import 'base_api.dart';
import '../../models/customer_address.dart';

class CustomerAddressesApi {
  final BaseApi base;
  CustomerAddressesApi(this.base);

  Future<List<CustomerAddressModel>> listCustomerAddresses() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/addresses');
    final response = await base.httpClient.get(url, headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'));
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final list = data as List<dynamic>? ?? [];
      return list.map((a) => CustomerAddressModel.fromJson(a as Map<String, dynamic>)).toList();
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to fetch saved addresses');
  }

  Future<CustomerAddressModel> createCustomerAddress(CustomerAddressModel address) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/addresses');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'),
      body: jsonEncode(address.toJson()),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return CustomerAddressModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to create saved address');
  }

  Future<CustomerAddressModel> updateCustomerAddress(String addressId, CustomerAddressModel address) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/addresses/$addressId');
    final response = await base.httpClient.put(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'),
      body: jsonEncode(address.toJson()),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return CustomerAddressModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to update saved address');
  }

  Future<CustomerAddressModel> setDefaultCustomerAddress(String addressId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/addresses/$addressId/default');
    final response = await base.httpClient.patch(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return CustomerAddressModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to set default address');
  }

  Future<void> deleteCustomerAddress(String addressId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/addresses/$addressId');
    final response = await base.httpClient.delete(url, headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'));
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return;
    }
    final data = jsonDecode(response.body);
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to delete saved address');
  }
}
