import type { DispatchStore } from './dispatch-engine.js';
import type { DispatchOffer, DispatchRequest } from './types.js';

export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: any[]): Promise<any>;
  hset?(key: string, field: string, value: string): Promise<any>;
  hget?(key: string, field: string): Promise<string | null>;
  keys?(pattern: string): Promise<string[]>;
}

export class RedisDispatchStore implements DispatchStore {
  constructor(private readonly redis: RedisLike) {}

  async saveOffer(offer: DispatchOffer): Promise<void> {
    const key = `dispatch:offer:${offer.attemptId}`;
    await this.redis.set(key, JSON.stringify(offer), 'EX', 3600);
  }

  async getOffer(attemptId: string): Promise<DispatchOffer | null> {
    const key = `dispatch:offer:${attemptId}`;
    const raw = await this.redis.get(key);
    return raw ? JSON.parse(raw) : null;
  }

  async updateOfferStatus(attemptId: string, status: DispatchOffer['status']): Promise<DispatchOffer> {
    const existing = await this.getOffer(attemptId);
    if (!existing) throw new Error(`Offer ${attemptId} not found in store`);
    existing.status = status;
    await this.saveOffer(existing);
    return existing;
  }

  async saveJob(job: DispatchRequest): Promise<void> {
    const key = `dispatch:job:${job.jobId}`;
    await this.redis.set(key, JSON.stringify(job), 'EX', 86400);
  }

  async getJob(jobId: string): Promise<DispatchRequest | null> {
    const key = `dispatch:job:${jobId}`;
    const raw = await this.redis.get(key);
    return raw ? JSON.parse(raw) : null;
  }

  async getPendingOffersCount(): Promise<number> {
    if (!this.redis.keys) return 0;
    try {
      const keys = await this.redis.keys('dispatch:offer:*');
      let count = 0;
      const now = Date.now();
      for (const k of keys) {
        const raw = await this.redis.get(k);
        if (raw) {
          const offer: DispatchOffer = JSON.parse(raw);
          if (offer.status === 'PENDING' && new Date(offer.offerExpiresAt).getTime() >= now) {
            count++;
          }
        }
      }
      return count;
    } catch {
      return 0;
    }
  }
}
