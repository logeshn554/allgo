import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/auth_tokens.dart';

abstract class TokenStorage {
  Future<void> saveTokens(AuthTokens tokens);
  Future<String?> getAccessToken();
  Future<String?> getRefreshToken();
  Future<void> clearTokens();
}

class SecureTokenStorage implements TokenStorage {
  final FlutterSecureStorage _storage;
  static const _keyAccessToken = 'allgo_access_token';
  static const _keyRefreshToken = 'allgo_refresh_token';

  // In-memory fallback if platform secure storage is not accessible
  final Map<String, String> _inMemoryFallback = {};

  SecureTokenStorage([FlutterSecureStorage? storage])
      : _storage = storage ?? const FlutterSecureStorage();

  @override
  Future<void> saveTokens(AuthTokens tokens) async {
    try {
      await _storage.write(key: _keyAccessToken, value: tokens.accessToken);
      await _storage.write(key: _keyRefreshToken, value: tokens.refreshToken);
    } catch (_) {
      _inMemoryFallback[_keyAccessToken] = tokens.accessToken;
      _inMemoryFallback[_keyRefreshToken] = tokens.refreshToken;
    }
  }

  @override
  Future<String?> getAccessToken() async {
    try {
      return await _storage.read(key: _keyAccessToken);
    } catch (_) {
      return _inMemoryFallback[_keyAccessToken];
    }
  }

  @override
  Future<String?> getRefreshToken() async {
    try {
      return await _storage.read(key: _keyRefreshToken);
    } catch (_) {
      return _inMemoryFallback[_keyRefreshToken];
    }
  }

  @override
  Future<void> clearTokens() async {
    try {
      await _storage.delete(key: _keyAccessToken);
      await _storage.delete(key: _keyRefreshToken);
    } catch (_) {
      _inMemoryFallback.clear();
    }
  }
}
