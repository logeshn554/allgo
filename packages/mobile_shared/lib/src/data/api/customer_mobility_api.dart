import 'dart:convert';
import 'package:http/http.dart' as http;
import 'base_api.dart';
import '../../models/mobility.dart';

class CustomerMobilityApi {
  final BaseApi base;
  CustomerMobilityApi(this.base);

  Future<List<RideFareEstimateModel>> estimateRideFare({
    required double pickupLat,
    required double pickupLng,
    required double dropoffLat,
    required double dropoffLng,
    required String stateCode,
  }) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/rides/fare-estimate');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'),
      body: jsonEncode({
        'pickupLat': pickupLat,
        'pickupLng': pickupLng,
        'dropoffLat': dropoffLat,
        'dropoffLng': dropoffLng,
        'stateCode': stateCode,
      }),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final list = data as List<dynamic>;
      return list.map((e) => RideFareEstimateModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to estimate ride fare');
  }

  Future<RideModel> bookRide({
    required String vehicleCategory,
    required double pickupLat,
    required double pickupLng,
    required String pickupAddress,
    required double dropoffLat,
    required double dropoffLng,
    required String dropoffAddress,
    required String stateCode,
  }) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/rides/book');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'),
      body: jsonEncode({
        'vehicleCategory': vehicleCategory,
        'pickupLat': pickupLat,
        'pickupLng': pickupLng,
        'pickupAddress': pickupAddress,
        'dropoffLat': dropoffLat,
        'dropoffLng': dropoffLng,
        'dropoffAddress': dropoffAddress,
        'stateCode': stateCode,
      }),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return RideModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to book ride');
  }

  Future<RideModel> getRide(String rideId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/rides/$rideId');
    final response = await base.httpClient.get(url, headers: base.buildHeaders(token: token));
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return RideModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to fetch ride');
  }

  Future<void> triggerRideSos({
    required String rideId,
    required double latitude,
    required double longitude,
    String? reason,
  }) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/rides/$rideId/sos');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token),
      body: jsonEncode({
        'latitude': latitude,
        'longitude': longitude,
        if (reason != null) 'reason': reason,
      }),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final res = jsonDecode(response.body);
      throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to trigger SOS');
    }
  }

  Future<void> cancelRide({required String rideId, String? reason}) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/rides/$rideId/cancel');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'),
      body: jsonEncode({
        if (reason != null) 'reason': reason,
      }),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final res = jsonDecode(response.body);
      throw ApiException(response.statusCode, res['message']?.toString() ?? 'Failed to cancel ride');
    }
  }

  Future<Map<String, dynamic>> quoteParcelFare({
    required double pickupLat,
    required double pickupLng,
    required double dropoffLat,
    required double dropoffLng,
    required double weightKg,
    required String stateCode,
  }) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/parcels/quote');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'),
      body: jsonEncode({
        'pickupLat': pickupLat,
        'pickupLng': pickupLng,
        'dropoffLat': dropoffLat,
        'dropoffLng': dropoffLng,
        'weightKg': weightKg,
        'stateCode': stateCode,
      }),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to quote parcel fare');
  }

  Future<ParcelModel> createParcel({
    required String packageCategory,
    required double weightKg,
    required double pickupLat,
    required double pickupLng,
    required String pickupAddress,
    required String senderPhone,
    required double dropoffLat,
    required double dropoffLng,
    required String dropoffAddress,
    required String recipientName,
    required String recipientPhone,
    required String stateCode,
    bool isFragile = false,
  }) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/parcels');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'),
      body: jsonEncode({
        'packageCategory': packageCategory,
        'weightKg': weightKg,
        'pickupLat': pickupLat,
        'pickupLng': pickupLng,
        'pickupAddress': pickupAddress,
        'senderPhone': senderPhone,
        'dropoffLat': dropoffLat,
        'dropoffLng': dropoffLng,
        'dropoffAddress': dropoffAddress,
        'recipientName': recipientName,
        'recipientPhone': recipientPhone,
        'stateCode': stateCode,
        'isFragile': isFragile,
      }),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return ParcelModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to create parcel');
  }

  Future<ParcelModel> getParcel(String parcelId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/parcels/$parcelId');
    final response = await base.httpClient.get(url, headers: base.buildHeaders(token: token));
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return ParcelModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to fetch parcel');
  }

  Future<Map<String, dynamic>> estimateHireDriver({
    required int durationHours,
    required String scheduledStartTime,
    required String transmission,
    required String stateCode,
  }) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/hire-driver/estimate');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'),
      body: jsonEncode({
        'durationHours': durationHours,
        'scheduledStartTime': scheduledStartTime,
        'transmission': transmission,
        'stateCode': stateCode,
      }),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to estimate hire driver fare');
  }

  Future<HireDriverBookingModel> bookHireDriver({
    required int durationHours,
    required String scheduledStartTime,
    required String transmission,
    required double pickupLat,
    required double pickupLng,
    required String pickupAddress,
    required String stateCode,
  }) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/hire-driver/book');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'CUSTOMER'),
      body: jsonEncode({
        'durationHours': durationHours,
        'scheduledStartTime': scheduledStartTime,
        'transmission': transmission,
        'pickupLat': pickupLat,
        'pickupLng': pickupLng,
        'pickupAddress': pickupAddress,
        'stateCode': stateCode,
      }),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return HireDriverBookingModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to book hire driver');
  }

  Future<HireDriverBookingModel> getHireDriverBooking(String bookingId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/hire-driver/$bookingId');
    final response = await base.httpClient.get(url, headers: base.buildHeaders(token: token));
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return HireDriverBookingModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to fetch hire driver booking');
  }

}