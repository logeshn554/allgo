// Job: Persist and load key-value data on phone disk with memory fallback.

const inMemoryStore = new Map<string, string>();

export function getLocalItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch (_e) {
    // Ignore and fallback to in-memory
  }
  return inMemoryStore.get(key) || null;
}

export function setLocalItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch (_e) {
    // Ignore and fallback
  }
  inMemoryStore.set(key, value);
}

export function removeLocalItem(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch (_e) {
    // Ignore
  }
  inMemoryStore.delete(key);
}
