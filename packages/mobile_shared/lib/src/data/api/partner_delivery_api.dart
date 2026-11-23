import 'dart:convert';
import 'base_api.dart';
import '../../models/delivery_job.dart';

class PartnerDeliveryApi {
  final BaseApi base;
  PartnerDeliveryApi(this.base);

  Future<void> partnerGoOnline(double latitude, double longitude) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/delivery/availability/online');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
      body: jsonEncode({
        'latitude': latitude,
        'longitude': longitude,
      }),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final res = jsonDecode(response.body);
      throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to go online');
    }
  }

  Future<void> partnerGoOffline() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/delivery/availability/offline');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final res = jsonDecode(response.body);
      throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to go offline');
    }
  }

  Future<void> partnerHeartbeat(double latitude, double longitude) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/delivery/availability/heartbeat');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
      body: jsonEncode({
        'latitude': latitude,
        'longitude': longitude,
      }),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final res = jsonDecode(response.body);
      throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to send heartbeat');
    }
  }

  Future<void> partnerUpdateLocation(Map<String, dynamic> locationData) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/delivery/location');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
      body: jsonEncode(locationData),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final res = jsonDecode(response.body);
      throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to update location');
    }
  }

  Future<DeliveryJobModel?> getPartnerActiveJob() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/delivery/active-job');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
    );
    if (response.statusCode == 200) {
      final res = jsonDecode(response.body);
      if (res == null) return null;
      return DeliveryJobModel.fromJson(res as Map<String, dynamic>);
    }
    return null;
  }

  Future<List<DeliveryOfferModel>> getPartnerOffers() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/delivery/offers');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final list = res as List<dynamic>? ?? [];
      return list.map((e) => DeliveryOfferModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to fetch offers');
  }

  Future<void> acceptPartnerOffer(String attemptId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/delivery/offers/$attemptId/accept');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final res = jsonDecode(response.body);
      throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to accept offer');
    }
  }

  Future<void> rejectPartnerOffer(String attemptId, {String? reason}) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/delivery/offers/$attemptId/reject');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
      body: jsonEncode({'reason': reason ?? 'Declined'}),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final res = jsonDecode(response.body);
      throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to reject offer');
    }
  }

  Future<void> partnerArrivedPickup(String jobId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/delivery/jobs/$jobId/arrived-pickup');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final res = jsonDecode(response.body);
      throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to update status');
    }
  }

  Future<void> partnerStartDelivery(String jobId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/delivery/jobs/$jobId/start-delivery');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final res = jsonDecode(response.body);
      throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to start delivery');
    }
  }

  Future<void> partnerArrivedDestination(String jobId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/delivery/jobs/$jobId/arrived-destination');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final res = jsonDecode(response.body);
      throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to update destination arrival');
    }
  }

  Future<void> partnerCompleteDelivery(
    String jobId, {
    String? pin,
    String? proofType,
    String? photoStorageKey,
    double? latitude,
    double? longitude,
  }) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/delivery/jobs/$jobId/complete');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
      body: jsonEncode({
        if (pin != null) 'deliveryPin': pin,
        if (proofType != null) 'proofType': proofType,
        if (photoStorageKey != null) 'photoStorageKey': photoStorageKey,
        if (latitude != null) 'latitude': latitude,
        if (longitude != null) 'longitude': longitude,
      }),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final res = jsonDecode(response.body);
      throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to complete delivery');
    }
  }

  Future<void> partnerReportException(String jobId, String exceptionType, String details) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/delivery/jobs/$jobId/exception');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
      body: jsonEncode({
        'exceptionType': exceptionType,
        'details': details,
      }),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final res = jsonDecode(response.body);
      throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to report exception');
    }
  }

  Future<List<PartnerEarningsModel>> getPartnerEarnings() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/delivery/earnings');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final list = res as List<dynamic>? ?? [];
      return list.map((e) => PartnerEarningsModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to fetch earnings');
  }

}