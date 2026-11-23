import 'dart:convert';
import 'base_api.dart';
import '../../models/operating_hours.dart';

class MerchantHoursApi {
  final BaseApi base;
  MerchantHoursApi(this.base);

  Future<List<OperatingHourIntervalModel>> getOutletOperatingHours(String outletId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/outlets/$outletId/operating-hours');
    final response = await base.httpClient.get(url, headers: base.buildHeaders(token: token));
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final list = res as List<dynamic>? ?? [];
      return list.map((e) => OperatingHourIntervalModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to get operating hours');
  }

  Future<List<OperatingHourIntervalModel>> setOutletOperatingHours(
    String outletId,
    List<Map<String, dynamic>> intervals,
  ) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/outlets/$outletId/operating-hours');
    final response = await base.httpClient.put(
      url,
      headers: base.buildHeaders(token: token),
      body: jsonEncode({'intervals': intervals}),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final list = res as List<dynamic>? ?? [];
      return list.map((e) => OperatingHourIntervalModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to set operating hours');
  }

  Future<List<SpecialClosureModel>> getOutletSpecialClosures(String outletId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/outlets/$outletId/special-closures');
    final response = await base.httpClient.get(url, headers: base.buildHeaders(token: token));
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final list = res as List<dynamic>? ?? [];
      return list.map((e) => SpecialClosureModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to get special closures');
  }

  Future<SpecialClosureModel> addOutletSpecialClosure(String outletId, Map<String, dynamic> data) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/outlets/$outletId/special-closures');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token),
      body: jsonEncode(data),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return SpecialClosureModel.fromJson(res as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to add special closure');
  }

  Future<void> deleteOutletSpecialClosure(String outletId, String closureId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/outlets/$outletId/special-closures/$closureId');
    final response = await base.httpClient.delete(url, headers: base.buildHeaders(token: token));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final res = jsonDecode(response.body);
      throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to delete special closure');
    }
  }

  Future<Map<String, dynamic>> toggleOutletTemporaryClosure(
    String outletId, {
    required bool isTemporarilyClosed,
    String? temporaryClosureReason,
    String? reopensAt,
  }) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/outlets/$outletId/temporary-closure');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token),
      body: jsonEncode({
        'isTemporarilyClosed': isTemporarilyClosed,
        if (temporaryClosureReason != null) 'temporaryClosureReason': temporaryClosureReason,
        if (reopensAt != null) 'reopensAt': reopensAt,
      }),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return res as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to update temporary closure');
  }

}