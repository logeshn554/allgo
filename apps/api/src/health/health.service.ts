import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { RedisService } from '../redis/redis.service.js';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  services: {
    postgres: {
      status: 'up' | 'down';
      latencyMs: number;
      error?: string;
    };
    redis: {
      status: 'up' | 'down';
      latencyMs: number;
      error?: string;
    };
  };
}

@Injectable()
export class HealthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService
  ) {}

  async checkHealth(): Promise<HealthCheckResult> {
    const [dbResult, redisResult] = await Promise.all([
      this.db.checkConnection(),
      this.redis.checkConnection(),
    ]);

    const isPostgresUp = dbResult.connected;
    const isRedisLive = redisResult.connected;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (!isPostgresUp && !isRedisLive) {
      overallStatus = 'unhealthy';
    } else if (!isPostgresUp || !isRedisLive) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      services: {
        postgres: {
          status: isPostgresUp ? 'up' : 'down',
          latencyMs: dbResult.latencyMs,
          error: dbResult.error,
        },
        redis: {
          status: isRedisLive ? 'up' : 'down',
          latencyMs: redisResult.latencyMs,
          error: redisResult.error,
        },
      },
    };
  }
}
