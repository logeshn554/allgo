import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  type OnModuleInit,
  type OnModuleDestroy,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { ConfigService } from '../config/config.service.js';
import { LUA_RELEASE_LOCK, LUA_OTP_VERIFY } from './redis.lua.js';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected: boolean = false;
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
        this.logger.warn(`Redis connection error: ${err.message}`);
      });

      await this.client.connect().catch((err) => {
        this.isConnected = false;
        this.logger.warn(`Redis connection failed: ${err.message}. Runtime commands will fail fast.`);
      });
    } catch (err: any) {
      this.isConnected = false;
      this.logger.warn(`Redis initialization failed: ${err.message}.`);
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
      return { connected: false, latencyMs: 0, error: 'Redis client not connected (daemon offline)' };
    }
    try {
      const pong = await this.client.ping();
      return { connected: pong === 'PONG', latencyMs: Date.now() - start };
    } catch (err: any) {
      return { connected: false, latencyMs: Date.now() - start, error: err?.message || String(err) };
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.isConnected && this.config.isDevelopment) return this.mem.get(key) ?? null;
    return this.ensureConnected().get(key);
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<'OK' | null> {
    if (!this.isConnected && this.config.isDevelopment) {
      this.mem.set(key, value);
      return 'OK';
    }
    const client = this.ensureConnected();
    return mode === 'EX' && duration ? client.set(key, value, 'EX', duration) : client.set(key, value);
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    if (!this.isConnected && this.config.isDevelopment) {
      this.mem.set(key, value);
      return 'OK';
    }
    return this.ensureConnected().setex(key, seconds, value);
  }

  async del(key: string): Promise<number> {
    if (!this.isConnected && this.config.isDevelopment) return this.mem.delete(key) ? 1 : 0;
    return this.ensureConnected().del(key);
  }

  async exists(key: string): Promise<number> {
    if (!this.isConnected && this.config.isDevelopment) return this.mem.has(key) ? 1 : 0;
    return this.ensureConnected().exists(key);
  }

  async hset(key: string, field: string, value: any): Promise<number> {
    if (!this.isConnected && this.config.isDevelopment) {
      const obj = this.mem.get(key) || {};
      obj[field] = String(value);
      this.mem.set(key, obj);
      return 1;
    }
    return this.ensureConnected().hset(key, field, String(value));
  }

  async hget(key: string, field: string): Promise<string | null> {
    if (!this.isConnected && this.config.isDevelopment) {
      const obj = this.mem.get(key);
      return obj ? (obj[field] ?? null) : null;
    }
    return this.ensureConnected().hget(key, field);
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    if (!this.isConnected && this.config.isDevelopment) {
      const obj = this.mem.get(key) || {};
      const current = parseInt(obj[field] || '0', 10);
      obj[field] = String(current + increment);
      this.mem.set(key, obj);
      return current + increment;
    }
    return this.ensureConnected().hincrby(key, field, increment);
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (!this.isConnected && this.config.isDevelopment) return 1;
    return this.ensureConnected().expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    if (!this.isConnected && this.config.isDevelopment) return 60;
    return this.ensureConnected().ttl(key);
  }

  public getRawClient(): Redis {
    return this.ensureConnected();
  }

  async geoadd(key: string, longitude: number, latitude: number, member: string): Promise<number> {
    return this.ensureConnected().geoadd(key, longitude, latitude, member);
  }

  async georadius(key: string, longitude: number, latitude: number, radiusMeters: number, count: number = 20): Promise<string[]> {
    const client = this.ensureConnected();
    const results = await (client as any).georadius(key, longitude, latitude, radiusMeters, 'm', 'COUNT', count, 'ASC');
    if (!results || !Array.isArray(results)) return [];
    return results.map((r: any) => (Array.isArray(r) ? r[0] : r));
  }

  async zrem(key: string, member: string): Promise<number> {
    return this.ensureConnected().zrem(key, member);
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.ensureConnected().sadd(key, ...members);
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    return this.ensureConnected().srem(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return this.ensureConnected().smembers(key);
  }

  async sismember(key: string, member: string): Promise<number> {
    if (!this.isConnected && this.config.isDevelopment) {
      const set = this.mem.get(key);
      return set instanceof Set && set.has(member) ? 1 : 0;
    }
    return this.ensureConnected().sismember(key, member);
  }

  async publish(channel: string, message: string): Promise<number> {
    if (!this.isConnected && this.config.isDevelopment) return 1;
    return this.ensureConnected().publish(channel, message);
  }

  async sunion(...keys: string[]): Promise<string[]> {
    if (!keys || keys.length === 0) return [];
    return this.ensureConnected().sunion(...keys);
  }

  async acquireLock(key: string, value: string, ttlSeconds: number = 10): Promise<boolean> {
    const result = await this.ensureConnected().set(key, value, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async releaseLock(key: string, value: string): Promise<boolean> {
    const res = await this.ensureConnected().eval(LUA_RELEASE_LOCK, 1, key, value);
    return res === 1;
  }

  async evalLuaOtpVerify(key: string, expectedHmac: string, maxAttempts: number = 3): Promise<number> {
    if (!this.isConnected && this.config.isDevelopment) {
      const obj = this.mem.get(key);
      if (!obj) return -1;
      const attempts = parseInt(obj.attempts || '0', 10);
      if (attempts >= maxAttempts) { this.mem.delete(key); return -2; }
      if (obj.hmac === expectedHmac) { this.mem.delete(key); return 1; }
      obj.attempts = String(attempts + 1);
      if (attempts + 1 >= maxAttempts) { this.mem.delete(key); return -2; }
      this.mem.set(key, obj);
      return 0;
    }
    const res = await this.ensureConnected().eval(LUA_OTP_VERIFY, 1, key, expectedHmac, String(maxAttempts));
    return Number(res);
  }
}
