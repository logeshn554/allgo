export interface ApiClientConfig {
  baseUrl: string;
  role?: 'ADMIN' | 'CUSTOMER' | 'MERCHANT' | 'PARTNER';
  client?: 'web' | 'mobile';
  getAuthToken?: () => string | null | Promise<string | null>;
  onUnauthorized?: () => void;
  credentials?: RequestCredentials;
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(^|;\\s*)(${name})=([^;]*)`));
  return match && typeof match[3] === 'string' ? decodeURIComponent(match[3]) : null;
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

  if (/^Cannot\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s+\//i.test(msg)) {
    return 'This service is temporarily unavailable. Please try again.';
  }

  if (
    /missing Client ID|missing authorizationUrl|missing tokenUrl|missing userinfoUrl|OAuth provider .* is not (enabled|configured)/i.test(
      msg,
    )
  ) {
    return 'Single sign-on is currently unavailable. Please sign in with your email or phone.';
  }

  if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|Database service|Internal server error/i.test(msg)) {
    return 'Service is temporarily unavailable. Please try again.';
  }

  return msg;
}

export async function safeFetchJson<T>(
  url: string,
  options: RequestInit = {},
  fallbackError = 'Request failed. Please try again.',
  onUnauthorized?: () => void,
): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('You are offline. Check your internet connection and try again.');
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      credentials: options.credentials ?? 'include',
    });
  } catch {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
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
    if (res.status === 401) {
      if (onUnauthorized) {
        onUnauthorized();
      } else if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
        window.dispatchEvent(new CustomEvent('allgo:unauthorized'));
      }
    }
    throw new Error(sanitizeApiErrorMessage(data?.message, res.status, fallbackError));
  }

  return data as T;
}

export function createApiClient(config: ApiClientConfig) {
  const baseUrl = config.baseUrl.replace(/\/+$/, '');

  async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (config.role) {
      headers['X-AllGo-Role'] = config.role;
    }
    if (config.client) {
      headers['X-AllGo-Client'] = config.client;
    }

    if (config.getAuthToken) {
      const token = await config.getAuthToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    if (options.headers) {
      Object.assign(headers, options.headers as Record<string, string>);
    }

    return safeFetchJson<T>(
      url,
      {
        ...options,
        credentials: options.credentials ?? config.credentials ?? 'include',
        headers,
      },
      'Request failed. Please try again.',
      config.onUnauthorized,
    );
  }

  return {
    request,
    get: <T>(endpoint: string, options?: RequestInit) =>
      request<T>(endpoint, { ...options, method: 'GET' }),
    post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
      request<T>(endpoint, {
        ...options,
        method: 'POST',
        body: body !== undefined ? JSON.stringify(body) : undefined,
      }),
    put: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
      request<T>(endpoint, {
        ...options,
        method: 'PUT',
        body: body !== undefined ? JSON.stringify(body) : undefined,
      }),
    patch: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
      request<T>(endpoint, {
        ...options,
        method: 'PATCH',
        body: body !== undefined ? JSON.stringify(body) : undefined,
      }),
    delete: <T>(endpoint: string, options?: RequestInit) =>
      request<T>(endpoint, { ...options, method: 'DELETE' }),
  };
}
