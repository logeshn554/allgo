import 'dart:convert';
import 'package:http/http.dart' as http;
import 'base_api.dart';
import '../../models/parcel.dart';

class PartnerParcelApi {
  final BaseApi base;
  PartnerParcelApi(this.base);

  Future<List<ParcelOffer>> getPartnerParcelOffers() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/parcels/offers');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return (data as List<dynamic>).map((e) => ParcelOffer.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to fetch parcel offers');
  }

  Future<Map<String, dynamic>> acceptParcelOffer(String attemptId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/parcels/offers/$attemptId/accept');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to accept parcel offer');
  }

  Future<Map<String, dynamic>> rejectParcelOffer(String attemptId, {String? reason}) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/parcels/offers/$attemptId/reject');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
      body: jsonEncode({'reason': reason ?? 'Partner rejected offer'}),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to reject parcel offer');
  }

  Future<ParcelModel?> getPartnerActiveParcel() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/parcels/active');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
    );
    if (response.statusCode == 404) return null;
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (data == null) return null;
      return ParcelModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to fetch active parcel');
  }

  Future<ParcelModel> confirmParcelArrivedPickup(String parcelId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/parcels/$parcelId/arrived-pickup');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return ParcelModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to confirm arrival at pickup');
  }

  Future<ParcelModel> verifyParcelPickupOtp(String parcelId, String otp) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/parcels/$parcelId/verify-pickup');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
      body: jsonEncode({'otp': otp}),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return ParcelModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Pickup OTP verification failed');
  }

  Future<ParcelModel> startParcelTransit(String parcelId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/parcels/$parcelId/start-transit');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return ParcelModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to start transit');
  }

  Future<ParcelModel> confirmParcelArrivedDestination(String parcelId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/parcels/$parcelId/arrived-destination');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return ParcelModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to confirm arrival at destination');
  }

  Future<ParcelModel> verifyParcelDeliveryOtp(String parcelId, String otp, {String? photoUrl}) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/parcels/$parcelId/verify-delivery');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
      body: jsonEncode({'otp': otp, if (photoUrl != null) 'photoUrl': photoUrl}),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return ParcelModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Delivery OTP verification failed');
  }

  Future<ParcelModel> recordFailedParcelDelivery(
    String parcelId, {
    required String reason,
    String? notes,
    String? photoUrl,
  }) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/parcels/$parcelId/failed-attempt');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
      body: jsonEncode({
        'reason': reason,
        if (notes != null) 'notes': notes,
        if (photoUrl != null) 'photoUrl': photoUrl,
      }),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return ParcelModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to record unsuccessful delivery attempt');
  }

  Future<ParcelModel> initiateParcelReturn(
    String parcelId, {
    required String reason,
    String? notes,
  }) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/parcels/$parcelId/return-to-sender');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
      body: jsonEncode({
        'reason': reason,
        if (notes != null) 'notes': notes,
      }),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return ParcelModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to initiate return to sender');
  }

  Future<ParcelModel> completeParcelReturn(String parcelId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/parcels/$parcelId/complete-return');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return ParcelModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to complete return to sender');
  }

  Future<List<ParcelModel>> getPartnerParcelHistory({int limit = 20, int offset = 0}) async {
    final token = await base.tokenStorage.getAccessToken();
    final queryParams = <String, String>{
      'limit': limit.toString(),
      'offset': offset.toString(),
    };
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/parcels/history').replace(queryParameters: queryParams);
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final list = data is Map<String, dynamic> ? (data['parcels'] as List<dynamic>? ?? []) : (data as List<dynamic>);
      return list.map((e) => ParcelModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to fetch partner parcel history');
  }

}