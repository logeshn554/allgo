import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { SendOtpDto } from './dto/send-otp.dto.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';

@ApiTags('auth')
@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send 6-digit OTP to Indian mobile number' })
  @ApiResponse({ status: 200, description: 'OTP dispatched successfully' })
  @ApiResponse({ status: 400, description: 'Invalid phone or rate limit exceeded' })
  async sendOtp(@Body() dto: SendOtpDto, @Req() req: Request) {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    return this.authService.sendOtp(dto, clientIp);
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atomically verify OTP and issue session tokens' })
  @ApiResponse({ status: 200, description: 'Authentication successful, JWT tokens issued' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  @ApiResponse({ status: 403, description: 'Account blocked or suspended' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and issue new access token' })
  @ApiResponse({ status: 200, description: 'Tokens successfully rotated' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken, dto.deviceId);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Log out current session and invalidate token' })
  @ApiResponse({ status: 200, description: 'Session successfully revoked' })
  async logout(@Req() req: any, @Headers('authorization') authHeader: string) {
    const token = authHeader ? authHeader.substring(7) : '';
    return this.authService.logout(token, req.user.userId, req.user.deviceId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user identity and roles' })
  @ApiResponse({ status: 200, description: 'User identity details' })
  async getMe(@Req() req: any) {
    const user = await this.authService.findUserById(req.user.userId);
    return user || req.user;
  }
}
