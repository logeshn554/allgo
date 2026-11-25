export const SESSION_COOKIE_NAME = 'allgo_admin_token';

export function parseDeviceName(
  userAgent?: string | null,
  platform?: string | null,
): string {
  const ua = (userAgent || '').trim();
  if (!ua) {
    if (platform === 'ANDROID') return 'Android Device';
    if (platform === 'IOS') return 'iOS Device';
    return 'Web Browser';
  }

  let browser = '';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';
  else if (/Dart|Flutter|AllGo/i.test(ua)) browser = 'AllGo App';
  else if (/curl/i.test(ua)) browser = 'cURL';
  else if (/Postman/i.test(ua)) browser = 'Postman';

  let os = '';
  if (/iPhone/i.test(ua)) os = 'iPhone';
  else if (/iPad/i.test(ua)) os = 'iPad';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Linux/i.test(ua)) os = 'Linux';

  if (browser && os) return `${browser} on ${os}`;
  if (browser) return browser;
  if (os) return `${os} Device`;
  return ua.slice(0, 80);
}

export function extractCookie(
  cookieHeader: string | undefined,
  name: string,
): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim();
    if (key === name) {
      const raw = part.slice(eqIdx + 1).trim();
      if (!raw) return null;
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    }
  }
  return null;
}
