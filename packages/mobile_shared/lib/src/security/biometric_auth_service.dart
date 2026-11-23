import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Production-ready Biometric and Device Security Service
class BiometricAuthService {
  final FlutterSecureStorage _storage;
  static const String _biometricKey = 'allgo_biometric_enabled';
  static const String _biometricTokenKey = 'allgo_biometric_auth_token';

  BiometricAuthService({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  /// Check whether biometric login has been enabled by user
  Future<bool> isBiometricEnabled() async {
    try {
      final value = await _storage.read(key: _biometricKey);
      return value == 'true';
    } catch (_) {
      return false;
    }
  }

  /// Toggle biometric authentication
  Future<void> setBiometricEnabled(bool enabled) async {
    await _storage.write(key: _biometricKey, value: enabled ? 'true' : 'false');
  }

  /// Store securely bonded session token for biometric unlock
  Future<void> storeBiometricToken(String token) async {
    await _storage.write(key: _biometricTokenKey, value: token);
  }

  /// Retrieve securely bonded session token
  Future<String?> getBiometricToken() async {
    return _storage.read(key: _biometricTokenKey);
  }

  /// Clear biometric credentials on logout or account deletion
  Future<void> clearBiometricCredentials() async {
    await _storage.delete(key: _biometricKey);
    await _storage.delete(key: _biometricTokenKey);
  }
}
