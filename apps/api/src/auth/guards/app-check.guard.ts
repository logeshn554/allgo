import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '../../config/config.service.js';
import { FirebaseAdminAuthService } from '../firebase-auth.service.js';

@Injectable()
export class AppCheckGuard implements CanActivate {
  private readonly logger = new Logger(AppCheckGuard.name);

  constructor(
    private readonly config: ConfigService,
    private readonly firebaseAuth: FirebaseAdminAuthService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Check header: X-Firebase-AppCheck
    const appCheckToken = request.headers['x-firebase-appcheck'] || request.headers['x-appcheck-token'];

    // In dev / test or admin web portal, if no token header provided, allow but log
    if (!appCheckToken) {
      if (this.config.isDevelopment || request.headers['x-allgo-role'] === 'ADMIN') {
        return true;
      }
      throw new UnauthorizedException('Missing X-Firebase-AppCheck header');
    }

    try {
      const claims = await this.firebaseAuth.verifyAppCheckToken(String(appCheckToken));
      request.appCheck = claims;
      return true;
    } catch (err: any) {
      this.logger.warn(`AppCheck verification rejected: ${err.message}`);
      if (this.config.isDevelopment) {
        return true;
      }
      throw new UnauthorizedException(`AppCheck validation failed: ${err.message}`);
    }
  }
}
