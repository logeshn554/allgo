const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface UserSummary {
  id: string;
  phone: string;
  email?: string;
  fullName?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'PENDING_VERIFICATION';
  roles: string[];
  defaultLanguage: string;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserSummary;
}

class AdminApiClient {
  private getHeaders(token?: string | null): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-AllGo-Role': 'ADMIN',
    };
    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('allgo_admin_token') : null);
    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }
    return headers;
  }

  async sendOtp(phone: string): Promise<{ status: string; cooldownSeconds: number }> {
    const res = await fetch(`${API_BASE}/v1/auth/otp/send`, {
      method: 'POST',
      headers: this.getHeaders(),
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
      headers: this.getHeaders(),
      body: JSON.stringify({ phone, code, platform: 'WEB' }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'OTP verification failed');
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('allgo_admin_token', data.accessToken);
      localStorage.setItem('allgo_admin_user', JSON.stringify(data.user));
    }

    return data;
  }

  async listUsers(page = 1, limit = 20, status?: string): Promise<{ users: UserSummary[]; total: number }> {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) query.append('status', status);

    const res = await fetch(`${API_BASE}/v1/users?${query.toString()}`, {
      headers: this.getHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to retrieve user directory');
    }
    return data;
  }

  async getUser(id: string): Promise<UserSummary> {
    const res = await fetch(`${API_BASE}/v1/users/${id}`, {
      headers: this.getHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'User not found');
    }
    return data;
  }

  async updateUserStatus(id: string, status: string): Promise<{ success: boolean; id: string; status: string }> {
    const res = await fetch(`${API_BASE}/v1/users/${id}/status`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ status }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to update user account status');
    }
    return data;
  }

  async getMe(): Promise<UserSummary> {
    const res = await fetch(`${API_BASE}/v1/auth/me`, {
      headers: this.getHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Session expired');
    }
    return data;
  }
}

export const adminApi = new AdminApiClient();
