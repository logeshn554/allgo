// Job: Save and load data on the device so it survives app restarts.

const memoryBackup = new Map<string, string>();

function getStorage(): Storage | null {
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
    return globalThis.localStorage;
  }
  return null;
}

export function saveToCache<T>(key: string, value: T): void {
  try {
    const raw = JSON.stringify(value);
    const storage = getStorage();
    if (storage) {
      storage.setItem(key, raw);
    } else {
      memoryBackup.set(key, raw);
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function loadFromCache<T>(key: string, fallback: T): T {
  try {
    const storage = getStorage();
    const raw = storage ? storage.getItem(key) : memoryBackup.get(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function removeFromCache(key: string): void {
  const storage = getStorage();
  if (storage) {
    storage.removeItem(key);
  }
  memoryBackup.delete(key);
}
