import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/auth_tokens.dart';
import '../models/user.dart';
import '../storage/token_storage.dart';

class ApiException implements Exception {
  final int statusCode;
  final String message;
  final String? error;

  ApiException(this.statusCode, this.message, [this.error]);

  @override
  String toString() => 'ApiException($statusCode): $message';
}

class ApiClient {
  final String baseUrl;
  final TokenStorage tokenStorage;
  final http.Client _httpClient;
  String activeRole;
  String activeLanguage;

  ApiClient({
    String? baseUrl,
    TokenStorage? tokenStorage,
    http.Client? httpClient,
    this.activeRole = 'CUSTOMER',
    this.activeLanguage = 'en',
  })  : baseUrl = baseUrl ?? 'http://10.0.2.2:3000',
        tokenStorage = tokenStorage ?? SecureTokenStorage(),
        _httpClient = httpClient ?? http.Client();

  Map<String, String> _buildHeaders({String? token, bool requiresAuth = true}) {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-AllGo-Role': activeRole,
      'Accept-Language': activeLanguage,
    };
    if (requiresAuth && token != null) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  Future<Map<String, dynamic>> sendOtp(String phone) async {
    final url = Uri.parse('$baseUrl/v1/auth/otp/send');
    final response = await _httpClient.post(
      url,
      headers: _buildHeaders(requiresAuth: false),
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
    final url = Uri.parse('$baseUrl/v1/auth/otp/verify');
    final response = await _httpClient.post(
      url,
      headers: _buildHeaders(requiresAuth: false),
      body: jsonEncode({
        'phone': phone,
        'code': code,
        'platform': platform ?? 'ANDROID',
      }),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final tokens = AuthTokens.fromJson(data as Map<String, dynamic>);
      await tokenStorage.saveTokens(tokens);
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
    final token = await tokenStorage.getAccessToken();
    if (token == null) {
      throw ApiException(401, 'No authentication token found');
    }

    final url = Uri.parse('$baseUrl/v1/auth/me');
    final response = await _httpClient.get(
      url,
      headers: _buildHeaders(token: token),
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
    final token = await tokenStorage.getAccessToken();
    if (token != null) {
      try {
        final url = Uri.parse('$baseUrl/v1/auth/logout');
        await _httpClient.post(url, headers: _buildHeaders(token: token));
      } catch (_) {
        // Continue clearing local tokens on network failure
      }
    }
    await tokenStorage.clearTokens();
  }

  Future<bool> checkHealth() async {
    try {
      final url = Uri.parse('$baseUrl/v1/health');
      final response = await _httpClient.get(url).timeout(const Duration(seconds: 3));
      return response.statusCode == 200 || response.statusCode == 503;
    } catch (_) {
      return false;
    }
  }
}
