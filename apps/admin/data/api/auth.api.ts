import { getOrCreateWebDeviceId } from '../auth/device-id';
import { upsertStoredSession } from '../auth/session-store';
import {
  type ActiveDeviceSession,
  type AuthLoginResult,
  type AuthResponse,
  type IdentifierLookupResponse,
  type LinkedIdentity,
  type LogoutResponse,
  type SendOtpResponse,
  type TwoFactorEnableResponse,
  type TwoFactorPolicy,
  type TwoFactorSetupResponse,
  type TwoFactorStatusResponse,
  type UserSummary,
  isTwoFactorChallenge,
} from '../types';
import { API_BASE, adminFetch, getAdminHeaders, safeFetchJson } from './base-client';

export class AuthApi {
  async sendOtp(phone: string): Promise<SendOtpResponse> {
    return safeFetchJson<SendOtpResponse>(
      `${API_BASE}/v1/auth/otp/send`,
      {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ phone }),
      },
      'Failed to dispatch admin OTP',
    );
  }

  async verifyOtp(phone: string, code: string): Promise<AuthLoginResult> {
    const data = await safeFetchJson<AuthLoginResult>(
      `${API_BASE}/v1/auth/otp/verify`,
      {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ phone, code, platform: 'WEB', deviceId: getOrCreateWebDeviceId() }),
      },
      'OTP verification failed',
    );

    if (!isTwoFactorChallenge(data)) {
      this.persistSession(data);
    }
    return data;
  }

  async logout(refreshToken?: string): Promise<LogoutResponse> {
    const headers = getAdminHeaders();
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('allgo_admin_token');
        localStorage.removeItem('allgo_admin_user');
      } catch {}
    }
    try {
      return await safeFetchJson<LogoutResponse>(
        `${API_BASE}/v1/auth/logout`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(refreshToken ? { refreshToken } : {}),
        },
        'Logout failed',
      );
    } catch {
      return { success: true };
    }
  }

  async getMe(): Promise<UserSummary> {
    return adminFetch<UserSummary>('/v1/auth/me');
  }

  async getPublicProviders(): Promise<{
    methods: {
      phoneOtp: boolean;
      emailPassword: boolean;
      emailOtp: boolean;
      oauth: boolean;
      allowSelfSignup: boolean;
      twoFactorPolicy?: TwoFactorPolicy;
    };
    oauthProviders: Array<{
      slug: string;
      displayName: string;
      providerType: string;
      icon: string | null;
      configured?: boolean;
    }>;
  }> {
    return safeFetchJson(
      `${API_BASE}/v1/auth/providers/public`,
      { headers: { 'Content-Type': 'application/json' } },
      'Failed to load auth providers',
    );
  }

  async lookupIdentifier(identifier: string): Promise<IdentifierLookupResponse> {
    return safeFetchJson<IdentifierLookupResponse>(
      `${API_BASE}/v1/auth/lookup`,
      {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ identifier }),
      },
      'Failed to look up account',
    );
  }

  private persistSession(data: AuthResponse) {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('allgo_admin_token');
        localStorage.removeItem('allgo_admin_user');
      } catch {}
      upsertStoredSession(data);
    }
  }

  async loginWithPassword(identifier: string, password: string): Promise<AuthLoginResult> {
    const data = await safeFetchJson<AuthLoginResult>(
      `${API_BASE}/v1/auth/password/login`,
      {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          identifier,
          password,
          platform: 'WEB',
          deviceId: getOrCreateWebDeviceId(),
        }),
      },
      'Invalid credentials',
    );
    if (!isTwoFactorChallenge(data)) {
      this.persistSession(data);
    }
    return data;
  }

  async refreshSession(
    refreshToken: string,
    deviceId = getOrCreateWebDeviceId(),
  ): Promise<AuthResponse> {
    const data = await safeFetchJson<AuthResponse>(
      `${API_BASE}/v1/auth/refresh`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken, deviceId }),
      },
      'Session refresh failed',
    );
    this.persistSession(data);
    return data;
  }

  async loginWithEmail(email: string, password: string): Promise<AuthLoginResult> {
    const data = await safeFetchJson<AuthLoginResult>(
      `${API_BASE}/v1/auth/email/login`,
      {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          email,
          password,
          platform: 'WEB',
          deviceId: getOrCreateWebDeviceId(),
        }),
      },
      'Email login failed',
    );
    if (!isTwoFactorChallenge(data)) {
      this.persistSession(data);
    }
    return data;
  }

  async registerWithEmail(
    email: string,
    password: string,
    fullName?: string,
  ): Promise<AuthResponse> {
    const data = await safeFetchJson<AuthResponse>(
      `${API_BASE}/v1/auth/email/register`,
      {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          email,
          password,
          fullName,
          platform: 'WEB',
          deviceId: getOrCreateWebDeviceId(),
        }),
      },
      'Email registration failed',
    );
    this.persistSession(data);
    return data;
  }

  async sendEmailOtp(email: string): Promise<SendOtpResponse> {
    return safeFetchJson<SendOtpResponse>(
      `${API_BASE}/v1/auth/email/otp/send`,
      {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ email }),
      },
      'Failed to send email OTP',
    );
  }

  async verifyEmailOtp(email: string, code: string): Promise<AuthLoginResult> {
    const data = await safeFetchJson<AuthLoginResult>(
      `${API_BASE}/v1/auth/email/otp/verify`,
      {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ email, code, platform: 'WEB', deviceId: getOrCreateWebDeviceId() }),
      },
      'Email OTP verification failed',
    );
    if (!isTwoFactorChallenge(data)) {
      this.persistSession(data);
    }
    return data;
  }

  async exchangeOAuthCode(code: string): Promise<AuthLoginResult> {
    const data = await safeFetchJson<AuthLoginResult>(
      `${API_BASE}/v1/auth/oauth/exchange`,
      {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ code, deviceId: getOrCreateWebDeviceId() }),
      },
      'OAuth code exchange failed',
    );
    if (!isTwoFactorChallenge(data)) {
      this.persistSession(data);
    }
    return data;
  }

  async forgotPassword(identifier: string): Promise<{ status: string; cooldownSeconds: number }> {
    return safeFetchJson<{ status: string; cooldownSeconds: number }>(
      `${API_BASE}/v1/auth/password/forgot`,
      {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ identifier }),
      },
      'Failed to send password reset code',
    );
  }

  async resetPassword(
    identifier: string,
    code: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    return safeFetchJson<{ success: boolean; message: string }>(
      `${API_BASE}/v1/auth/password/reset`,
      {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ identifier, code, newPassword }),
      },
      'Password reset failed',
    );
  }

  async changePassword(
    currentPassword: string | undefined,
    newPassword: string,
  ): Promise<{ success: boolean }> {
    return adminFetch<{ success: boolean }>('/v1/auth/password/change', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async verifyTwoFactorLogin(
    twoFactorToken: string,
    code: string,
    isBackupCode = false,
  ): Promise<AuthResponse> {
    const data = await safeFetchJson<AuthResponse>(
      `${API_BASE}/v1/auth/2fa/verify-login`,
      {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          twoFactorToken,
          code,
          isBackupCode,
          platform: 'WEB',
          deviceId: getOrCreateWebDeviceId(),
        }),
      },
      'Two-factor verification failed',
    );
    this.persistSession(data);
    return data;
  }

  async getTwoFactorStatus(): Promise<TwoFactorStatusResponse> {
    return adminFetch<TwoFactorStatusResponse>('/v1/auth/2fa/status');
  }

  async setupTwoFactor(): Promise<TwoFactorSetupResponse> {
    return adminFetch<TwoFactorSetupResponse>('/v1/auth/2fa/setup', { method: 'POST' });
  }

  async enableTwoFactor(code: string): Promise<TwoFactorEnableResponse> {
    return adminFetch<TwoFactorEnableResponse>('/v1/auth/2fa/enable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async disableTwoFactor(code: string): Promise<{ enabled: boolean }> {
    return adminFetch<{ enabled: boolean }>('/v1/auth/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async regenerateBackupCodes(code: string): Promise<{ backupCodes: string[] }> {
    return adminFetch<{ backupCodes: string[] }>('/v1/auth/2fa/backup-codes/regenerate', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  getOAuthAuthorizeUrl(providerSlug: string, redirectUrl: string): string {
    const params = new URLSearchParams({ redirect: redirectUrl });
    return `${API_BASE}/v1/auth/oauth/${encodeURIComponent(providerSlug)}/authorize?${params.toString()}`;
  }

  // ==================== SELF-SERVICE SESSIONS / LOGIN DEVICES ====================

  async listSessions(): Promise<{ sessions: ActiveDeviceSession[] }> {
    return adminFetch<{ sessions: ActiveDeviceSession[] }>('/v1/auth/sessions');
  }

  async revokeSession(deviceId: string): Promise<{ success: boolean }> {
    return adminFetch<{ success: boolean }>(`/v1/auth/sessions/${encodeURIComponent(deviceId)}`, {
      method: 'DELETE',
    });
  }

  async revokeAllSessions(): Promise<{ success: boolean }> {
    return adminFetch<{ success: boolean }>('/v1/auth/sessions', {
      method: 'DELETE',
    });
  }

  // ==================== SELF-SERVICE LINKED IDENTITIES ====================

  async listMyIdentities(): Promise<{ identities: LinkedIdentity[] }> {
    return adminFetch<{ identities: LinkedIdentity[] }>('/v1/auth/identities');
  }

  async unlinkMyIdentity(identityId: string): Promise<{ success: boolean }> {
    return adminFetch<{ success: boolean }>(
      `/v1/auth/identities/${encodeURIComponent(identityId)}`,
      {
        method: 'DELETE',
      },
    );
  }

  async sendLinkPhoneOtp(phone: string): Promise<SendOtpResponse> {
    return adminFetch<SendOtpResponse>('/v1/auth/identities/phone/send', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  async verifyLinkPhoneOtp(phone: string, code: string): Promise<{ identity: LinkedIdentity }> {
    return adminFetch<{ identity: LinkedIdentity }>('/v1/auth/identities/phone/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });
  }

  async sendLinkEmailOtp(email: string): Promise<SendOtpResponse> {
    return adminFetch<SendOtpResponse>('/v1/auth/identities/email/send', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async verifyLinkEmailOtp(email: string, code: string): Promise<{ identity: LinkedIdentity }> {
    return adminFetch<{ identity: LinkedIdentity }>('/v1/auth/identities/email/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  }

  async startOAuthLink(providerSlug: string, redirectUrl: string): Promise<{ url: string }> {
    return adminFetch<{ url: string }>(
      `/v1/auth/identities/oauth/${encodeURIComponent(providerSlug)}/authorize`,
      {
        method: 'POST',
        body: JSON.stringify({ redirect: redirectUrl }),
      },
    );
  }
}

export const authApi = new AuthApi();
