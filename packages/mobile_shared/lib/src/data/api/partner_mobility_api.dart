import 'dart:convert';
import 'package:http/http.dart' as http;
import 'base_api.dart';
import '../../models/mobility.dart' hide ParcelModel;
import '../../models/parcel.dart';

class PartnerMobilityApi {
  final BaseApi base;
  PartnerMobilityApi(this.base);

  Future<PartnerModeConfigModel> getPartnerContinuityMode() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/continuity/mode');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return PartnerModeConfigModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to fetch partner mode');
  }

  Future<PartnerModeConfigModel> updatePartnerContinuityMode({
    required String preferredMode,
    required bool isOnline,
  }) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/partner/continuity/mode');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
      body: jsonEncode({
        'preferredMode': preferredMode,
        'isOnline': isOnline,
      }),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return PartnerModeConfigModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to update partner mode');
  }

  Future<RideModel> driverAssignRide(String rideId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/rides/$rideId/assign');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return RideModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to assign ride');
  }

  Future<RideModel> driverArrivedRide(String rideId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/rides/$rideId/arrived');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return RideModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to report arrival');
  }

  Future<RideModel> driverStartTrip({required String rideId, required String startOtp}) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/rides/$rideId/start-trip');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
      body: jsonEncode({'startOtp': startOtp}),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return RideModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to start trip');
  }

  Future<RideModel> driverCompleteTrip(String rideId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/rides/$rideId/complete');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return RideModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to complete trip');
  }

  Future<List<RideOfferModel>> getPartnerRideOffers() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/rides/partner/offers');
    final response = await base.httpClient.get(url, headers: base.buildHeaders(token: token, roleContext: 'PARTNER'));
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final list = data as List<dynamic>? ?? [];
      return list.map((e) => RideOfferModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    return [];
  }

  Future<RideModel> acceptRideOffer(String attemptId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/rides/offers/$attemptId/accept');
    final response = await base.httpClient.post(url, headers: base.buildHeaders(token: token, roleContext: 'PARTNER'));
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return RideModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to accept ride offer');
  }

  Future<void> rejectRideOffer(String attemptId, {String? reason}) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/rides/offers/$attemptId/reject');
    await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
      body: jsonEncode({'reason': reason ?? 'Rejected by partner'}),
    );
  }

  Future<RideModel?> getPartnerActiveRide() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/rides/partner/active');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
    );
    if (response.statusCode == 404) return null;
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (data == null) return null;
      return RideModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to fetch active ride');
  }

  Future<HireDriverBookingModel?> getPartnerActiveHireDriver() async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/hire-driver/partner/active');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
    );
    if (response.statusCode == 404) return null;
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (data == null) return null;
      return HireDriverBookingModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to fetch active hire driver duty');
  }

  Future<ParcelModel> courierAssignParcel(String parcelId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/parcels/$parcelId/assign');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return ParcelModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to assign parcel');
  }

  Future<ParcelModel> courierVerifyPickupOtp({required String parcelId, required String pickupOtp}) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/parcels/$parcelId/verify-pickup');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
      body: jsonEncode({'otp': pickupOtp}),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return ParcelModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to verify pickup OTP');
  }

  Future<ParcelModel> courierStartParcelTransit(String parcelId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/parcels/$parcelId/in-transit');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return ParcelModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to update parcel in transit');
  }

  Future<ParcelModel> courierVerifyDeliveryOtp({required String parcelId, required String deliveryOtp}) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/parcels/$parcelId/verify-delivery');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
      body: jsonEncode({'otp': deliveryOtp}),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return ParcelModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to verify delivery OTP');
  }

  Future<HireDriverBookingModel> driverAssignHireBooking(String bookingId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/hire-driver/$bookingId/assign');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return HireDriverBookingModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to assign hire driver booking');
  }

  Future<HireDriverBookingModel> driverArrivedHireBooking(String bookingId) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/hire-driver/$bookingId/arrived');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return HireDriverBookingModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to report hire driver arrival');
  }

  Future<HireDriverBookingModel> driverStartHireDuty({
    required String bookingId,
    required String startOtp,
    required double startOdometerKm,
  }) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/hire-driver/$bookingId/start-duty');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
      body: jsonEncode({
        'startOtp': startOtp,
        'startOdometerKm': startOdometerKm,
      }),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return HireDriverBookingModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to start hire driver duty');
  }

  Future<HireDriverBookingModel> driverEndHireDuty({
    required String bookingId,
    required String endOtp,
    required double endOdometerKm,
  }) async {
    final token = await base.tokenStorage.getAccessToken();
    final url = Uri.parse('${base.base.baseUrl}/v1/hire-driver/$bookingId/end-duty');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(token: token, roleContext: 'PARTNER'),
      body: jsonEncode({
        'endOtp': endOtp,
        'endOdometerKm': endOdometerKm,
      }),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return HireDriverBookingModel.fromJson(data as Map<String, dynamic>);
    }
    throw ApiException(response.statusCode, data['message']?.toString() ?? 'Failed to end hire driver duty');
  }

}