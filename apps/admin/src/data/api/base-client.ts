export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export function getAdminHeaders(token?: string | null): Record<string, string> {
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

export async function adminFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const headers = {
    ...getAdminHeaders(),
    ...((options.headers as Record<string, string>) || {}),
  };
  const res = await fetch(url, { ...options, headers });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }
  return data as T;
}
