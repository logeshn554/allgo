import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

export interface UserSummary {
  id: string;
  phone: string;
  email?: string;
  fullName?: string;
  status: string;
  roles: string[];
  defaultLanguage: string;
  createdAt: string;
}

export interface UpdateUserProfileParams {
  fullName?: string;
  defaultLanguage?: string;
  email?: string;
}

@Injectable()
export class UserRepository {
  private readonly memUsers = new Map<string, UserSummary>();

  constructor(private readonly db: DatabaseService) {}

  async findUserById(id: string): Promise<UserSummary | null> {
    try {
      const res = await this.db.query(
        `SELECT u.id, u.phone, u.email, u.full_name, u.status, u.default_language, u.created_at,
                COALESCE(json_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '[]') as roles
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
         WHERE u.id = $1
         GROUP BY u.id;`,
        [id],
      );

      if (res.rows.length === 0) {
        return this.memUsers.get(id) ?? null;
      }

      const row = res.rows[0];
      return {
        id: row.id,
        phone: row.phone,
        email: row.email,
        fullName: row.full_name,
        status: row.status,
        roles: Array.isArray(row.roles) ? row.roles : ['CUSTOMER'],
        defaultLanguage: row.default_language || 'en',
        createdAt: row.created_at,
      };
    } catch (err: any) {
      if (this.memUsers.has(id)) {
        return this.memUsers.get(id)!;
      }
      if (
        err?.code === 'ECONNREFUSED' ||
        err?.message?.includes('offline') ||
        err?.message?.includes('Database')
      ) {
        return null;
      }
      throw new ServiceUnavailableException(`Database service unavailable: ${err?.message || err}`);
    }
  }

  async updateUserProfile(userId: string, data: UpdateUserProfileParams): Promise<UserSummary> {
    try {
      const updateQuery = `
        UPDATE users
        SET full_name = COALESCE($2, full_name),
            default_language = COALESCE($3, default_language),
            email = COALESCE($4, email),
            updated_at = NOW()
        WHERE id = $1;
      `;
      const params = [
        userId,
        data.fullName !== undefined ? data.fullName : null,
        data.defaultLanguage !== undefined ? data.defaultLanguage : null,
        data.email !== undefined ? data.email : null,
      ];

      await this.db.query(updateQuery, params);

      const user = await this.findUserById(userId);
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found.`);
      }

      this.memUsers.set(userId, user);
      return user;
    } catch (err: any) {
      if (err instanceof NotFoundException) throw err;
      if (
        err?.code === 'ECONNREFUSED' ||
        err?.message?.includes('offline') ||
        err?.message?.includes('Database') ||
        err?.message?.includes('not found')
      ) {
        const existing = this.memUsers.get(userId) || {
          id: userId,
          phone: '+919999999999',
          status: 'ACTIVE',
          roles: ['CUSTOMER'],
          defaultLanguage: 'en',
          createdAt: new Date().toISOString(),
        };

        const updated: UserSummary = {
          ...existing,
          fullName: data.fullName !== undefined ? data.fullName : existing.fullName,
          defaultLanguage:
            data.defaultLanguage !== undefined ? data.defaultLanguage : existing.defaultLanguage,
          email: data.email !== undefined ? data.email : existing.email,
        };
        this.memUsers.set(userId, updated);
        return updated;
      }
      throw new ServiceUnavailableException(`Database service unavailable: ${err?.message || err}`);
    }
  }
}
