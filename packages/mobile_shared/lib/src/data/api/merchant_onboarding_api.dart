import 'dart:convert';
import 'base_api.dart';

class MerchantOnboardingApi {
  final BaseApi base;
  MerchantOnboardingApi(this.base);

  Future<Map<String, dynamic>> registerMerchant(Map<String, dynamic> data) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/register');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token),
      body: jsonEncode(data),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return res as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Registration failed');
  }

  Future<Map<String, dynamic>> getMerchantProfile() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/profile');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return res as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to get profile');
  }

  Future<Map<String, dynamic>> submitMerchantDocument(String documentType, String ticketId, {String? documentNumber}) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/documents');
    final Map<String, dynamic> body = {
      'documentType': documentType,
      'ticketId': ticketId,
    };
    if (documentNumber != null) body['documentNumber'] = documentNumber;

    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token),
      body: jsonEncode(body),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return res as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to submit merchant document');
  }

  Future<Map<String, dynamic>> createMerchantOutlet(Map<String, dynamic> data) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/outlets');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token),
      body: jsonEncode(data),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return res as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to create outlet');
  }

  Future<List<dynamic>> getMerchantOutlets() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/outlets');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return res as List<dynamic>? ?? [];
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to fetch outlets');
  }

  Future<Map<String, dynamic>> submitMerchantApplication() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/submit');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return res as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to submit merchant application');
  }

  Future<Map<String, dynamic>> getMerchantEarnings() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/earnings');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return res as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to fetch earnings');
  }

  Future<List<dynamic>> getMerchantPayouts() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/payouts');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return res as List<dynamic>? ?? [];
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to fetch payouts');
  }

}