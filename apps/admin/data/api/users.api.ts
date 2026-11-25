import { adminFetch } from './base-client';
import { UserSummary, ListUsersResponse, UserOperationResponse } from '../types';

export class UsersApi {
  async listUsers(page = 1, limit = 20, status?: string): Promise<ListUsersResponse> {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) query.append('status', status);
    return adminFetch<ListUsersResponse>(`/v1/users?${query.toString()}`);
  }

  async getUser(id: string): Promise<UserSummary> {
    return adminFetch<UserSummary>(`/v1/users/${id}`);
  }

  async updateUserStatus(id: string, status: string): Promise<UserOperationResponse> {
    return adminFetch<UserOperationResponse>(`/v1/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async assignRole(userId: string, role: string): Promise<UserOperationResponse> {
    return adminFetch<UserOperationResponse>(`/v1/users/${userId}/roles`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  }

  async revokeRole(userId: string, role: string): Promise<UserOperationResponse> {
    return adminFetch<UserOperationResponse>(
      `/v1/users/${userId}/roles/${encodeURIComponent(role)}`,
      { method: 'DELETE' },
    );
  }
}

export const usersApi = new UsersApi();
