import 'dart:convert';
import 'package:http/http.dart' as http;
import 'base_api.dart';
import '../../models/merchant_order.dart';
import '../../models/merchant_dashboard_data.dart';
import '../../models/delivery_job.dart';

class MerchantOrdersApi {
  final BaseApi base;
  MerchantOrdersApi(this.base);

  Future<MerchantDashboardData> getMerchantDashboard() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/dashboard');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return MerchantDashboardData.fromJson(res as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to fetch dashboard');
  }

  Future<void> updateOutletStatus(
    String outletId,
    bool? isOpen, {
    int? defaultPrepTimeMinutes,
    String? logoUrl,
    String? coverPhotoUrl,
  }) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/outlets/$outletId/status');
    final Map<String, dynamic> body = {};
    if (isOpen != null) body['isOpen'] = isOpen;
    if (defaultPrepTimeMinutes != null) {
      body['defaultPrepTimeMinutes'] = defaultPrepTimeMinutes;
    }
    if (logoUrl != null) body['logoUrl'] = logoUrl;
    if (coverPhotoUrl != null) body['coverPhotoUrl'] = coverPhotoUrl;
    final response = await base.httpClient.patch(
      url,
      headers: base.buildHeaders(token: token),
      body: jsonEncode(body),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final res = jsonDecode(response.body);
      throw ApiException(response.statusCode, res['message']?.toString() ?? 'Status update failed');
    }
  }

  Future<List<MerchantOrder>> getMerchantOrders({String? status}) async {
    final token = await base.tokenStorage.getAccessToken();
    var uri = '${base.base.baseUrl}/v1/merchants/orders';
    if (status != null) uri += '?status=$status';
    final response = await base.httpClient.get(
      Uri.parse(uri),
      headers: base.buildHeaders(token: token),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final list = res as List<dynamic>? ?? [];
      return list.map((e) => MerchantOrder.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to fetch orders');
  }

  Future<MerchantOrder> getMerchantOrderById(String orderId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/orders/$orderId');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return MerchantOrder.fromJson(res as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Order not found');
  }

  Future<void> updateOrderStatus(String orderId, String targetStatus, {int? prepTimeMinutes, String? rejectionReason}) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/orders/$orderId/status');
    final Map<String, dynamic> body = {'status': targetStatus};
    if (prepTimeMinutes != null) body['prepTimeMinutes'] = prepTimeMinutes;
    if (rejectionReason != null) body['rejectionReason'] = rejectionReason;

    final response = await base.httpClient.patch(
      url,
      headers: base.buildHeaders(token: token),
      body: jsonEncode(body),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final res = jsonDecode(response.body);
      throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to update order status');
    }
  }

  Future<List<DeliveryJobModel>> getMerchantDeliveryJobs(String outletId, {String? status}) async {
    final token = await base.tokenStorage.getAccessToken();
    final uri = '${base.base.baseUrl}/v1/merchants/outlets/$outletId/delivery/jobs${status != null ? '?status=$status' : ''}';
    final response = await base.httpClient.get(
      Uri.parse(uri),
      headers: base.buildHeaders(token: token, roleContext: 'MERCHANT_ADMIN'),
    );
    final res = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final list = res as List<dynamic>? ?? [];
      return list.map((e) => DeliveryJobModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to fetch merchant delivery jobs');
  }

  Future<void> merchantAcceptDeliveryJob(String jobId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/delivery/jobs/$jobId/accept');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'MERCHANT_ADMIN'),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final res = jsonDecode(response.body);
      throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to accept delivery job');
    }
  }

  Future<void> merchantPrepareDeliveryJob(String jobId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/delivery/jobs/$jobId/preparing');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'MERCHANT_ADMIN'),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final res = jsonDecode(response.body);
      throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to update preparing status');
    }
  }

  Future<void> merchantReadyDeliveryJob(String jobId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/delivery/jobs/$jobId/ready');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'MERCHANT_ADMIN'),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final res = jsonDecode(response.body);
      throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to mark job ready');
    }
  }

  Future<void> merchantVerifyHandoverOtp(String jobId, String handoverOtp) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/delivery/jobs/$jobId/handover');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'MERCHANT_ADMIN'),
      body: jsonEncode({'handoverOtp': handoverOtp}),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final res = jsonDecode(response.body);
      throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to verify handover OTP');
    }
  }

  Future<List<MerchantOrder>> merchantListOrders({String? status}) async {
    final token = await base.tokenStorage.getAccessToken();
    final uri = Uri.parse('${base.base.baseUrl}/v1/merchants/orders').replace(
      queryParameters: status != null ? {'status': status} : null,
    );
    final response = await base.httpClient.get(uri, headers: base.buildHeaders(token: token, roleContext: 'MERCHANT'));
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final list = data as List<dynamic>? ?? [];
      return list.map((o) => MerchantOrder.fromJson(o as Map<String, dynamic>)).toList();
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to list merchant orders');
  }

  Future<Map<String, dynamic>> merchantAcceptOrder(String subOrderId, {int prepTimeMinutes = 20}) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/orders/$subOrderId/accept');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'MERCHANT'),
      body: jsonEncode({'prepTimeMinutes': prepTimeMinutes}),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to accept order');
  }

  Future<Map<String, dynamic>> merchantMarkPreparing(String subOrderId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/orders/$subOrderId/preparing');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'MERCHANT'),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to mark order preparing');
  }

  Future<Map<String, dynamic>> merchantMarkReady(String subOrderId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/orders/$subOrderId/ready');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'MERCHANT'),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to mark order ready');
  }

  Future<Map<String, dynamic>> merchantRejectOrder(String subOrderId, String reason) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/merchants/orders/$subOrderId/reject');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'MERCHANT'),
      body: jsonEncode({'reason': reason}),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to reject order');
  }

}