import { API_BASE, getAdminHeaders } from './base-client';
import { UserSummary, ListUsersResponse, UserOperationResponse } from '../types';

export class UsersApi {
  async listUsers(page = 1, limit = 20, status?: string): Promise<ListUsersResponse> {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) query.append('status', status);

    const res = await fetch(`${API_BASE}/v1/users?${query.toString()}`, {
      headers: getAdminHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to retrieve user directory');
    }
    return data;
  }

  async getUser(id: string): Promise<UserSummary> {
    const res = await fetch(`${API_BASE}/v1/users/${id}`, {
      headers: getAdminHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'User not found');
    }
    return data;
  }

  async updateUserStatus(id: string, status: string): Promise<UserOperationResponse> {
    const res = await fetch(`${API_BASE}/v1/users/${id}/status`, {
      method: 'PATCH',
      headers: getAdminHeaders(),
      body: JSON.stringify({ status }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to update user account status');
    }
    return data;
  }

  async assignRole(userId: string, role: string): Promise<UserOperationResponse> {
    const res = await fetch(`${API_BASE}/v1/users/${userId}/roles`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ role }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to assign user role');
    }
    return data;
  }

  async revokeRole(userId: string, role: string): Promise<UserOperationResponse> {
    const res = await fetch(`${API_BASE}/v1/users/${userId}/roles/${encodeURIComponent(role)}`, {
      method: 'DELETE',
      headers: getAdminHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to revoke user role');
    }
    return data;
  }
}

export const usersApi = new UsersApi();
