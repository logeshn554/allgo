import { API_BASE, getAdminHeaders, adminFetch } from './base-client';
import { SendOtpResponse, AuthResponse, LogoutResponse, UserSummary } from '../types';

export class AuthApi {
  async sendOtp(phone: string): Promise<SendOtpResponse> {
    const res = await fetch(`${API_BASE}/v1/auth/otp/send`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ phone }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to dispatch admin OTP');
    }
    return data;
  }

  async verifyOtp(phone: string, code: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/v1/auth/otp/verify`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ phone, code, platform: 'WEB' }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'OTP verification failed');
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('allgo_admin_token', data.accessToken);
      localStorage.setItem('allgo_admin_user', JSON.stringify(data.user));
      document.cookie = `allgo_admin_token=${data.accessToken}; path=/; SameSite=Lax`;
    }

    return data;
  }

  async logout(): Promise<LogoutResponse> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('allgo_admin_token');
      localStorage.removeItem('allgo_admin_user');
      document.cookie = 'allgo_admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    }
    try {
      return await adminFetch<LogoutResponse>('/v1/auth/logout', { method: 'POST' });
    } catch {
      return { success: true };
    }
  }

  async getMe(): Promise<UserSummary> {
    return adminFetch<UserSummary>('/v1/auth/me');
  }
}

export const authApi = new AuthApi();
