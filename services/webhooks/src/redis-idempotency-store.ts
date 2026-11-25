import type { IdempotencyStore } from './idempotency-store.js';

export interface RedisClientLike {
  set(key: string, value: string, ...args: any[]): Promise<any>;
  get(key: string): Promise<string | null>;
}

export class RedisIdempotencyStore implements IdempotencyStore {
  constructor(private readonly redis: RedisClientLike) {}

  async setIfNotExists(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const res = await this.redis.set(key, value, 'EX', ttlSeconds, 'NX');
    return res === 'OK' || res === 1 || res === true;
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }
}
