import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthRepository, UserEntity } from './data/auth.repository.js';
import { FirebaseAdminAuthService } from './firebase-auth.service.js';
import { TokenSessionService, AuthTokens } from './token-session.service.js';

export interface ExchangeSessionDto {
  firebase_token: string;
  device_id: string;
  platform: 'ANDROID' | 'IOS' | 'WEB';
  fcm_token?: string;
}

@Injectable()
export class FirebaseSessionExchangeService {
  constructor(
    private readonly firebaseAuth: FirebaseAdminAuthService,
    private readonly authRepo: AuthRepository,
    private readonly tokenSessionService: TokenSessionService
  ) {}

  async exchangeFirebaseToken(dto: ExchangeSessionDto): Promise<AuthTokens> {
    if (!dto.firebase_token) {
      throw new UnauthorizedException('Firebase ID token is required');
    }

    const decoded = await this.firebaseAuth.verifyIdToken(dto.firebase_token);
    const phone = decoded.phone_number || (decoded as any).phone;
    if (!phone) {
      throw new UnauthorizedException('Verified Firebase token lacks phone number claim');
    }

    let user = await this.authRepo.findUserByPhone(phone);
    if (!user) {
      user = await this.authRepo.createUserWithCustomerRole(phone);
    }

    if (user.status === 'BLOCKED') {
      throw new ForbiddenException('ACCOUNT_BLOCKED: Your account has been permanently blocked.');
    }
    if (user.status === 'SUSPENDED') {
      throw new ForbiddenException('ACCOUNT_SUSPENDED: Your account is temporarily suspended.');
    }

    const deviceId = dto.device_id || 'default_device';
    const accessToken = this.tokenSessionService.generateAccessToken(user, deviceId);
    const refreshToken = this.tokenSessionService.generateRefreshToken(user, deviceId);

    await this.authRepo.recordDeviceSession(
      user.id,
      deviceId,
      dto.platform || 'ANDROID',
      refreshToken,
      dto.fcm_token
    );

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 900,
      user,
    };
  }
}
