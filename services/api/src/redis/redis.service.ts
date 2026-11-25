import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { ConfigService } from '../config/config.service.js';
import { LUA_OTP_VERIFY, LUA_RELEASE_LOCK } from './redis.lua.js';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;
  private readonly mem = new Map<string, any>();

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    try {
      this.client = new Redis(this.config.redisUrl, {
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => (times > 2 ? null : 500),
        lazyConnect: true,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log('Redis connected successfully.');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(
          `Redis connection error: ${err.message}. Falling back to in-memory store.`,
        );
      });

      await this.client.connect().catch((err) => {
        this.isConnected = false;
        this.logger.warn(
          `Redis connection failed: ${err.message}. Falling back to in-memory store.`,
        );
      });
    } catch (err: any) {
      this.isConnected = false;
      this.logger.warn(
        `Redis initialization failed: ${err.message}. Falling back to in-memory store.`,
      );
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

  private ensureConnected(): Redis {
    if (!this.client || !this.isConnected) {
      throw new ServiceUnavailableException('Redis cache service is unavailable');
    }
    return this.client;
  }

  async checkConnection(): Promise<{ connected: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    if (!this.client || !this.isConnected) {
      return {
        connected: false,
        latencyMs: 0,
        error: 'Redis client not connected (using in-memory fallback)',
      };
    }
    try {
      const pong = await this.client.ping();
      return { connected: pong === 'PONG', latencyMs: Date.now() - start };
    } catch (err: any) {
      return {
        connected: false,
        latencyMs: Date.now() - start,
        error: err?.message || String(err),
      };
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.isConnected) return this.mem.get(key) ?? null;
    return this.ensureConnected().get(key);
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<'OK' | null> {
    if (!this.isConnected) {
      this.mem.set(key, value);
      if (mode === 'EX' && duration) {
        setTimeout(() => this.mem.delete(key), duration * 1000).unref();
      }
      return 'OK';
    }
    const client = this.ensureConnected();
    return mode === 'EX' && duration
      ? client.set(key, value, 'EX', duration)
      : client.set(key, value);
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    if (!this.isConnected) {
      this.mem.set(key, value);
      setTimeout(() => this.mem.delete(key), seconds * 1000).unref();
      return 'OK';
    }
    return this.ensureConnected().setex(key, seconds, value);
  }

  async del(key: string): Promise<number> {
    if (!this.isConnected) return this.mem.delete(key) ? 1 : 0;
    return this.ensureConnected().del(key);
  }

  async exists(key: string): Promise<number> {
    if (!this.isConnected) return this.mem.has(key) ? 1 : 0;
    return this.ensureConnected().exists(key);
  }

  async hset(key: string, field: string, value: any): Promise<number> {
    if (!this.isConnected) {
      const obj = this.mem.get(key) || {};
      obj[field] = String(value);
      this.mem.set(key, obj);
      return 1;
    }
    return this.ensureConnected().hset(key, field, String(value));
  }

  async hget(key: string, field: string): Promise<string | null> {
    if (!this.isConnected) {
      const obj = this.mem.get(key);
      return obj ? (obj[field] ?? null) : null;
    }
    return this.ensureConnected().hget(key, field);
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    if (!this.isConnected) {
      const obj = this.mem.get(key) || {};
      const current = Number.parseInt(obj[field] || '0', 10);
      obj[field] = String(current + increment);
      this.mem.set(key, obj);
      return current + increment;
    }
    return this.ensureConnected().hincrby(key, field, increment);
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (!this.isConnected) {
      if (!this.mem.has(key)) return 0;
      setTimeout(() => this.mem.delete(key), seconds * 1000).unref();
      return 1;
    }
    return this.ensureConnected().expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    if (!this.isConnected) return 60;
    return this.ensureConnected().ttl(key);
  }

  public getRawClient(): Redis {
    return this.ensureConnected();
  }

  async geoadd(key: string, longitude: number, latitude: number, member: string): Promise<number> {
    if (!this.isConnected) return 1;
    return this.ensureConnected().geoadd(key, longitude, latitude, member);
  }

  async georadius(
    key: string,
    longitude: number,
    latitude: number,
    radiusMeters: number,
    count = 20,
  ): Promise<string[]> {
    if (!this.isConnected) return [];
    const client = this.ensureConnected();
    const results = await (client as any).georadius(
      key,
      longitude,
      latitude,
      radiusMeters,
      'm',
      'COUNT',
      count,
      'ASC',
    );
    if (!results || !Array.isArray(results)) return [];
    return results.map((r: any) => (Array.isArray(r) ? r[0] : r));
  }

  async zrem(key: string, member: string): Promise<number> {
    if (!this.isConnected) return 1;
    return this.ensureConnected().zrem(key, member);
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    if (!this.isConnected) {
      let set = this.mem.get(key);
      if (!(set instanceof Set)) {
        set = new Set<string>();
        this.mem.set(key, set);
      }
      let added = 0;
      for (const m of members) {
        if (!set.has(m)) {
          set.add(m);
          added++;
        }
      }
      return added;
    }
    return this.ensureConnected().sadd(key, ...members);
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    if (!this.isConnected) {
      const set = this.mem.get(key);
      if (!(set instanceof Set)) return 0;
      let removed = 0;
      for (const m of members) {
        if (set.delete(m)) removed++;
      }
      return removed;
    }
    return this.ensureConnected().srem(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    if (!this.isConnected) {
      const set = this.mem.get(key);
      return set instanceof Set ? Array.from(set) : [];
    }
    return this.ensureConnected().smembers(key);
  }

  async sismember(key: string, member: string): Promise<number> {
    if (!this.isConnected) {
      const set = this.mem.get(key);
      return set instanceof Set && set.has(member) ? 1 : 0;
    }
    return this.ensureConnected().sismember(key, member);
  }

  async publish(channel: string, message: string): Promise<number> {
    if (!this.isConnected) return 1;
    return this.ensureConnected().publish(channel, message);
  }

  async sunion(...keys: string[]): Promise<string[]> {
    if (!this.isConnected) {
      const result = new Set<string>();
      for (const k of keys) {
        const s = this.mem.get(k);
        if (s instanceof Set) {
          for (const item of s) result.add(item);
        }
      }
      return Array.from(result);
    }
    if (!keys || keys.length === 0) return [];
    return this.ensureConnected().sunion(...keys);
  }

  async acquireLock(key: string, value: string, ttlSeconds = 10): Promise<boolean> {
    if (!this.isConnected) {
      if (this.mem.has(key)) return false;
      this.mem.set(key, value);
      setTimeout(() => {
        if (this.mem.get(key) === value) this.mem.delete(key);
      }, ttlSeconds * 1000).unref();
      return true;
    }
    const result = await this.ensureConnected().set(key, value, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async releaseLock(key: string, value: string): Promise<boolean> {
    if (!this.isConnected) {
      if (this.mem.get(key) === value) {
        this.mem.delete(key);
        return true;
      }
      return false;
    }
    const res = await this.ensureConnected().eval(LUA_RELEASE_LOCK, 1, key, value);
    return res === 1;
  }

  async evalLuaOtpVerify(key: string, expectedHmac: string, maxAttempts = 3): Promise<number> {
    if (!this.isConnected) {
      const obj = this.mem.get(key);
      if (!obj) return -1;
      const attempts = Number.parseInt(obj.attempts || '0', 10);
      if (attempts >= maxAttempts) {
        this.mem.delete(key);
        return -2;
      }
      if (obj.hmac === expectedHmac) {
        this.mem.delete(key);
        return 1;
      }
      obj.attempts = String(attempts + 1);
      if (attempts + 1 >= maxAttempts) {
        this.mem.delete(key);
        return -2;
      }
      this.mem.set(key, obj);
      return 0;
    }
    const res = await this.ensureConnected().eval(
      LUA_OTP_VERIFY,
      1,
      key,
      expectedHmac,
      String(maxAttempts),
    );
    return Number(res);
  }
}
