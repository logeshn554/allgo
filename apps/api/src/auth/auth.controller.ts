import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Body,
  Req,
  Res,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { AuthManagerRepository } from './data/auth-manager.repository.js';
import { EmailAuthService } from './email-auth.service.js';
import { OAuthService } from './oauth.service.js';
import { TwoFactorService } from './two-factor.service.js';
import { SESSION_COOKIE_NAME, extractCookie } from './device-utils.js';
import { SendOtpDto } from './dto/send-otp.dto.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { AppCheckGuard } from './guards/app-check.guard.js';
import { FirebaseSessionExchangeService, ExchangeSessionDto } from './firebase-session-exchange.service.js';

@ApiTags('auth')
@Controller('v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionExchange: FirebaseSessionExchangeService,
    private readonly authManagerRepo: AuthManagerRepository,
    private readonly emailAuthService: EmailAuthService,
    private readonly oauthService: OAuthService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  @Post('session')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AppCheckGuard)
  @ApiOperation({ summary: 'Exchange Firebase ID token for AllGo session tokens' })
  @ApiResponse({ status: 200, description: 'Authentication successful, JWT tokens issued' })
  @ApiResponse({ status: 401, description: 'Invalid Firebase ID token' })
  async exchangeSession(@Body() dto: ExchangeSessionDto) {
    return this.sessionExchange.exchangeFirebaseToken(dto);
  }

  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AppCheckGuard)
  @ApiOperation({ summary: 'Send 6-digit OTP to Indian mobile number' })
  @ApiResponse({ status: 200, description: 'OTP dispatched successfully' })
  @ApiResponse({ status: 400, description: 'Invalid phone or rate limit exceeded' })
  async sendOtp(@Body() dto: SendOtpDto, @Req() req: Request) {
    const rawForwarded = req.headers['x-forwarded-for'];
    let clientIp = '127.0.0.1';
    if (typeof rawForwarded === 'string') {
      clientIp = rawForwarded.split(',')[0]?.trim() || '127.0.0.1';
    } else if (Array.isArray(rawForwarded) && rawForwarded[0]) {
      clientIp = rawForwarded[0].split(',')[0]?.trim() || '127.0.0.1';
    } else if (req.socket?.remoteAddress) {
      clientIp = req.socket.remoteAddress;
    }
    return this.authService.sendOtp(dto, clientIp);
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atomically verify OTP and issue session tokens' })
  @ApiResponse({ status: 200, description: 'Authentication successful, session issued' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  @ApiResponse({ status: 403, description: 'Account blocked or suspended' })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = this.extractIp(req);
    const userAgent = req.headers['user-agent'];
    const result = await this.authService.verifyOtp(dto, { ipAddress, userAgent });
    return this.finalizeAuthResponse(req, res, result, {
      deviceId: dto.deviceId,
      platform: dto.platform || 'ANDROID',
      ipAddress,
      userAgent,
      loginMethod: 'PHONE_OTP',
    });
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
  async logout(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
    @Headers('authorization') authHeader: string,
    @Body('refreshToken') refreshToken?: string
  ) {
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
    const sessionToken =
      req.cookies?.[SESSION_COOKIE_NAME] ||
      extractCookie(req.headers?.cookie, SESSION_COOKIE_NAME) ||
      undefined;
    this.clearSessionCookie(req, res);
    return this.authService.logout(token, req.user.userId, req.user.deviceId, refreshToken, sessionToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user identity and roles' })
  @ApiResponse({ status: 200, description: 'User identity details' })
  async getMe(@Req() req: any) {
    const [extUser, settings] = await Promise.all([
      this.authManagerRepo.findUserById(req.user.userId),
      this.authManagerRepo.getSettings(),
    ]);
    if (extUser) {
      const {
        passwordHash,
        twoFactorSecretEncrypted: _sec,
        twoFactorBackupCodesHash: _codes,
        ...safeUser
      } = extUser;
      return {
        ...safeUser,
        hasPassword: Boolean(passwordHash),
        twoFactorSetupRequired: this.twoFactorService.isTwoFactorSetupRequired(
          extUser,
          settings.twoFactorPolicy,
        ),
      };
    }
    const user = await this.authService.findUserById(req.user.userId);
    return user || req.user;
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List active device sessions for current user' })
  async listSessions(@Req() req: any) {
    const devices = await this.authService.listSessions(req.user.userId);
    const currentDeviceId = req.user.deviceId;
    return {
      sessions: devices.map((d: any) => ({
        ...d,
        isCurrent: Boolean(currentDeviceId && (d.deviceId === currentDeviceId || d.device_id === currentDeviceId)),
      })),
    };
  }

  @Delete('sessions/:deviceId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a specific device session' })
  async revokeSession(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
    @Param('deviceId') deviceId: string,
  ) {
    const result = await this.authService.revokeSession(req.user.userId, deviceId);
    if (req.user.deviceId && req.user.deviceId === deviceId) {
      this.clearSessionCookie(req, res);
    }
    return result;
  }

  @Delete('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke all device sessions for current user' })
  async revokeAllSessions(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    this.clearSessionCookie(req, res);
    return this.authService.revokeSession(req.user.userId);
  }

  // ==================== MULTI-METHOD & OAUTH ENDPOINTS ====================

  @Get('providers/public')
  @ApiOperation({ summary: 'List enabled authentication methods and OAuth providers' })
  async getPublicProviders() {
    const [settings, providers] = await Promise.all([
      this.authManagerRepo.getSettings(),
      this.authManagerRepo.listProviders(false),
    ]);
    return {
      methods: {
        phoneOtp: settings.phoneOtpEnabled,
        emailPassword: settings.emailPasswordEnabled,
        emailOtp: settings.emailOtpEnabled,
        oauth: settings.oauthEnabled,
        allowSelfSignup: settings.allowSelfSignup,
        twoFactorPolicy: settings.twoFactorPolicy,
      },
      oauthProviders: settings.oauthEnabled
        ? providers
            .filter((p) => p.enabled)
            .map((p) => {
              const isBuiltIn = ['google', 'github', 'microsoft', 'apple'].includes(
                p.slug.toLowerCase(),
              );
              const configured = isBuiltIn
                ? Boolean(p.clientId)
                : Boolean(p.clientId && p.authorizationUrl && p.tokenUrl && p.userinfoUrl);
              return {
                slug: p.slug,
                displayName: p.displayName,
                providerType: p.providerType,
                icon: p.icon,
                configured,
              };
            })
        : [],
    };
  }

  @Post('email/register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register a new user with email and password' })
  async registerWithEmail(
    @Body() body: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = this.extractIp(req);
    const userAgent = req.headers['user-agent'];
    const platform = body.platform || 'WEB';
    const result = await this.emailAuthService.registerWithEmail({
      email: body.email,
      password: body.password,
      fullName: body.fullName,
      deviceId: body.deviceId,
      platform,
      ipAddress,
      userAgent,
    });
    return this.finalizeAuthResponse(req, res, result, {
      deviceId: body.deviceId,
      platform,
      ipAddress,
      userAgent,
      loginMethod: 'EMAIL_PASSWORD',
    });
  }

  @Post('email/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with email and password' })
  async loginWithEmail(
    @Body() body: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = this.extractIp(req);
    const userAgent = req.headers['user-agent'];
    const platform = body.platform || 'WEB';
    const result = await this.emailAuthService.loginWithEmail({
      email: body.email,
      password: body.password,
      deviceId: body.deviceId,
      platform,
      ipAddress,
      userAgent,
    });
    return this.finalizeAuthResponse(req, res, result, {
      deviceId: body.deviceId,
      platform,
      ipAddress,
      userAgent,
      loginMethod: 'EMAIL_PASSWORD',
    });
  }

  @Post('password/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with email or phone number and password' })
  async loginWithPassword(
    @Body() body: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = this.extractIp(req);
    const userAgent = req.headers['user-agent'];
    const platform = body?.platform || 'WEB';
    const result = await this.emailAuthService.loginWithPassword({
      identifier: body?.identifier || body?.email || body?.phone,
      password: body?.password,
      deviceId: body?.deviceId,
      platform,
      ipAddress,
      userAgent,
    });
    return this.finalizeAuthResponse(req, res, result, {
      deviceId: body?.deviceId,
      platform,
      ipAddress,
      userAgent,
      loginMethod: 'PASSWORD',
    });
  }

  @Post('email/otp/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send 6-digit OTP to email address' })
  async sendEmailOtp(@Body() body: any) {
    return this.emailAuthService.sendEmailOtp(body.email);
  }

  @Post('email/otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email OTP and issue session tokens' })
  async verifyEmailOtp(
    @Body() body: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = this.extractIp(req);
    const userAgent = req.headers['user-agent'];
    const platform = body.platform || 'WEB';
    const result = await this.emailAuthService.verifyEmailOtp({
      email: body.email,
      code: body.code,
      deviceId: body.deviceId,
      platform,
      ipAddress,
      userAgent,
    });
    return this.finalizeAuthResponse(req, res, result, {
      deviceId: body.deviceId,
      platform,
      ipAddress,
      userAgent,
      loginMethod: 'EMAIL_OTP',
    });
  }

  @Get('oauth/:provider/authorize')
  @ApiOperation({ summary: 'Initiate OAuth 2.0 / OIDC authorization flow' })
  async oauthAuthorize(
    @Param('provider') provider: string,
    @Query('redirect') redirect: string,
    @Query('mode') mode: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const origin = `${req.protocol}://${req.get('host')}`;
    const frontendRedirect = redirect || 'http://localhost:3003/login';
    try {
      const result = await this.oauthService.createAuthorizationUrl({
        slug: provider,
        frontendRedirect,
        requestOrigin: origin,
      });
      if (mode === 'json') {
        return res.json(result);
      }
      return res.redirect(result.url);
    } catch (err: any) {
      if (mode === 'json') {
        throw err;
      }
      const sep = frontendRedirect.includes('?') ? '&' : '?';
      const rawMsg = String(err?.message || '');
      const userMsg = /missing Client ID|not enabled|missing authorizationUrl/i.test(rawMsg)
        ? 'Single sign-on is currently unavailable. Please sign in with your email or phone.'
        : rawMsg || 'Single sign-on failed. Please try again.';
      return res.redirect(`${frontendRedirect}${sep}oauth_error=${encodeURIComponent(userMsg)}`);
    }
  }

  @Get('oauth/:provider/callback')
  @ApiOperation({ summary: 'Handle OAuth 2.0 / OIDC provider callback' })
  async oauthCallback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const origin = `${req.protocol}://${req.get('host')}`;
    const { redirectUrl } = await this.oauthService.handleCallback({
      slug: provider,
      code,
      state,
      requestOrigin: origin,
      ipAddress: this.extractIp(req),
      userAgent: req.headers['user-agent'],
    });
    return res.redirect(redirectUrl);
  }

  @Post('oauth/:provider/callback')
  @ApiOperation({ summary: 'Handle OAuth 2.0 / OIDC form_post callback (e.g. Apple Sign In)' })
  async oauthCallbackPost(
    @Param('provider') provider: string,
    @Body('code') code: string,
    @Body('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const origin = `${req.protocol}://${req.get('host')}`;
    const { redirectUrl } = await this.oauthService.handleCallback({
      slug: provider,
      code,
      state,
      requestOrigin: origin,
      ipAddress: this.extractIp(req),
      userAgent: req.headers['user-agent'],
    });
    return res.redirect(redirectUrl);
  }

  @Post('oauth/exchange')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange short-lived OAuth code for AllGo session' })
  async exchangeOAuthCode(
    @Body('code') code: string,
    @Body('deviceId') deviceId: string | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.oauthService.exchangeOneTimeCode(code);
    return this.finalizeAuthResponse(req, res, result, {
      deviceId,
      platform: 'WEB',
      ipAddress: this.extractIp(req),
      userAgent: req.headers['user-agent'],
      loginMethod: 'OAUTH',
    });
  }

  @Get('identities')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List linked login identities for current user' })
  async listMyIdentities(@Req() req: any) {
    return {
      identities: await this.authManagerRepo.listIdentitiesForUser(req.user.userId),
    };
  }

  @Delete('identities/:identityId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlink a login identity from current user' })
  async unlinkMyIdentity(@Req() req: any, @Param('identityId') identityId: string) {
    return this.authManagerRepo.unlinkIdentity(req.user.userId, identityId);
  }

  @Post('identities/phone/send')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send 6-digit OTP to link a phone number to current user' })
  async sendLinkPhoneOtp(@Req() req: any, @Body() body: any) {
    return this.emailAuthService.sendLinkPhoneOtp(req.user.userId, body?.phone);
  }

  @Post('identities/phone/verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify OTP and link a phone number to current user' })
  async verifyLinkPhoneOtp(@Req() req: any, @Body() body: any) {
    return this.emailAuthService.verifyLinkPhoneOtp(req.user.userId, body?.phone, body?.code);
  }

  @Post('identities/email/send')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send 6-digit OTP to link an email address to current user' })
  async sendLinkEmailOtp(@Req() req: any, @Body() body: any) {
    return this.emailAuthService.sendLinkEmailOtp(req.user.userId, body?.email);
  }

  @Post('identities/email/verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify OTP and link an email address to current user' })
  async verifyLinkEmailOtp(@Req() req: any, @Body() body: any) {
    return this.emailAuthService.verifyLinkEmailOtp(req.user.userId, body?.email, body?.code);
  }

  @Post('identities/oauth/:provider/authorize')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start OAuth linking flow for current authenticated user' })
  async startOAuthLink(
    @Req() req: any,
    @Param('provider') provider: string,
    @Body() body: any,
  ) {
    const origin = `${req.protocol}://${req.get('host')}`;
    const frontendRedirect = body?.redirect || 'http://localhost:3003/admin/security';
    return this.oauthService.createAuthorizationUrl({
      slug: provider,
      frontendRedirect,
      requestOrigin: origin,
      linkUserId: req.user.userId,
    });
  }

  // ==================== ACCOUNT LOOKUP & PASSWORD RESET ====================

  @Post('lookup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Look up an email or phone identifier to resolve available auth flows' })
  async lookupIdentifier(@Body() body: any) {
    return this.emailAuthService.lookupIdentifier(body?.identifier);
  }

  @Post('password/forgot')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a 6-digit password reset code via email or SMS' })
  async forgotPassword(@Body() body: any) {
    return this.emailAuthService.requestPasswordReset(
      body?.identifier || body?.email || body?.phone,
    );
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using email or phone and 6-digit reset code' })
  async resetPassword(@Body() body: any) {
    return this.emailAuthService.resetPassword({
      identifier: body?.identifier || body?.email || body?.phone,
      code: body?.code,
      newPassword: body?.newPassword,
    });
  }

  @Post('password/change')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change or set password for authenticated user' })
  async changePassword(@Req() req: any, @Body() body: any) {
    return this.emailAuthService.changePassword(req.user.userId, {
      currentPassword: body?.currentPassword,
      newPassword: body?.newPassword,
    });
  }

  // ==================== TWO-FACTOR AUTHENTICATION (2FA) ====================

  @Post('2fa/verify-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete login by verifying TOTP or backup recovery code' })
  async verifyTwoFactorLogin(
    @Body() body: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.twoFactorService.verifyLoginChallenge({
      twoFactorToken: body?.twoFactorToken,
      code: body?.code,
      isBackupCode: Boolean(body?.isBackupCode),
    });
    const platform = body?.platform || (this.isWebCookieClient(req) ? 'WEB' : 'ANDROID');
    return this.finalizeAuthResponse(req, res, result, {
      deviceId: body?.deviceId,
      platform,
      ipAddress: this.extractIp(req),
      userAgent: req.headers['user-agent'],
      loginMethod: '2FA',
    });
  }

  @Get('2fa/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get 2FA status and policy for authenticated user' })
  async getTwoFactorStatus(@Req() req: any) {
    return this.twoFactorService.getStatus(req.user.userId);
  }

  @Post('2fa/setup')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate TOTP secret and otpauth URI to enroll 2FA' })
  async setupTwoFactor(@Req() req: any) {
    return this.twoFactorService.beginSetup(req.user.userId);
  }

  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm TOTP code to enable 2FA and generate backup codes' })
  async enableTwoFactor(@Req() req: any, @Body() body: any) {
    return this.twoFactorService.confirmEnable(req.user.userId, body?.code);
  }

  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable 2FA after verifying current TOTP or backup code' })
  async disableTwoFactor(@Req() req: any, @Body() body: any) {
    return this.twoFactorService.disable(req.user.userId, body?.code);
  }

  @Post('2fa/backup-codes/regenerate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Regenerate 2FA backup recovery codes' })
  async regenerateBackupCodes(@Req() req: any, @Body() body: any) {
    return this.twoFactorService.regenerateBackupCodes(req.user.userId, body?.code);
  }

  private isWebCookieClient(req: Request, platform?: string): boolean {
    if (req.headers['x-allgo-client'] === 'web') return true;
    if (platform && platform.toUpperCase() === 'WEB') return true;
    return false;
  }

  private getCookieOptions(req: Request) {
    const isHttps = Boolean(req.secure || req.headers['x-forwarded-proto'] === 'https');
    const origin = req.headers.origin;
    const host = req.get?.('host');
    const isCrossOrigin = Boolean(origin && host && !origin.includes(host.split(':')[0]!));
    const sameSite: 'lax' | 'none' = isHttps && isCrossOrigin ? 'none' : 'lax';
    return {
      httpOnly: true,
      path: '/',
      secure: isHttps,
      sameSite,
    };
  }

  private setSessionCookie(req: Request, res: Response, sessionToken: string, maxAgeSeconds: number) {
    const opts = this.getCookieOptions(req);
    res.cookie(SESSION_COOKIE_NAME, sessionToken, {
      ...opts,
      maxAge: maxAgeSeconds * 1000,
    });
  }

  private clearSessionCookie(req: Request, res: Response) {
    const opts = this.getCookieOptions(req);
    res.clearCookie(SESSION_COOKIE_NAME, opts);
  }

  private async finalizeAuthResponse(
    req: Request,
    res: Response,
    result: any,
    meta: {
      deviceId?: string;
      platform: string;
      ipAddress: string;
      userAgent?: string;
      loginMethod: string;
    },
  ) {
    if (result && typeof result === 'object' && result.requiresTwoFactor) {
      return result;
    }
    if (!this.isWebCookieClient(req, meta.platform)) {
      return result;
    }

    let resolvedDeviceId = meta.deviceId;
    if (!resolvedDeviceId && result?.accessToken) {
      try {
        const decoded = jwt.decode(result.accessToken) as { deviceId?: string } | null;
        if (decoded?.deviceId) {
          resolvedDeviceId = decoded.deviceId;
        }
      } catch {
        // Ignore decode failure
      }
    }

    const webSession = await this.authService.issueWebSession(result.user, {
      deviceId: resolvedDeviceId,
      platform: meta.platform || 'WEB',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      loginMethod: meta.loginMethod,
      refreshToken: result?.refreshToken || null,
    });

    this.setSessionCookie(req, res, webSession.sessionToken, webSession.expiresIn);

    return {
      authenticated: true,
      tokenType: 'Cookie',
      expiresIn: webSession.expiresIn,
      deviceId: webSession.deviceId,
      user: webSession.user,
    };
  }

  private extractIp(req: Request): string {
    const rawForwarded = req.headers['x-forwarded-for'];
    if (typeof rawForwarded === 'string') {
      return rawForwarded.split(',')[0]?.trim() || '127.0.0.1';
    }
    if (Array.isArray(rawForwarded) && rawForwarded[0]) {
      return rawForwarded[0].split(',')[0]?.trim() || '127.0.0.1';
    }
    return req.socket?.remoteAddress || '127.0.0.1';
  }
}
