import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  evaluateAuthoritativeAccess,
  UserRole,
  UserIdentity,
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
        // Fallback to token payload if DB is in disconnected dev mode
        identity = {
          userId: user.userId,
          phoneNumber: user.phone || '+919999999999',
          accountStatus: user.status || 'ACTIVE',
          roles: (user.roles || ['CUSTOMER']).map((r: string) => ({
            role: r as UserRole,
            status: 'ACTIVE',
          })),
        };
      } else {
        const row = userRes.rows[0];
        identity = {
          userId: row.id,
          phoneNumber: row.phone,
          accountStatus: row.status,
          roles: row.roles,
        };
      }
    } catch {
      // In local dev when Postgres is offline, use token claims
      identity = {
        userId: user.userId,
        phoneNumber: user.phone || '+919999999999',
        accountStatus: user.status || 'ACTIVE',
        roles: (user.roles || ['CUSTOMER']).map((r: string) => ({
          role: r as UserRole,
          status: 'ACTIVE',
        })),
      };
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

    request.activeRole = decision.activeRole;
    return true;
  }
}
