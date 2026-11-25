import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  evaluateAuthoritativeAccess,
  type UserRole,
  type UserIdentity,
} from '@allgo/common';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { DatabaseService } from '../../database/database.service.js';
import { RedisService } from '../../redis/redis.service.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly db: DatabaseService,
    private readonly redis: RedisService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      throw new ForbiddenException('User context is missing');
    }

    // Role requested in header (e.g. X-AllGo-Role: PARTNER)
    const activeRoleHeader = (request.headers['x-allgo-role'] as string) || 'CUSTOMER';

    // 1. Fast Redis check for account block/suspension
    const cachedStatus = await this.redis.get(`user:status:${user.userId}`);
    if (cachedStatus === 'BLOCKED') {
      throw new ForbiddenException('ACCOUNT_BLOCKED');
    }
    if (cachedStatus === 'SUSPENDED') {
      throw new ForbiddenException('ACCOUNT_SUSPENDED');
    }

    // 2. Fetch authoritative identity and roles from Database
    let identity: UserIdentity;
    try {
      const userRes = await this.db.query(
        `SELECT u.id, u.phone, u.status, 
                COALESCE(json_agg(json_build_object('role', r.name, 'status', 'ACTIVE')) FILTER (WHERE r.name IS NOT NULL), '[]') as roles
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
         WHERE u.id = $1
         GROUP BY u.id;`,
        [user.userId]
      );

      if (userRes.rows.length === 0) {
        throw new ForbiddenException('User record not found in authoritative database');
      }

      const row = userRes.rows[0];
      const rawRoles = Array.isArray(row.roles) ? row.roles : [];
      const expandedRoles: any[] = [];
      for (const r of rawRoles) {
        expandedRoles.push(r);
        if (r.role === 'MERCHANT') {
          expandedRoles.push({ role: 'MERCHANT_ADMIN', status: r.status });
          expandedRoles.push({ role: 'MERCHANT_OPERATOR', status: r.status });
        }
        if (r.role === 'SUPER_ADMIN') {
          expandedRoles.push({ role: 'ADMIN', status: r.status });
        }
      }
      identity = {
        userId: row.id,
        phoneNumber: row.phone,
        accountStatus: row.status,
        roles: expandedRoles,
      };
    } catch (err: any) {
      if (err instanceof ForbiddenException) throw err;
      throw new ServiceUnavailableException(`Authoritative database is unavailable: ${err?.message || err}`);
    }

    // 3. Authoritatively evaluate access via common logic
    const decision = evaluateAuthoritativeAccess({
      identity,
      activeRoleContext: activeRoleHeader as UserRole,
      requiredRoles,
    });

    if (!decision.allowed) {
      throw new ForbiddenException(decision.reason || 'Insufficient privileges');
    }

    const requiresAdminAccess =
      activeRoleHeader === 'ADMIN' ||
      requiredRoles.some((role) => role === 'ADMIN' || role === 'SUPER_ADMIN');

    if (requiresAdminAccess) {
      const allowlistSchema = await this.db.query(
        "SELECT to_regclass('public.admin_identity_allowlist') IS NOT NULL AS enabled;",
      );
      if (allowlistSchema.rows[0]?.enabled) {
        const trustedAdmin = await this.db.query(
          `SELECT COUNT(DISTINCT a.identity_type)::int AS verified_identity_count
           FROM admin_identity_allowlist a
           JOIN users u ON u.id = a.user_id
           WHERE a.user_id = $1
             AND a.enabled = TRUE
             AND (
               (a.identity_type = 'PHONE' AND u.phone_verified = TRUE AND a.identity_value = u.phone)
               OR
               (a.identity_type = 'EMAIL' AND u.email_verified = TRUE
                 AND LOWER(a.identity_value) = LOWER(u.email))
             );`,
          [user.userId],
        );
        if (Number(trustedAdmin.rows[0]?.verified_identity_count || 0) !== 2) {
          throw new ForbiddenException(
            'Admin access requires both verified phone and email identifiers to be allowlisted for this existing account.',
          );
        }
      }
    }

    request.activeRole = decision.activeRole;
    return true;
  }
}

