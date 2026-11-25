export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://allgo-api.onrender.com';

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match && typeof match[3] === 'string' ? decodeURIComponent(match[3]) : null;
}

export function getAdminHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-AllGo-Role': 'ADMIN',
    'X-AllGo-Client': 'web',
  };
}

export function sanitizeApiErrorMessage(
  rawMessage: unknown,
  status?: number,
  fallback = 'Something went wrong. Please try again.',
): string {
  const msg = Array.isArray(rawMessage)
    ? rawMessage.filter(Boolean).join('. ')
    : typeof rawMessage === 'string'
      ? rawMessage.trim()
      : '';

  if (!msg) {
    return status && status >= 500
      ? 'Service is temporarily unavailable. Please try again.'
      : fallback;
  }

  // Never expose raw Express/NestJS route errors like "Cannot POST /v1/auth/lookup"
  if (/^Cannot\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s+\//i.test(msg)) {
    return 'This service is temporarily unavailable. Please try again.';
  }

  // Never expose internal OAuth configuration details
  if (/missing Client ID|missing authorizationUrl|missing tokenUrl|missing userinfoUrl|OAuth provider .* is not (enabled|configured)/i.test(msg)) {
    return 'Single sign-on is currently unavailable. Please sign in with your email or phone.';
  }

  // Never expose internal infrastructure/DB errors
  if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|Database service|Internal server error/i.test(msg)) {
    return 'Service is temporarily unavailable. Please try again.';
  }

  return msg;
}

export async function safeFetchJson<T>(
  url: string,
  options: RequestInit = {},
  fallbackError = 'Request failed. Please try again.',
): Promise<T> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('You are offline. Check your internet connection and try again.');
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      credentials: options.credentials ?? 'include',
    });
  } catch {
    const offline = typeof navigator !== 'undefined' && !navigator.onLine;
    throw new Error(
      offline
        ? 'You are offline. Check your internet connection and try again.'
        : 'Unable to reach the server. Check your connection and try again.',
    );
  }

  const text = await res.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      if (!res.ok) {
        throw new Error('Service is temporarily unavailable. Please try again.');
      }
      throw new Error('Received an unexpected response from the server.');
    }
  }

  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('allgo:unauthorized'));
    }
    throw new Error(sanitizeApiErrorMessage(data?.message, res.status, fallbackError));
  }

  return data as T;
}

export async function adminFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const headers = {
    ...getAdminHeaders(),
    ...((options.headers as Record<string, string>) || {}),
  };
  return safeFetchJson<T>(url, { ...options, headers }, 'Request failed. Please try again.');
}
