import { Injectable, Logger, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import pg from 'pg';
import { ConfigService } from '../config/config.service.js';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: pg.Pool | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const isSsl = this.config.databaseUrl.includes('sslmode=') || this.config.databaseUrl.includes('neon.tech');
    this.pool = new pg.Pool({
      connectionString: this.config.databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: isSsl ? { rejectUnauthorized: false } : undefined,
    });

    this.pool.on('error', (err) => {
      this.logger.warn(`PostgreSQL Pool Background Error: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
      this.logger.log('PostgreSQL connection pool closed.');
    }
  }

  getPool(): pg.Pool {
    if (!this.pool) {
      throw new Error('Database pool has not been initialized.');
    }
    return this.pool;
  }

  async query<T extends pg.QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<pg.QueryResult<T>> {
    const pool = this.getPool();
    const start = Date.now();
    try {
      const res = await pool.query<T>(text, params);
      const duration = Date.now() - start;
      if (duration > 1000) {
        this.logger.warn(`Slow Query (${duration}ms): [SQL: ${text.slice(0, 100)}]`);
      }
      return res;
    } catch (err: any) {
      this.logger.error(`Database Query Error: ${err.message} [SQL: ${text.slice(0, 100)}]`);
      throw err;
    }
  }

  async transaction<T>(callback: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const pool = this.getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async checkConnection(): Promise<{ connected: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      if (!this.pool) {
        return {
          connected: false,
          latencyMs: 0,
          error: 'Database connection pool not initialized (Docker/PostgreSQL offline)',
        };
      }
      const pool = this.getPool();
      await pool.query('SELECT 1;');
      return {
        connected: true,
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
}
