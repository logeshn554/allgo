import { Injectable, type NestMiddleware, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ConfigService } from '../config/config.service.js';
import { RedisService } from '../redis/redis.service.js';

export interface AuthenticatedUser {
  userId: string;
  phone?: string;
  status?: string;
  roles: string[];
  deviceId?: string;
  [key: string]: any;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  activeRole?: string;
}

export function createAuthMiddleware(config: ConfigService, redis: RedisService) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'UNAUTHORIZED: Access token required',
      });
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      return res.status(401).json({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'UNAUTHORIZED: Empty access token',
      });
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret, {
        algorithms: ['HS256'],
      }) as any;

      const isRevoked = await redis.get(`token:revoked:${token}`);
      if (isRevoked) {
        return res.status(401).json({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'UNAUTHORIZED: Token has been revoked',
        });
      }

      const cachedStatus = await redis.get(`user:status:${decoded.userId}`);
      if (cachedStatus === 'BLOCKED' || cachedStatus === 'SUSPENDED') {
        return res.status(403).json({
          statusCode: 403,
          error: 'Forbidden',
          message: `ACCOUNT_${cachedStatus}: Account is disabled`,
        });
      }

      req.user = {
        userId: decoded.userId,
        phone: decoded.phone,
        status: decoded.status || 'ACTIVE',
        roles: Array.isArray(decoded.roles) ? decoded.roles : [],
        deviceId: decoded.deviceId,
      };

      next();
      return;
    } catch (err: any) {
      return res.status(401).json({
        statusCode: 401,
        error: 'Unauthorized',
        message: `UNAUTHORIZED: ${err.message || 'Invalid or expired token'}`,
      });
    }
  };
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly handler: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>;

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService
  ) {
    this.handler = createAuthMiddleware(this.config, this.redis);
  }

  use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    return this.handler(req, res, next);
  }
}
