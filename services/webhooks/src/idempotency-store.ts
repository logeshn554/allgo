export interface IdempotencyStore {
  setIfNotExists(key: string, value: string, ttlSeconds: number): Promise<boolean>;
  get(key: string): Promise<string | null>;
}

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly store = new Map<string, { value: string; expiresAt: number }>();

  async setIfNotExists(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const now = Date.now();
    const existing = this.store.get(key);
    if (existing && existing.expiresAt > now) {
      return false;
    }
    this.store.set(key, { value, expiresAt: now + ttlSeconds * 1000 });
    return true;
  }

  async get(key: string): Promise<string | null> {
    const existing = this.store.get(key);
    if (!existing) return null;
    if (existing.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return existing.value;
  }
}
