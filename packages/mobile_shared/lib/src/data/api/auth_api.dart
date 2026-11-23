import 'dart:convert';
import 'base_api.dart';
import '../../models/auth_tokens.dart';
import '../../models/user.dart';

class AuthApi {
  final BaseApi base;
  AuthApi(this.base);

  Future<Map<String, dynamic>> sendOtp(String phone) async {
    try {
      final url = Uri.parse('${base.base.baseUrl}/v1/auth/otp/send');
      final response = await base.httpClient.post(
        url,
        headers: base.buildHeaders(requiresAuth: false),
        body: jsonEncode({'phone': phone}),
      ).timeout(const Duration(seconds: 4));

      final data = jsonDecode(response.body);
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return data as Map<String, dynamic>;
      } else {
        throw ApiException(
          response.statusCode,
          data['message']?.toString() ?? 'Failed to send OTP',
          data['error']?.toString(),
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(503, 'Network connection failed while sending OTP. Please check your internet connection.');
    }
  }

  Future<AuthTokens> verifyOtp(String phone, String code, {String? platform}) async {
    try {
      final url = Uri.parse('${base.base.baseUrl}/v1/auth/otp/verify');
      final response = await base.httpClient.post(
        url,
        headers: base.buildHeaders(requiresAuth: false),
        body: jsonEncode({
          'phone': phone,
          'code': code,
          'platform': platform ?? 'ANDROID',
        }),
      ).timeout(const Duration(seconds: 8));

      final data = jsonDecode(response.body);
      if (response.statusCode >= 200 && response.statusCode < 300) {
        final tokens = AuthTokens.fromJson(data as Map<String, dynamic>);
        await base.tokenStorage.saveTokens(tokens);
        return tokens;
      } else {
        throw ApiException(
          response.statusCode,
          data['message']?.toString() ?? 'OTP verification failed',
          data['error']?.toString(),
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(503, 'Network connection failed while verifying OTP. Please try again.');
    }
  }

  Future<AuthTokens> exchangeFirebaseSession({
    required String firebaseToken,
    required String deviceId,
    String platform = 'ANDROID',
    String? fcmToken,
  }) async {
    try {
      final url = Uri.parse('${base.base.baseUrl}/v1/auth/session');
      final response = await base.httpClient.post(
        url,
        headers: base.buildHeaders(requiresAuth: false),
        body: jsonEncode({
          'firebase_token': firebaseToken,
          'device_id': deviceId,
          'platform': platform,
          if (fcmToken != null) 'fcm_token': fcmToken,
        }),
      ).timeout(const Duration(seconds: 10));

      final data = jsonDecode(response.body);
      if (response.statusCode >= 200 && response.statusCode < 300) {
        final tokens = AuthTokens.fromJson(data as Map<String, dynamic>);
        await base.tokenStorage.saveTokens(tokens);
        return tokens;
      } else {
        throw ApiException(
          response.statusCode,
          data['message']?.toString() ?? 'Firebase session exchange failed',
          data['error']?.toString(),
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(503, 'Network error during Firebase session exchange. Please try again.');
    }
  }

  Future<User> getMe() async {
    final token = await base.tokenStorage.getAccessToken();
    if (token == null) {
      throw ApiException(401, 'No authentication token found');
    }

    final url = Uri.parse('${base.base.baseUrl}/v1/auth/me');
    final response = await base.httpClient.get(
      url,
      headers: base.buildHeaders(token: token),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return User.fromJson(data as Map<String, dynamic>);
    } else {
      throw ApiException(
        response.statusCode,
        data['message']?.toString() ?? 'Failed to fetch user profile',
      );
    }
  }

  Future<void> logout() async {
    final token = await base.tokenStorage.getAccessToken();
    if (token != null) {
      try {
        final url = Uri.parse('${base.base.baseUrl}/v1/auth/logout');
        await base.httpClient.post(url, headers: base.buildHeaders(token: token));
      } catch (_) {
        // Continue clearing local tokens on network failure
      }
    }
    await base.tokenStorage.clearTokens();
  }

  Future<User> updateProfile({
    String? fullName,
    String? defaultLanguage,
    String? email,
    String? avatarUrl,
  }) async {
    final token = await base.tokenStorage.getAccessToken();
    try {
      final url = Uri.parse('${base.base.baseUrl}/v1/users/profile');
      final response = await base.httpClient.patch(
        url,
        headers: base.buildHeaders(token: token),
        body: jsonEncode({
          if (fullName != null) 'fullName': fullName,
          if (email != null) 'email': email,
          if (avatarUrl != null) 'avatarUrl': avatarUrl,
          if (defaultLanguage != null) 'defaultLanguage': defaultLanguage,
        }),
      ).timeout(const Duration(seconds: 4));

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final data = jsonDecode(response.body);
        return User.fromJson(data as Map<String, dynamic>);
      } else {
        final data = jsonDecode(response.body);
        throw ApiException(
          response.statusCode,
          data['message']?.toString() ?? 'Profile update failed',
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(503, 'Network error updating profile. Please try again.');
    }
  }

  Future<void> deleteAccount() async {
    final token = await base.tokenStorage.getAccessToken();
    if (token != null) {
      try {
        final url = Uri.parse('${base.base.baseUrl}/v1/users/me');
        await base.httpClient.delete(url, headers: base.buildHeaders(token: token));
      } catch (_) {}
    }
    await base.tokenStorage.clearTokens();
  }

  Future<bool> checkHealth() async {
    try {
      final url = Uri.parse('${base.base.baseUrl}/v1/health');
      final response = await base.httpClient.get(url).timeout(const Duration(seconds: 3));
      return response.statusCode == 200 || response.statusCode == 503;
    } catch (_) {
      return false;
    }
  }

  Future<List<Map<String, dynamic>>> listDeviceSessions() async {
    final token = await base.tokenStorage.getAccessToken();
    if (token == null) return [];
    try {
      final url = Uri.parse('${base.base.baseUrl}/v1/auth/sessions');
      final response = await base.httpClient.get(url, headers: base.buildHeaders(token: token));
      if (response.statusCode >= 200 && response.statusCode < 300) {
        final list = jsonDecode(response.body) as List<dynamic>;
        return list.map((e) => e as Map<String, dynamic>).toList();
      }
    } catch (_) {}
    return [];
  }

  Future<void> revokeDeviceSession(String deviceId) async {
    final token = await base.tokenStorage.getAccessToken();
    if (token == null) return;
    try {
      final url = Uri.parse('${base.base.baseUrl}/v1/auth/sessions/$deviceId');
      await base.httpClient.delete(url, headers: base.buildHeaders(token: token));
    } catch (_) {}
  }
}
