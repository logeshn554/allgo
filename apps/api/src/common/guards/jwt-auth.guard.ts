import {
  Injectable,
  Optional,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { ConfigService } from '../../config/config.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { DatabaseService } from '../../database/database.service.js';
import { SESSION_COOKIE_NAME, extractCookie } from '../../auth/device-utils.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    @Optional() private readonly db?: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;

    // 1. Prefer explicit Authorization: Bearer <jwt> (mobile & API clients)
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (!token) {
        throw new UnauthorizedException('Missing or malformed Authorization header');
      }
      return this.verifyBearerJwt(request, token);
    }

    // 2. Otherwise authenticate via opaque HttpOnly session cookie (web clients)
    const sessionToken =
      request.cookies?.[SESSION_COOKIE_NAME] ||
      extractCookie(request.headers?.cookie, SESSION_COOKIE_NAME);

    if (sessionToken) {
      return this.verifyOpaqueSessionCookie(request, sessionToken);
    }

    throw new UnauthorizedException('Missing authentication credentials');
  }

  private async verifyBearerJwt(request: any, token: string): Promise<boolean> {
    try {
      const decoded = jwt.verify(token, this.config.jwtSecret, {
        algorithms: ['HS256'],
      }) as any;

      if (decoded.status === 'BLOCKED' || decoded.status === 'SUSPENDED') {
        throw new UnauthorizedException(`Account is ${decoded.status.toLowerCase()}`);
      }

      const isRevoked = await this.redis.get(`token:revoked:${token}`);
      if (isRevoked) {
        throw new UnauthorizedException('Token has been revoked');
      }

      const isUserBlocked = await this.redis.get(`user:status:${decoded.userId}`);
      if (isUserBlocked === 'BLOCKED' || isUserBlocked === 'SUSPENDED') {
        throw new UnauthorizedException(`Account is ${isUserBlocked.toLowerCase()}`);
      }

      // Immediate revocation check for "Revoke All Devices"
      const revokedAllAt = await this.redis.get(`user:revoked_all:${decoded.userId}`);
      if (revokedAllAt) {
        const sidActive = decoded.sid
          ? await this.redis.get(`session:active:${decoded.sid}`)
          : null;
        if (!sidActive) {
          throw new UnauthorizedException('Session has been revoked');
        }
      }

      // Immediate revocation check for per-device revocation
      if (decoded.deviceId) {
        const isDeviceRevoked = await this.redis.get(
          `device:revoked:${decoded.userId}:${decoded.deviceId}`,
        );
        if (isDeviceRevoked) {
          const sidActive = decoded.sid
            ? await this.redis.get(`session:active:${decoded.sid}`)
            : null;
          if (!sidActive) {
            throw new UnauthorizedException('Device session has been revoked');
          }
        }
      }

      request.user = decoded;
      return true;
    } catch (err: any) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException(err?.message || 'Invalid authentication token');
    }
  }

  private async verifyOpaqueSessionCookie(
    request: any,
    sessionToken: string,
  ): Promise<boolean> {
    const tokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');

    let session: {
      userId: string;
      phone?: string;
      email?: string | null;
      status: string;
      roles: string[];
      deviceId: string;
      platform?: string;
      issuedAt?: number;
      expiresAt: number;
    } | null = null;

    const raw = await this.redis.get(`web:session:${tokenHash}`);
    if (raw) {
      try {
        session = JSON.parse(raw);
      } catch {
        session = null;
      }
    }

    // Fallback to DB if Redis cache missed
    if (!session && this.db) {
      try {
        const res = await this.db.query(
          `SELECT d.user_id, d.device_id, d.platform, d.session_expires_at, d.last_active_at,
                  u.phone, u.email, u.status,
                  COALESCE(json_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '["CUSTOMER"]') AS roles
           FROM devices d
           JOIN users u ON u.id = d.user_id
           LEFT JOIN user_roles ur ON ur.user_id = u.id
           LEFT JOIN roles r ON r.id = ur.role_id
           WHERE d.session_token_hash = $1 AND d.session_expires_at > NOW()
           GROUP BY d.id, u.id;`,
          [tokenHash],
        );
        if (res.rows.length > 0) {
          const r = res.rows[0];
          const expiresAt = new Date(r.session_expires_at).getTime();
          const issuedAt = r.last_active_at ? new Date(r.last_active_at).getTime() : Date.now();
          session = {
            userId: r.user_id,
            phone: r.phone || '',
            email: r.email || null,
            status: r.status,
            roles: Array.isArray(r.roles) ? r.roles : ['CUSTOMER'],
            deviceId: r.device_id,
            platform: r.platform || 'WEB',
            issuedAt,
            expiresAt,
          };
          const remainingTtl = Math.max(60, Math.floor((expiresAt - Date.now()) / 1000));
          await this.redis.setex(`web:session:${tokenHash}`, remainingTtl, JSON.stringify(session));
        }
      } catch {
        // Ignore DB offline error
      }
    }

    if (!session || (session.expiresAt && session.expiresAt <= Date.now())) {
      await this.redis.del(`web:session:${tokenHash}`);
      throw new UnauthorizedException('Invalid or expired session');
    }

    const revokedAllAt = await this.redis.get(`user:revoked_all:${session.userId}`);
    if (revokedAllAt) {
      const revokedTs = Number(revokedAllAt);
      if (!session.issuedAt || Number.isNaN(revokedTs) || session.issuedAt <= revokedTs) {
        await this.redis.del(`web:session:${tokenHash}`);
        throw new UnauthorizedException('Session has been revoked');
      }
    }

    if (session.deviceId) {
      const deviceRevokedAt = await this.redis.get(
        `device:revoked:${session.userId}:${session.deviceId}`,
      );
      if (deviceRevokedAt) {
        const revokedTs = Number(deviceRevokedAt);
        if (!session.issuedAt || Number.isNaN(revokedTs) || session.issuedAt <= revokedTs) {
          await this.redis.del(`web:session:${tokenHash}`);
          throw new UnauthorizedException('Device session has been revoked');
        }
      }
    }

    const isUserBlocked = await this.redis.get(`user:status:${session.userId}`);
    if (isUserBlocked === 'BLOCKED' || isUserBlocked === 'SUSPENDED') {
      throw new UnauthorizedException(`Account is ${isUserBlocked.toLowerCase()}`);
    }

    if (session.status === 'BLOCKED' || session.status === 'SUSPENDED') {
      throw new UnauthorizedException(`Account is ${session.status.toLowerCase()}`);
    }

    request.user = {
      userId: session.userId,
      phone: session.phone || '',
      email: session.email || null,
      status: session.status,
      roles: session.roles,
      deviceId: session.deviceId,
      authType: 'cookie',
    };
    return true;
  }
}
