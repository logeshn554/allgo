import {
  createApiClient,
  getCookie,
  safeFetchJson,
  sanitizeApiErrorMessage,
} from '@allgo/api-client';
import { validateAdminEnv } from '@allgo/env';

const adminEnv = validateAdminEnv({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://allgo-api.onrender.com',
});

export const API_BASE = adminEnv.NEXT_PUBLIC_API_URL;

export { getCookie, safeFetchJson, sanitizeApiErrorMessage };

export function getAdminHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-AllGo-Role': 'ADMIN',
    'X-AllGo-Client': 'web',
  };
}

const adminClient = createApiClient({
  baseUrl: API_BASE,
  role: 'ADMIN',
  client: 'web',
  credentials: 'include',
});

export async function adminFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return adminClient.request<T>(endpoint, options);
}
