import 'package:http/http.dart' as http;
import '../../storage/token_storage.dart';

class ApiException implements Exception {
  final int statusCode;
  final String message;
  final String? error;

  ApiException(this.statusCode, this.message, [this.error]);

  @override
  String toString() => 'ApiException: $statusCode - $message${error != null ? ' ($error)' : ''}';
}

class BaseApiHost {
  final String baseUrl;
  BaseApiHost(this.baseUrl);
}

class BaseApi {
  final BaseApiHost base;
  final TokenStorage tokenStorage;
  final http.Client httpClient;
  final String Function() getActiveRole;
  final String Function() getActiveLanguage;

  BaseApi({
    required String baseUrl,
    required this.tokenStorage,
    required this.httpClient,
    required this.getActiveRole,
    required this.getActiveLanguage,
  }) : base = BaseApiHost(baseUrl);

  Map<String, String> buildHeaders({
    String? token,
    bool requiresAuth = true,
    String? roleContext,
  }) {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-AllGo-Role': roleContext ?? getActiveRole(),
      'Accept-Language': getActiveLanguage(),
    };
    if (requiresAuth && token != null) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }
}
