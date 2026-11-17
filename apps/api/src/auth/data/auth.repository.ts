import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import crypto from 'node:crypto';
import { DatabaseService } from '../../database/database.service.js';

export interface UserEntity {
  id: string;
  phone: string;
  status: string;
  roles: string[];
  defaultLanguage: string;
}

@Injectable()
export class AuthRepository {
  private readonly memUsers = new Map<string, UserEntity>();
  private readonly memDevices = new Map<string, { refresh_token_hash: string }>();

  constructor(private readonly db: DatabaseService) {}

  async findUserByPhone(phone: string): Promise<UserEntity | null> {
    try {
      const existing = await this.db.query(
        `SELECT u.id, u.phone, u.status, u.default_language,
                COALESCE(json_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '["CUSTOMER"]') as roles
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
         WHERE u.phone = $1
         GROUP BY u.id;`,
        [phone]
      );

      if (existing.rows.length > 0) {
        const row = existing.rows[0];
        return {
          id: row.id,
          phone: row.phone,
          status: row.status,
          roles: Array.isArray(row.roles) ? row.roles : ['CUSTOMER'],
          defaultLanguage: row.default_language || 'en',
        };
      }
      return null;
    } catch (err: any) {
      const memUser = this.memUsers.get(phone);
      if (memUser) return memUser;
      if (err?.code === 'ECONNREFUSED' || err?.message?.includes('offline') || err?.message?.includes('Database')) {
        return null;
      }
      throw new ServiceUnavailableException(`Database service is unavailable: ${err?.message || err}`);
    }
  }

  async findUserById(userId: string): Promise<UserEntity | null> {
    try {
      const res = await this.db.query(
        `SELECT u.id, u.phone, u.status, u.default_language,
                COALESCE(json_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '["CUSTOMER"]') as roles
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
         WHERE u.id = $1
         GROUP BY u.id;`,
        [userId]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          id: row.id,
          phone: row.phone,
          status: row.status,
          roles: Array.isArray(row.roles) ? row.roles : ['CUSTOMER'],
          defaultLanguage: row.default_language || 'en',
        };
      }
      return null;
    } catch (err: any) {
      for (const u of this.memUsers.values()) {
        if (u.id === userId) return u;
      }
      if (err?.code === 'ECONNREFUSED' || err?.message?.includes('offline') || err?.message?.includes('Database')) {
        return null;
      }
      throw new ServiceUnavailableException(`Database service is unavailable: ${err?.message || err}`);
    }
  }

  async createUserWithCustomerRole(phone: string): Promise<UserEntity> {
    try {
      const newUserId = crypto.randomUUID();
      const firebaseUid = `local_${newUserId}`;

      await this.db.transaction(async (client) => {
        await client.query(
          `INSERT INTO users (id, phone, status, firebase_uid, default_language)
           VALUES ($1, $2, 'ACTIVE', $3, 'en');`,
          [newUserId, phone, firebaseUid]
        );

        let roleRes = await client.query(`SELECT id FROM roles WHERE name = 'CUSTOMER';`);
        let roleId: string;
        if (roleRes.rows.length === 0) {
          const newRoleId = crypto.randomUUID();
          await client.query(
            `INSERT INTO roles (id, name, description) VALUES ($1, 'CUSTOMER', 'Default Customer Role');`,
            [newRoleId]
          );
          roleId = newRoleId;
        } else {
          roleId = roleRes.rows[0].id;
        }

        await client.query(
          `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
          [newUserId, roleId]
        );
      });

      const user: UserEntity = {
        id: newUserId,
        phone,
        status: 'ACTIVE',
        roles: ['CUSTOMER'],
        defaultLanguage: 'en',
      };
      this.memUsers.set(phone, user);
      return user;
    } catch (err: any) {
      const newUserId = crypto.randomUUID();
      const user: UserEntity = {
        id: newUserId,
        phone,
        status: 'ACTIVE',
        roles: ['CUSTOMER'],
        defaultLanguage: 'en',
      };
      this.memUsers.set(phone, user);
      return user;
    }
  }

  async getDeviceSession(userId: string, deviceId: string): Promise<{ refresh_token_hash: string } | null> {
    try {
      const deviceRes = await this.db.query(
        `SELECT refresh_token_hash FROM devices WHERE user_id = $1 AND device_id = $2;`,
        [userId, deviceId]
      );
      if (deviceRes.rows.length === 0) {
        return null;
      }
      return deviceRes.rows[0];
    } catch {
      return this.memDevices.get(`${userId}:${deviceId}`) ?? null;
    }
  }

  async recordDeviceSession(userId: string, deviceId: string, platform: string, refreshToken: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    try {
      await this.db.query(
        `INSERT INTO devices (user_id, device_id, platform, refresh_token_hash, last_active_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (user_id, device_id)
         DO UPDATE SET refresh_token_hash = $4, last_active_at = NOW();`,
        [userId, deviceId, platform, tokenHash]
      );
    } catch {
      this.memDevices.set(`${userId}:${deviceId}`, { refresh_token_hash: tokenHash });
    }
  }

  async deleteDeviceSession(userId: string, deviceId?: string): Promise<void> {
    try {
      if (deviceId) {
        await this.db.query('DELETE FROM devices WHERE user_id = $1 AND device_id = $2;', [userId, deviceId]);
      } else {
        await this.db.query('DELETE FROM devices WHERE user_id = $1;', [userId]);
      }
    } catch {
      if (deviceId) {
        this.memDevices.delete(`${userId}:${deviceId}`);
      } else {
        for (const key of Array.from(this.memDevices.keys())) {
          if (key.startsWith(`${userId}:`)) {
            this.memDevices.delete(key);
          }
        }
      }
    }
  }
}
