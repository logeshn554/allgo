// Job: Resilient HTTP client with automatic Bearer token injection, 401 refresh queue, and idempotency keys.

import { loadFromCache, removeFromCache, saveToCache } from './localCache.ts';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://allgo-api.onrender.com';

export interface RequestOptions {
  headers?: Record<string, string>;
  idempotencyKey?: string;
  skipAuth?: boolean;
}

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `idem_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
}

export function buildHeaders(path: string, options: RequestOptions = {}): Record<string, string> {
  const token = loadFromCache<string>('allgo_auth_token', '');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token && !options.skipAuth) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Inject Idempotency key on critical booking/checkout mutating requests
  const isMutatingBooking =
    path.includes('/checkout') ||
    path.includes('/orders') ||
    path.includes('/rides/book') ||
    path.includes('/payments');

  if (isMutatingBooking) {
    headers['X-Idempotency-Key'] = options.idempotencyKey || generateUUID();
  }

  return headers;
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = loadFromCache<string>('allgo_refresh_token', '');
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      removeFromCache('allgo_auth_token');
      removeFromCache('allgo_refresh_token');
      return null;
    }

    const data = await res.json();
    if (data && data.accessToken) {
      saveToCache('allgo_auth_token', data.accessToken);
      if (data.refreshToken) {
        saveToCache('allgo_refresh_token', data.refreshToken);
      }
      return data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

export async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T | null> {
  const headers = buildHeaders(path, options);

  try {
    let response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Handle 401 with Token Refresh Retry Queue
    if (response.status === 401 && !options.skipAuth) {
      if (isRefreshing) {
        const newToken = await new Promise<string | null>((resolve) => {
          refreshQueue.push(resolve);
        });

        if (newToken) {
          headers.Authorization = `Bearer ${newToken}`;
          response = await fetch(`${API_BASE_URL}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
          });
        }
      } else {
        isRefreshing = true;
        const newToken = await refreshAccessToken();
        isRefreshing = false;

        const queue = [...refreshQueue];
        refreshQueue = [];
        queue.forEach((cb) => cb(newToken));

        if (newToken) {
          headers.Authorization = `Bearer ${newToken}`;
          response = await fetch(`${API_BASE_URL}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
          });
        }
      }
    }

    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function apiGet<T>(path: string, options?: RequestOptions): Promise<T | null> {
  return apiRequest<T>('GET', path, undefined, options);
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  options?: RequestOptions,
): Promise<T | null> {
  return apiRequest<T>('POST', path, body, options);
}

export function getAuthTokens(): { accessToken: string | null; refreshToken: string | null } {
  return {
    accessToken: loadFromCache<string>('allgo_auth_token', '') || null,
    refreshToken: loadFromCache<string>('allgo_refresh_token', '') || null,
  };
}

export function setAuthTokens(accessToken: string, refreshToken?: string): void {
  saveToCache('allgo_auth_token', accessToken);
  if (refreshToken) {
    saveToCache('allgo_refresh_token', refreshToken);
  }
}

export function clearAuthTokens(): void {
  removeFromCache('allgo_auth_token');
  removeFromCache('allgo_refresh_token');
}
