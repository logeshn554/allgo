import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { ConfigService } from '../../config/config.service.js';
import { RedisService } from '../../redis/redis.service.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or malformed Authorization header');
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, this.config.jwtSecret, {
        algorithms: ['HS256'],
      }) as any;

      // Check token payload account status
      if (decoded.status === 'BLOCKED' || decoded.status === 'SUSPENDED') {
        throw new UnauthorizedException(`Account is ${decoded.status.toLowerCase()}`);
      }

      // Check immediate revocation blocklist in Redis (<1ms)
      const isRevoked = await this.redis.get(`token:revoked:${token}`);
      if (isRevoked) {
        throw new UnauthorizedException('Token has been revoked');
      }

      const isUserBlocked = await this.redis.get(`user:status:${decoded.userId}`);
      if (isUserBlocked === 'BLOCKED' || isUserBlocked === 'SUSPENDED') {
        throw new UnauthorizedException(`Account is ${isUserBlocked.toLowerCase()}`);
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
}

