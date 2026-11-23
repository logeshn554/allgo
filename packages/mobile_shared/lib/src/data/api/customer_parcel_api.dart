import 'dart:convert';
import 'base_api.dart';
import '../../models/parcel.dart';

class CustomerParcelApi {
  final BaseApi base;
  CustomerParcelApi(this.base);

  Future<ParcelQuote> quoteParcel(Map<String, dynamic> quoteRequest) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/parcels/quote');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'),
      body: jsonEncode(quoteRequest),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return ParcelQuote.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to calculate parcel quote');
  }

  Future<List<Map<String, dynamic>>> getParcelRestrictions() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/parcels/config/restrictions');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return (data as List<dynamic>).cast<Map<String, dynamic>>();
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to fetch parcel restrictions');
  }

  Future<List<Map<String, dynamic>>> getParcelServices() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/parcels/config/services');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return (data as List<dynamic>).cast<Map<String, dynamic>>();
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to fetch parcel services');
  }

  Future<ParcelModel> createParcelBooking(Map<String, dynamic> bookingRequest) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/parcels');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'),
      body: jsonEncode(bookingRequest),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return ParcelModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to create parcel booking');
  }

  Future<Map<String, dynamic>> payParcelBooking(
    String parcelId, {
    String paymentMethod = 'UPI',
    String? idempotencyKey,
    String? gatewayPaymentId,
    String? gatewaySignature,
  }) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/parcels/$parcelId/pay');
    final body = <String, dynamic>{
      'paymentMethod': paymentMethod,
      if (idempotencyKey != null) 'idempotencyKey': idempotencyKey,
      if (gatewayPaymentId != null) 'gatewayPaymentId': gatewayPaymentId,
      if (gatewaySignature != null) 'gatewaySignature': gatewaySignature,
    };
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'),
      body: jsonEncode(body),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to process parcel payment');
  }

  Future<ParcelModel> getParcelDetails(String parcelId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/parcels/$parcelId');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return ParcelModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to get parcel details');
  }

  Future<ParcelModel> getParcelTracking(String parcelId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/parcels/$parcelId/tracking');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return ParcelModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to get parcel tracking');
  }

  Future<List<ParcelModel>> listCustomerParcels({int limit = 20, int offset = 0, String? status}) async {
    final token = await base.tokenStorage.getAccessToken();
    final queryParams = <String, String>{
      'limit': limit.toString(),
      'offset': offset.toString(),
      if (status != null) 'status': status,
    };
    final url = Uri.parse('${base.base.baseUrl}/v1/parcels').replace(queryParameters: queryParams);
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final list = data is Map<String, dynamic> ? (data['parcels'] as List<dynamic>? ?? []) : (data as List<dynamic>);
      return list.map((e) => ParcelModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to list customer parcels');
  }

  Future<ParcelModel> cancelParcelBooking(String parcelId, {required String reason}) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/parcels/$parcelId/cancel');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'),
      body: jsonEncode({'reason': reason}),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return ParcelModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to cancel parcel booking');
  }

}