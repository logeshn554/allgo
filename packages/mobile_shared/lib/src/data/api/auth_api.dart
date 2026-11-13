import 'dart:convert';
import 'package:http/http.dart' as http;
import 'base_api.dart';
import '../../models/auth_tokens.dart';
import '../../models/user.dart';

class AuthApi {
  final BaseApi base;
  AuthApi(this.base);

  Future<Map<String, dynamic>> sendOtp(String phone) async {
    final url = Uri.parse('${base.base.baseUrl}/v1/auth/otp/send');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(requiresAuth: false),
      body: jsonEncode({'phone': phone}),
    );

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
  }

  Future<AuthTokens> verifyOtp(String phone, String code, {String? platform}) async {
    final url = Uri.parse('${base.base.baseUrl}/v1/auth/otp/verify');
    final response = await base.httpClient.post(
      url,
      headers: base.buildHeaders(requiresAuth: false),
      body: jsonEncode({
        'phone': phone,
        'code': code,
        'platform': platform ?? 'ANDROID',
      }),
    );

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

  Future<bool> checkHealth() async {
    try {
      final url = Uri.parse('${base.base.baseUrl}/v1/health');
      final response = await base.httpClient.get(url).timeout(const Duration(seconds: 3));
      return response.statusCode == 200 || response.statusCode == 503;
    } catch (_) {
      return false;
    }
  }

}