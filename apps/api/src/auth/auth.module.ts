import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { LocalOtpDeliveryAdapter } from './adapters/local-otp-delivery.adapter.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalOtpDeliveryAdapter,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard, LocalOtpDeliveryAdapter],
})
export class AuthModule {}
