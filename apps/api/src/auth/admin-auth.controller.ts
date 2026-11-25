import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { AuthManagerRepository } from './data/auth-manager.repository.js';
import { EmailAuthService } from './email-auth.service.js';
import { TwoFactorService } from './two-factor.service.js';
import { TokenSessionService } from './token-session.service.js';

@ApiTags('admin-auth')
@Controller('v1/admin/auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
@ApiHeader({ name: 'X-AllGo-Role', description: 'Active role context (ADMIN)', required: true })
export class AdminAuthController {
  constructor(
    private readonly authManagerRepo: AuthManagerRepository,
    private readonly emailAuthService: EmailAuthService,
    private readonly twoFactorService: TwoFactorService,
    private readonly tokenSessionService: TokenSessionService,
  ) {}

  @Get('settings')
  @ApiOperation({ summary: 'Get global authentication & session settings (Admin)' })
  async getSettings() {
    return this.authManagerRepo.getSettings();
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update global authentication & session settings (Admin)' })
  async updateSettings(@Body() body: any, @Req() req: any) {
    return this.authManagerRepo.updateSettings(body, req.user?.userId);
  }

  @Get('providers')
  @ApiOperation({ summary: 'List all configured OAuth/OIDC providers (Admin)' })
  async listProviders() {
    return { providers: await this.authManagerRepo.listProviders(false) };
  }

  @Post('providers')
  @ApiOperation({ summary: 'Create or register a custom OAuth/OIDC provider (Admin)' })
  async createProvider(@Body() body: any) {
    if (!body?.slug || !body?.displayName) {
      throw new BadRequestException('slug and displayName are required.');
    }
    return this.authManagerRepo.upsertProvider(body);
  }

  @Patch('providers/:slug')
  @ApiOperation({ summary: 'Update OAuth/OIDC provider configuration & credentials (Admin)' })
  async updateProvider(@Param('slug') slug: string, @Body() body: any) {
    return this.authManagerRepo.upsertProvider({ ...body, slug });
  }

  @Delete('providers/:slug')
  @ApiOperation({ summary: 'Delete a custom OAuth/OIDC provider (Admin)' })
  async deleteProvider(@Param('slug') slug: string) {
    return this.authManagerRepo.deleteProvider(slug);
  }

  @Get('users/:userId/identities')
  @ApiOperation({ summary: 'List all linked login identities for a user (Admin)' })
  async listUserIdentities(@Param('userId') userId: string) {
    return { identities: await this.authManagerRepo.listIdentitiesForUser(userId) };
  }

  @Post('users/:userId/identities')
  @ApiOperation({ summary: 'Link a phone, email, or OAuth identity to a user (Admin)' })
  async linkUserIdentity(@Param('userId') userId: string, @Body() body: any) {
    if (!body?.provider || !body?.providerAccountId) {
      throw new BadRequestException('provider and providerAccountId are required.');
    }
    return this.authManagerRepo.linkIdentity({
      userId,
      provider: body.provider.toLowerCase().trim(),
      providerAccountId: body.providerAccountId.trim(),
      email: body.email || (body.provider === 'email' ? body.providerAccountId : null),
      phone: body.phone || (body.provider === 'phone' ? body.providerAccountId : null),
      displayName: body.displayName || null,
      verified: body.verified ?? true,
    });
  }

  @Delete('users/:userId/identities/:identityId')
  @ApiOperation({ summary: 'Unlink an identity from a user (Admin)' })
  async unlinkUserIdentity(
    @Param('userId') userId: string,
    @Param('identityId') identityId: string,
  ) {
    return this.authManagerRepo.unlinkIdentity(userId, identityId);
  }

  @Get('users/:userId/devices')
  @ApiOperation({ summary: 'List all active devices/sessions for a user (Admin)' })
  async listUserDevices(@Param('userId') userId: string) {
    return { devices: await this.authManagerRepo.listDevicesForUser(userId) };
  }

  @Delete('users/:userId/devices/:deviceId')
  @ApiOperation({ summary: 'Revoke a specific device session for a user (Admin)' })
  async revokeUserDevice(
    @Param('userId') userId: string,
    @Param('deviceId') deviceId: string,
  ) {
    const res = await this.authManagerRepo.revokeDeviceForUser(userId, deviceId);
    await this.tokenSessionService.invalidateDeviceSession(userId, deviceId, res.sessionTokenHash);
    return { success: true };
  }

  @Delete('users/:userId/devices')
  @ApiOperation({ summary: 'Revoke all active device sessions for a user (Admin)' })
  async revokeAllUserDevices(@Param('userId') userId: string) {
    const res = await this.authManagerRepo.revokeAllDevicesForUser(userId);
    await this.tokenSessionService.invalidateAllUserSessions(userId, res.revokedDevices);
    return { success: true };
  }

  @Get('users/:userId/2fa')
  @ApiOperation({ summary: 'Get 2FA status for a user (Admin)' })
  async getUserTwoFactor(@Param('userId') userId: string) {
    return this.twoFactorService.getStatus(userId);
  }

  @Delete('users/:userId/2fa')
  @ApiOperation({ summary: 'Reset / disable 2FA for a user (Admin emergency override)' })
  async resetUserTwoFactor(@Param('userId') userId: string) {
    return this.twoFactorService.adminDisableTwoFactor(userId);
  }

  @Post('users')
  @ApiOperation({ summary: 'Link an email identity to an existing phone-verified user (Admin)' })
  async createUser(@Body() body: any) {
    const email = body?.email ? String(body.email).trim().toLowerCase() : null;
    const phone = body?.phone ? String(body.phone).trim() : null;
    if (!phone || !/^\+91[6-9]\d{9}$/.test(phone)) {
      throw new BadRequestException('A normalized E.164 Indian phone number is required.');
    }
    if (body?.role && String(body.role).toUpperCase() !== 'CUSTOMER') {
      throw new BadRequestException(
        'Privileged roles must be granted through the approved onboarding or trusted admin provisioning workflow.',
      );
    }

    const user = await this.authManagerRepo.findUserByPhone(phone);
    if (!user || !user.phoneVerified) {
      throw new BadRequestException(
        'The user must complete phone OTP registration before an administrator can link additional identifiers.',
      );
    }

    if (email) {
      await this.authManagerRepo.linkIdentity({
        userId: user.id,
        provider: 'email',
        providerAccountId: email,
        email,
        verified: false,
      });
    }

    return this.authManagerRepo.findUserById(user.id);
  }
}
