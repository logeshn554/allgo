import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/user.dart';
import '../api/api_client.dart';
import '../storage/token_storage.dart';

enum AuthStatus {
  initial,
  loading,
  otpSent,
  authenticated,
  unauthenticated,
  error,
}

class AuthState {
  final AuthStatus status;
  final User? user;
  final String? phone;
  final String? errorMessage;
  final int cooldownSeconds;

  const AuthState({
    this.status = AuthStatus.initial,
    this.user,
    this.phone,
    this.errorMessage,
    this.cooldownSeconds = 0,
  });

  bool get isAuthenticated => status == AuthStatus.authenticated && user != null;
  bool get isLoading => status == AuthStatus.loading;
  bool get hasOtpSent => status == AuthStatus.otpSent;

  AuthState copyWith({
    AuthStatus? status,
    User? user,
    String? phone,
    String? errorMessage,
    int? cooldownSeconds,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      phone: phone ?? this.phone,
      errorMessage: errorMessage,
      cooldownSeconds: cooldownSeconds ?? this.cooldownSeconds,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiClient apiClient;

  AuthNotifier({required this.apiClient}) : super(const AuthState());

  Future<void> checkSession() async {
    state = state.copyWith(status: AuthStatus.loading);
    try {
      final user = await apiClient.getMe();
      state = state.copyWith(
        status: AuthStatus.authenticated,
        user: user,
      );
    } catch (_) {
      state = state.copyWith(status: AuthStatus.unauthenticated, user: null);
    }
  }

  Future<bool> requestOtp(String phone) async {
    state = state.copyWith(status: AuthStatus.loading, phone: phone, errorMessage: null);
    try {
      final res = await apiClient.sendOtp(phone);
      final cooldown = (res['cooldownSeconds'] as int?) ?? 60;
      state = state.copyWith(
        status: AuthStatus.otpSent,
        phone: phone,
        cooldownSeconds: cooldown,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.error,
        errorMessage: e.toString().replaceFirst('ApiException: ', ''),
      );
      return false;
    }
  }

  Future<bool> verifyOtp(String code, {String? platform}) async {
    final phone = state.phone;
    if (phone == null) {
      state = state.copyWith(
        status: AuthStatus.error,
        errorMessage: 'Phone number missing. Please request OTP again.',
      );
      return false;
    }

    state = state.copyWith(status: AuthStatus.loading, errorMessage: null);
    try {
      final tokens = await apiClient.verifyOtp(phone, code, platform: platform);
      state = state.copyWith(
        status: AuthStatus.authenticated,
        user: tokens.user,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.error,
        errorMessage: e.toString().replaceFirst('ApiException: ', ''),
      );
      return false;
    }
  }

  Future<void> logout() async {
    state = state.copyWith(status: AuthStatus.loading);
    await apiClient.logout();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }
}

// Global Providers
final tokenStorageProvider = Provider<TokenStorage>((ref) => SecureTokenStorage());

final apiClientProvider = Provider<ApiClient>((ref) {
  final storage = ref.watch(tokenStorageProvider);
  return ApiClient(tokenStorage: storage);
});

final authNotifierProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final client = ref.watch(apiClientProvider);
  return AuthNotifier(apiClient: client);
});

final currentUserProvider = Provider<User?>((ref) {
  return ref.watch(authNotifierProvider).user;
});
