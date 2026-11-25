import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { IndiaDltSmsGateway } from '../notifications/sms/india-dlt-sms.gateway.js';
import { LocalOtpDeliveryAdapter } from './adapters/local-otp-delivery.adapter.js';
import { AdminAuthController } from './admin-auth.controller.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthManagerRepository } from './data/auth-manager.repository.js';
import { AuthRepository } from './data/auth.repository.js';
import { EmailAuthService } from './email-auth.service.js';
import { FirebaseAdminAuthService } from './firebase-auth.service.js';
import { FirebaseSessionExchangeService } from './firebase-session-exchange.service.js';
import { AppCheckGuard } from './guards/app-check.guard.js';
import { OAuthService } from './oauth.service.js';
import { OtpService } from './otp.service.js';
import { SmsAbuseProtectionService } from './sms-abuse-protection.service.js';
import { TokenSessionService } from './token-session.service.js';
import { TwoFactorService } from './two-factor.service.js';

@Module({
  controllers: [AuthController, AdminAuthController],
  providers: [
    AuthRepository,
    AuthManagerRepository,
    OtpService,
    TokenSessionService,
    EmailAuthService,
    OAuthService,
    TwoFactorService,
    AuthService,
    LocalOtpDeliveryAdapter,
    JwtAuthGuard,
    RolesGuard,
    FirebaseAdminAuthService,
    FirebaseSessionExchangeService,
    AppCheckGuard,
    SmsAbuseProtectionService,
    IndiaDltSmsGateway,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    LocalOtpDeliveryAdapter,
    AuthRepository,
    AuthManagerRepository,
    EmailAuthService,
    OAuthService,
    TwoFactorService,
    FirebaseAdminAuthService,
    FirebaseSessionExchangeService,
    AppCheckGuard,
    SmsAbuseProtectionService,
    IndiaDltSmsGateway,
  ],
})
export class AuthModule {}
