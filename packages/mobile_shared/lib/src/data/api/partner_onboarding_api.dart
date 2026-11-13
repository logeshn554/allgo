import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'base_api.dart';
import '../../models/partner_profile.dart';

class PartnerOnboardingApi {
  final BaseApi base;
  PartnerOnboardingApi(this.base);

  Future<Map<String, dynamic>> createUploadTicket(String documentType, String mimeType, int fileSizeBytes) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/documents/upload-ticket');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token),
      body: jsonEncode({
        'documentType': documentType,
        'mimeType': mimeType,
        'fileSizeBytes': fileSizeBytes,
      }),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return res as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to create upload ticket');
  }

  Future<Map<String, dynamic>> uploadDocumentBinary(String ticketId, List<int> bytes) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/documents/upload/$ticketId');
    final response = await base.httpClient.post(
      url,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Authorization': 'Bearer $token',
        'X-AllGo-Role': activeRole,
      },
      body: bytes,
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return res as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to upload document file');
  }

  Future<Map<String, dynamic>> registerPartner(Map<String, dynamic> data) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/register');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token),
      body: jsonEncode(data),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return res as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Partner registration failed');
  }

  Future<Map<String, dynamic>> getPartnerProfile() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/profile');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return res as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to fetch partner profile');
  }

  Future<Map<String, dynamic>> applyPartnerService(String serviceType) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/services/apply');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token),
      body: jsonEncode({'serviceType': serviceType}),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return res as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to apply for service');
  }

  Future<Map<String, dynamic>> submitPartnerDocument(String documentType, String ticketId, {String? documentNumber}) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/documents');
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
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to submit partner document');
  }

  Future<Map<String, dynamic>> submitPartnerApplication() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/submit');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return res as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to submit partner application');
  }

}