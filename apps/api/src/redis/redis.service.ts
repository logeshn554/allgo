import { Injectable, Logger, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ConfigService } from '../config/config.service.ts';

export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected: boolean = false;

  // In-memory fallback challenge and cache store when local Redis daemon is offline
  private inMemoryStore = new Map<string, { value: any; expiresAt?: number }>();
  private inMemoryHashes = new Map<string, Map<string, any>>();

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    try {
      this.client = new Redis(this.config.redisUrl, {
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
          if (times > 2) {
            return null; // Stop retrying quickly in local dev without Redis
          }
          return 500;
        },
        lazyConnect: true,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log('Redis connected successfully.');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        // Keep log quiet for standard local dev when Redis is offline
        this.logger.debug(`Redis connection state: ${err.message}`);
      });

      await this.client.connect().catch((_err) => {
        this.logger.warn(`Redis server not available at ${this.config.redisUrl}. Using local dev in-memory fallback.`);
      });
    } catch (err: any) {
      this.logger.warn(`Redis initialization failed: ${err.message}. Local in-memory fallback active.`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => {});
      this.logger.log('Redis connection closed.');
    }
  }

  get isLive(): boolean {
    return this.isConnected && this.client?.status === 'ready';
  }

  async checkConnection(): Promise<{ connected: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    if (!this.client || !this.isConnected) {
      return {
        connected: false,
        latencyMs: Date.now() - start,
        error: 'Redis client not connected to live daemon (operating in local fallback mode)',
      };
    }

    try {
      const pong = await this.client.ping();
      return {
        connected: pong === 'PONG',
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        connected: false,
        latencyMs: Date.now() - start,
        error: err?.message || String(err),
      };
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.isLive && this.client) {
      return this.client.get(key);
    }
    const item = this.inMemoryStore.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.inMemoryStore.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<'OK' | null> {
    if (this.isLive && this.client) {
      if (mode === 'EX' && duration) {
        return this.client.set(key, value, 'EX', duration);
      }
      return this.client.set(key, value);
    }
    const expiresAt = mode === 'EX' && duration ? Date.now() + duration * 1000 : undefined;
    this.inMemoryStore.set(key, { value, expiresAt });
    return 'OK';
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    if (this.isLive && this.client) {
      return this.client.setex(key, seconds, value);
    }
    this.inMemoryStore.set(key, { value, expiresAt: Date.now() + seconds * 1000 });
    return 'OK';
  }

  async del(key: string): Promise<number> {
    if (this.isLive && this.client) {
      return this.client.del(key);
    }
    const existed = this.inMemoryStore.delete(key) || this.inMemoryHashes.delete(key);
    return existed ? 1 : 0;
  }

  async exists(key: string): Promise<number> {
    if (this.isLive && this.client) {
      return this.client.exists(key);
    }
    if (this.inMemoryHashes.has(key)) return 1;
    const item = this.inMemoryStore.get(key);
    if (!item) return 0;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.inMemoryStore.delete(key);
      return 0;
    }
    return 1;
  }

  async hset(key: string, field: string, value: any): Promise<number> {
    if (this.isLive && this.client) {
      return this.client.hset(key, field, String(value));
    }
    let map = this.inMemoryHashes.get(key);
    if (!map) {
      map = new Map();
      this.inMemoryHashes.set(key, map);
    }
    const isNew = !map.has(field);
    map.set(field, String(value));
    return isNew ? 1 : 0;
  }

  async hget(key: string, field: string): Promise<string | null> {
    if (this.isLive && this.client) {
      return this.client.hget(key, field);
    }
    const map = this.inMemoryHashes.get(key);
    if (!map) return null;
    return map.get(field) ?? null;
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    if (this.isLive && this.client) {
      return this.client.hincrby(key, field, increment);
    }
    let map = this.inMemoryHashes.get(key);
    if (!map) {
      map = new Map();
      this.inMemoryHashes.set(key, map);
    }
    const current = parseInt(map.get(field) || '0', 10);
    const updated = current + increment;
    map.set(field, String(updated));
    return updated;
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (this.isLive && this.client) {
      return this.client.expire(key, seconds);
    }
    return 1;
  }

  /**
   * Executes atomic Lua script.
   * If live Redis is connected, delegates to EVAL.
   * If in local development fallback mode, evaluates the atomic OTP challenge semantics directly.
   */
  async evalLuaOtpVerify(
    key: string,
    expectedHmac: string,
    maxAttempts: number = 3
  ): Promise<number> {
    if (this.isLive && this.client) {
      const script = `
        local exists = redis.call('EXISTS', KEYS[1])
        if exists == 0 then return -1 end
        local attempts = tonumber(redis.call('HGET', KEYS[1], 'attempts') or '0')
        local max_attempts = tonumber(ARGV[2])
        if attempts >= max_attempts then
            redis.call('DEL', KEYS[1])
            return -2
        end
        local stored_hmac = redis.call('HGET', KEYS[1], 'hmac')
        if stored_hmac == ARGV[1] then
            redis.call('DEL', KEYS[1])
            return 1
        else
            local new_attempts = redis.call('HINCRBY', KEYS[1], 'attempts', 1)
            if new_attempts >= max_attempts then
                redis.call('DEL', KEYS[1])
                return -2
            end
            return 0
        end
      `;
      const res = await this.client.eval(script, 1, key, expectedHmac, String(maxAttempts));
      return Number(res);
    }

    // In-Memory atomic evaluation (exact Lua contract replica)
    const map = this.inMemoryHashes.get(key);
    if (!map) {
      return -1; // Not found / expired
    }

    const attempts = parseInt(map.get('attempts') || '0', 10);
    if (attempts >= maxAttempts) {
      this.inMemoryHashes.delete(key);
      return -2; // Max attempts exceeded
    }

    const storedHmac = map.get('hmac');
    if (storedHmac === expectedHmac) {
      this.inMemoryHashes.delete(key);
      return 1; // Success & atomic consumption!
    } else {
      const newAttempts = attempts + 1;
      map.set('attempts', String(newAttempts));
      if (newAttempts >= maxAttempts) {
        this.inMemoryHashes.delete(key);
        return -2; // Lockout
      }
      return 0; // Mismatch
    }
  }
}

Injectable()(RedisService);
