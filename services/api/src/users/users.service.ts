import crypto from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { RedisService } from '../redis/redis.service.js';
import { UserRepository } from './data/user.repository.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

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

@Injectable()
export class UsersService {
  private readonly userRepo: UserRepository;

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    userRepo?: UserRepository,
  ) {
    this.userRepo = userRepo ?? new UserRepository(this.db);
  }

  async updateUserProfile(userId: string, dto: UpdateProfileDto): Promise<UserSummary> {
    return this.userRepo.updateUserProfile(userId, {
      fullName: dto.fullName,
      defaultLanguage: dto.defaultLanguage,
      email: dto.email,
    });
  }

  async listUsers(
    options: { page?: number; limit?: number; role?: string; status?: string } = {},
  ): Promise<{ users: UserSummary[]; total: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    try {
      let query = `
        SELECT u.id, u.phone, u.email, u.full_name, u.status, u.default_language, u.created_at,
               COALESCE(json_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '[]') as roles
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
      `;

      const params: any[] = [];
      const conditions: string[] = [];

      if (options.status) {
        params.push(options.status);
        conditions.push(`u.status = $${params.length}`);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ` GROUP BY u.id ORDER BY u.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2};`;
      params.push(limit, offset);

      const res = await this.db.query(query, params);
      const countRes = await this.db.query(`SELECT COUNT(*) FROM users;`);

      const users: UserSummary[] = res.rows.map((row: any) => ({
        id: row.id,
        phone: row.phone,
        email: row.email,
        fullName: row.full_name,
        status: row.status,
        roles: Array.isArray(row.roles) ? row.roles : ['CUSTOMER'],
        defaultLanguage: row.default_language,
        createdAt: row.created_at,
      }));

      return {
        users,
        total: Number.parseInt(countRes.rows[0]?.count || '0', 10),
      };
    } catch (err: any) {
      throw new ServiceUnavailableException(`Database service unavailable: ${err?.message || err}`);
    }
  }

  async getUserById(id: string): Promise<UserSummary> {
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
        throw new NotFoundException(`User with ID ${id} not found.`);
      }

      const row = res.rows[0];
      return {
        id: row.id,
        phone: row.phone,
        email: row.email,
        fullName: row.full_name,
        status: row.status,
        roles: Array.isArray(row.roles) ? row.roles : ['CUSTOMER'],
        defaultLanguage: row.default_language,
        createdAt: row.created_at,
      };
    } catch (err: any) {
      if (err instanceof NotFoundException) throw err;
      throw new ServiceUnavailableException(`Database service unavailable: ${err?.message || err}`);
    }
  }

  async updateUserStatus(
    id: string,
    newStatus: string,
  ): Promise<{ success: boolean; id: string; status: string }> {
    const validStatuses = ['ACTIVE', 'SUSPENDED', 'BLOCKED', 'PENDING_VERIFICATION'];
    if (!validStatuses.includes(newStatus)) {
      throw new BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    await this.db.query(`UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2;`, [
      newStatus,
      id,
    ]);

    // Instantly update Redis blocklist (<1ms revocation)
    await this.redis.set(`user:status:${id}`, newStatus, 'EX', 86400);

    return {
      success: true,
      id,
      status: newStatus,
    };
  }

  async assignUserRole(
    userId: string,
    roleName: string,
  ): Promise<{ success: boolean; userId: string; role: string }> {
    const validRoles = [
      'CUSTOMER',
      'PARTNER',
      'MERCHANT',
      'ADMIN',
      'DRIVER',
      'RESTAURANT_OWNER',
      'STORE_MANAGER',
    ];
    if (!validRoles.includes(roleName)) {
      throw new BadRequestException(
        `Invalid role name '${roleName}'. Must be one of: ${validRoles.join(', ')}`,
      );
    }

    await this.db.transaction(async (client) => {
      const roleRes = await client.query(`SELECT id FROM roles WHERE name = $1;`, [roleName]);
      let roleId: string;
      if (roleRes.rows.length === 0) {
        const newRoleId = crypto.randomUUID();
        await client.query(`INSERT INTO roles (id, name) VALUES ($1, $2);`, [newRoleId, roleName]);
        roleId = newRoleId;
      } else {
        roleId = roleRes.rows[0].id;
      }

      await client.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
        [userId, roleId],
      );
    });

    return { success: true, userId, role: roleName };
  }

  async revokeUserRole(
    userId: string,
    roleName: string,
  ): Promise<{ success: boolean; userId: string; role: string }> {
    await this.db.transaction(async (client) => {
      const roleRes = await client.query(`SELECT id FROM roles WHERE name = $1;`, [roleName]);
      if (roleRes.rows.length > 0) {
        await client.query(`DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2;`, [
          userId,
          roleRes.rows[0].id,
        ]);
      }
    });

    return { success: true, userId, role: roleName };
  }
}
