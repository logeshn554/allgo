import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  type OnModuleInit,
  type OnModuleDestroy,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { ConfigService } from '../config/config.service.js';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected: boolean = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    try {
      this.client = new Redis(this.config.redisUrl, {
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
          if (times > 2) {
            return null; // Stop retrying quickly when Redis is offline
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
      return {
        connected: false,
        latencyMs: 0,
        error: 'Redis client not connected (daemon offline)',
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
    const client = this.ensureConnected();
    return client.get(key);
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<'OK' | null> {
    const client = this.ensureConnected();
    if (mode === 'EX' && duration) {
      return client.set(key, value, 'EX', duration);
    }
    return client.set(key, value);
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    const client = this.ensureConnected();
    return client.setex(key, seconds, value);
  }

  async del(key: string): Promise<number> {
    const client = this.ensureConnected();
    return client.del(key);
  }

  async exists(key: string): Promise<number> {
    const client = this.ensureConnected();
    return client.exists(key);
  }

  async hset(key: string, field: string, value: any): Promise<number> {
    const client = this.ensureConnected();
    return client.hset(key, field, String(value));
  }

  async hget(key: string, field: string): Promise<string | null> {
    const client = this.ensureConnected();
    return client.hget(key, field);
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    const client = this.ensureConnected();
    return client.hincrby(key, field, increment);
  }

  async expire(key: string, seconds: number): Promise<number> {
    const client = this.ensureConnected();
    return client.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    const client = this.ensureConnected();
    return client.ttl(key);
  }

  public getRawClient(): Redis {
    return this.ensureConnected();
  }

  async geoadd(key: string, longitude: number, latitude: number, member: string): Promise<number> {
    const client = this.ensureConnected();
    return client.geoadd(key, longitude, latitude, member);
  }

  async georadius(
    key: string,
    longitude: number,
    latitude: number,
    radiusMeters: number,
    count: number = 20
  ): Promise<string[]> {
    const client = this.ensureConnected();
    // ioredis georadius: key, lon, lat, radius, unit, WITHDIST, COUNT, ASC
    const results = await (client as any).georadius(
      key,
      longitude,
      latitude,
      radiusMeters,
      'm',
      'COUNT',
      count,
      'ASC'
    );
    if (!results || !Array.isArray(results)) return [];
    return results.map((r: any) => (Array.isArray(r) ? r[0] : r));
  }

  async zrem(key: string, member: string): Promise<number> {
    const client = this.ensureConnected();
    return client.zrem(key, member);
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    const client = this.ensureConnected();
    return client.sadd(key, ...members);
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    const client = this.ensureConnected();
    return client.srem(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    const client = this.ensureConnected();
    return client.smembers(key);
  }

  async sunion(...keys: string[]): Promise<string[]> {
    const client = this.ensureConnected();
    if (!keys || keys.length === 0) return [];
    return client.sunion(...keys);
  }

  /**
   * Distributed Lock Acquisition using atomic SET NX EX
   * Returns true if lock acquired, false if already claimed
   */
  async acquireLock(key: string, value: string, ttlSeconds: number = 10): Promise<boolean> {
    const client = this.ensureConnected();
    const result = await client.set(key, value, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  /**
   * Release distributed lock safely if and only if value matches
   */
  async releaseLock(key: string, value: string): Promise<boolean> {
    const client = this.ensureConnected();
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    const res = await client.eval(script, 1, key, value);
    return res === 1;
  }

  /**
   * Executes atomic Lua script via EVAL.
   * Fails explicitly if Redis is unavailable.
   */
  async evalLuaOtpVerify(
    key: string,
    expectedHmac: string,
    maxAttempts: number = 3
  ): Promise<number> {
    const client = this.ensureConnected();
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
    const res = await client.eval(script, 1, key, expectedHmac, String(maxAttempts));
    return Number(res);
  }
}
