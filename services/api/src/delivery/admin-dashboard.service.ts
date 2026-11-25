import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { HealthService } from '../health/health.service.js';
import { RedisService } from '../redis/redis.service.js';

@Injectable()
export class AdminDashboardService {
  private readonly logger = new Logger(AdminDashboardService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly healthService: HealthService,
  ) {}

  async getSummary(): Promise<any> {
    let totalUsers = 0;
    let newUsersToday = 0;
    let activeCouriersAndDrivers = 0;
    let onlinePartners = 0;
    let liveMerchantOutlets = 0;
    let activeZonesCount = 0;
    let todayOrdersCount = 0;
    let todayGmvInr = 0;

    try {
      const userStats = await this.db.query(`
        SELECT
          COUNT(*)::int AS total_users,
          COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END)::int AS new_today
        FROM users;
      `);
      if (userStats.rows.length > 0) {
        totalUsers = Number(userStats.rows[0].total_users || 0);
        newUsersToday = Number(userStats.rows[0].new_today || 0);
      }
    } catch (err: any) {
      this.logger.warn(`Failed to fetch user stats: ${err.message}`);
    }

    try {
      const partnerStats = await this.db.query(`
        SELECT
          COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END)::int AS active_partners,
          COUNT(CASE WHEN is_online = true THEN 1 END)::int AS online_partners
        FROM partners;
      `);
      if (partnerStats.rows.length > 0) {
        activeCouriersAndDrivers = Number(partnerStats.rows[0].active_partners || 0);
        onlinePartners = Number(partnerStats.rows[0].online_partners || 0);
      }
    } catch (err: any) {
      this.logger.warn(`Failed to fetch partner stats: ${err.message}`);
    }

    try {
      const outletStats = await this.db.query(`
        SELECT COUNT(*)::int AS live_outlets
        FROM outlets
        WHERE outlet_status = 'ACTIVE';
      `);
      if (outletStats.rows.length > 0) {
        liveMerchantOutlets = Number(outletStats.rows[0].live_outlets || 0);
      }
    } catch (err: any) {
      this.logger.warn(`Failed to fetch outlet stats: ${err.message}`);
    }

    try {
      const zoneStats = await this.db.query(`
        SELECT COUNT(*)::int AS active_zones
        FROM zones
        WHERE is_active = true;
      `);
      if (zoneStats.rows.length > 0) {
        activeZonesCount = Number(zoneStats.rows[0].active_zones || 0);
      }
    } catch (err: any) {
      this.logger.warn(`Failed to fetch zone stats: ${err.message}`);
    }

    try {
      const orderStats = await this.db.query(`
        SELECT
          COUNT(*)::int AS today_orders,
          COALESCE(SUM(total_amount_inr), 0)::numeric AS today_gmv
        FROM orders
        WHERE created_at >= CURRENT_DATE
          AND status NOT IN ('CANCELLED', 'FAILED');
      `);
      if (orderStats.rows.length > 0) {
        todayOrdersCount = Number(orderStats.rows[0].today_orders || 0);
        todayGmvInr = Number(orderStats.rows[0].today_gmv || 0);
      }
    } catch (err: any) {
      this.logger.warn(`Failed to fetch order stats: ${err.message}`);
    }

    const healthReport = await this.healthService.checkHealth().catch(() => ({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      services: {
        postgres: { status: 'down', latencyMs: -1 },
        redis: { status: 'down', latencyMs: -1 },
      },
    }));

    return {
      totalUsers,
      newUsersToday,
      activeCouriersAndDrivers,
      onlinePartners,
      liveMerchantOutlets,
      activeZonesCount,
      todayOrdersCount,
      todayGmvInr,
      infrastructure: {
        postgres: {
          status: healthReport.services.postgres.status,
          latencyMs: healthReport.services.postgres.latencyMs,
          details:
            healthReport.services.postgres.status === 'up'
              ? `PostgreSQL 16 + PostGIS 3.4 (Latency: ${healthReport.services.postgres.latencyMs}ms)`
              : 'PostgreSQL disconnected',
        },
        redis: {
          status: healthReport.services.redis.status,
          latencyMs: healthReport.services.redis.latencyMs,
          details:
            healthReport.services.redis.status === 'up'
              ? `Redis 7.0 Alpine (Latency: ${healthReport.services.redis.latencyMs}ms)`
              : 'Redis disconnected',
        },
        apiGateway: {
          status: 'up',
          uptimeSeconds: healthReport.uptimeSeconds,
          environment: healthReport.environment,
        },
      },
    };
  }
}
