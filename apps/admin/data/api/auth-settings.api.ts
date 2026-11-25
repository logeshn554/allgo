import { adminFetch } from './base-client';
import type { TwoFactorPolicy, TwoFactorStatusResponse } from '../types';

export interface AuthSettings {
  phoneOtpEnabled: boolean;
  emailPasswordEnabled: boolean;
  emailOtpEnabled: boolean;
  oauthEnabled: boolean;
  allowSelfSignup: boolean;
  autoLinkVerifiedAccounts: boolean;
  requireEmailVerification: boolean;
  twoFactorPolicy: TwoFactorPolicy;
  maxDevicesPerUser: number;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  updatedAt: string;
}

export interface AuthProviderConfig {
  id: string;
  slug: string;
  displayName: string;
  providerType: 'OAUTH2' | 'OIDC';
  enabled: boolean;
  clientId: string | null;
  hasClientSecret: boolean;
  scopes: string;
  authorizationUrl: string | null;
  tokenUrl: string | null;
  userinfoUrl: string | null;
  issuerUrl: string | null;
  autoLink: boolean;
  allowSignup: boolean;
  icon: string | null;
  sortOrder: number;
  updatedAt: string;
}

export interface UserIdentity {
  id: string;
  userId: string;
  provider: string;
  providerAccountId: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  verified: boolean;
  lastUsedAt: string;
  createdAt: string;
}

export interface UserDeviceSession {
  id: string;
  userId: string;
  deviceId: string;
  platform: string;
  deviceName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  loginMethod: string | null;
  lastActiveAt: string;
  createdAt: string;
}

export const authSettingsApi = {
  getSettings: () => adminFetch<AuthSettings>('/v1/admin/auth/settings'),

  updateSettings: (patch: Partial<AuthSettings>) =>
    adminFetch<AuthSettings>('/v1/admin/auth/settings', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  listProviders: () => adminFetch<{ providers: AuthProviderConfig[] }>('/v1/admin/auth/providers'),

  createProvider: (data: {
    slug: string;
    displayName: string;
    providerType?: 'OAUTH2' | 'OIDC';
    enabled?: boolean;
    clientId?: string;
    clientSecret?: string;
    scopes?: string;
    authorizationUrl?: string;
    tokenUrl?: string;
    userinfoUrl?: string;
    issuerUrl?: string;
    autoLink?: boolean;
    allowSignup?: boolean;
  }) =>
    adminFetch<AuthProviderConfig>('/v1/admin/auth/providers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProvider: (slug: string, patch: Record<string, any>) =>
    adminFetch<AuthProviderConfig>(`/v1/admin/auth/providers/${encodeURIComponent(slug)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  deleteProvider: (slug: string) =>
    adminFetch<{ success: boolean }>(`/v1/admin/auth/providers/${encodeURIComponent(slug)}`, {
      method: 'DELETE',
    }),

  listUserIdentities: (userId: string) =>
    adminFetch<{ identities: UserIdentity[] }>(`/v1/admin/auth/users/${userId}/identities`),

  linkUserIdentity: (
    userId: string,
    data: {
      provider: string;
      providerAccountId: string;
      email?: string;
      phone?: string;
      displayName?: string;
      verified?: boolean;
    },
  ) =>
    adminFetch<UserIdentity>(`/v1/admin/auth/users/${userId}/identities`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  unlinkUserIdentity: (userId: string, identityId: string) =>
    adminFetch<{ success: boolean }>(`/v1/admin/auth/users/${userId}/identities/${identityId}`, {
      method: 'DELETE',
    }),

  listUserDevices: (userId: string) =>
    adminFetch<{ devices: UserDeviceSession[] }>(`/v1/admin/auth/users/${userId}/devices`),

  revokeUserDevice: (userId: string, deviceId: string) =>
    adminFetch<{ success: boolean }>(
      `/v1/admin/auth/users/${encodeURIComponent(userId)}/devices/${encodeURIComponent(deviceId)}`,
      {
        method: 'DELETE',
      },
    ),

  revokeAllUserDevices: (userId: string) =>
    adminFetch<{ success: boolean }>(`/v1/admin/auth/users/${userId}/devices`, {
      method: 'DELETE',
    }),

  getUserTwoFactorStatus: (userId: string) =>
    adminFetch<TwoFactorStatusResponse>(`/v1/admin/auth/users/${userId}/2fa`),

  resetUserTwoFactor: (userId: string) =>
    adminFetch<{ success: boolean }>(`/v1/admin/auth/users/${userId}/2fa`, {
      method: 'DELETE',
    }),

  createUser: (data: {
    email?: string;
    phone?: string;
    password?: string;
    fullName?: string;
    role?: string;
  }) =>
    adminFetch<any>('/v1/admin/auth/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
