// Job: Centralized typed HTTP client with automatic auth header insertion.

import { getLocalItem } from './localCache';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.allgo.internal/v1';

export async function apiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
): Promise<{ data: T | null; error: string | null }> {
  try {
    const token = getLocalItem('auth_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      return { data: null, error: err.error || `HTTP ${res.status}` };
    }

    const data = await res.json();
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Network error' };
  }
}
