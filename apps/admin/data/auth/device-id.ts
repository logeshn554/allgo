const DEVICE_ID_STORAGE_KEY = 'allgo_device_id';

export function getOrCreateWebDeviceId(): string {
  if (typeof window === 'undefined') return 'web_ssr';
  try {
    const existing = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existing && existing.trim()) {
      return existing.trim();
    }
    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? `web_${crypto.randomUUID()}`
        : `web_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
    window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, generated);
    return generated;
  } catch {
    return 'web_browser';
  }
}
