import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import crypto from 'node:crypto';
import {
  Google,
  GitHub,
  MicrosoftEntraId,
  OAuth2Client,
  generateState,
  generateCodeVerifier,
} from 'arctic';
import { RedisService } from '../redis/redis.service.js';
import { ConfigService } from '../config/config.service.js';
import { AuthManagerRepository, AuthProviderRecord } from './data/auth-manager.repository.js';
import { TokenSessionService, AuthTokens } from './token-session.service.js';
import { TwoFactorService, TwoFactorChallengeResponse } from './two-factor.service.js';
import { parseDeviceName } from './device-utils.js';

interface OAuthStatePayload {
  provider: string;
  codeVerifier: string;
  frontendRedirect: string;
  linkUserId?: string;
}

interface OAuthUserProfile {
  providerAccountId: string;
  email: string | null;
  emailVerified: boolean;
  fullName: string | null;
  avatarUrl: string | null;
}

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly authManagerRepo: AuthManagerRepository,
    private readonly tokenSessionService: TokenSessionService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  private getApiBaseUrl(requestOrigin?: string): string {
    return (
      process.env.API_PUBLIC_URL ||
      requestOrigin ||
      `http://localhost:${this.config.port}`
    ).replace(/\/$/, '');
  }

  private getCallbackUrl(slug: string, requestOrigin?: string): string {
    return `${this.getApiBaseUrl(requestOrigin)}/v1/auth/oauth/${slug}/callback`;
  }

  private buildArcticClient(provider: AuthProviderRecord, callbackUrl: string) {
    const clientId = provider.clientId;
    const clientSecret = provider.clientSecret || '';

    if (!clientId) {
      throw new BadRequestException(`OAuth provider '${provider.slug}' is missing Client ID.`);
    }

    switch (provider.slug) {
      case 'google':
        return new Google(clientId, clientSecret, callbackUrl);
      case 'github':
        return new GitHub(clientId, clientSecret, callbackUrl);
      case 'microsoft':
        return new MicrosoftEntraId('common', clientId, clientSecret, callbackUrl);
      default:
        return new OAuth2Client(clientId, clientSecret, callbackUrl);
    }
  }

  async createAuthorizationUrl(input: {
    slug: string;
    frontendRedirect: string;
    requestOrigin?: string;
    linkUserId?: string;
  }): Promise<{ url: string; state: string }> {
    const settings = await this.authManagerRepo.getSettings();
    if (!settings.oauthEnabled) {
      throw new ForbiddenException('OAuth authentication is currently disabled.');
    }

    const provider = await this.authManagerRepo.getProviderBySlug(input.slug, true);
    if (!provider || !provider.enabled) {
      throw new BadRequestException(`OAuth provider '${input.slug}' is not enabled.`);
    }

    const callbackUrl = this.getCallbackUrl(provider.slug, input.requestOrigin);
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const scopes = provider.scopes
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    let url: URL;
    const client = this.buildArcticClient(provider, callbackUrl);

    if (client instanceof Google) {
      url = client.createAuthorizationURL(state, codeVerifier, scopes.length ? scopes : ['openid', 'email', 'profile']);
    } else if (client instanceof GitHub) {
      url = client.createAuthorizationURL(state, scopes.length ? scopes : ['read:user', 'user:email']);
    } else if (client instanceof MicrosoftEntraId) {
      url = client.createAuthorizationURL(state, codeVerifier, scopes.length ? scopes : ['openid', 'email', 'profile']);
    } else if (provider.slug === 'apple') {
      const authUrl = provider.authorizationUrl || 'https://appleid.apple.com/auth/authorize';
      url = (client as OAuth2Client).createAuthorizationURLWithPKCE(
        authUrl,
        state,
        'S256' as any,
        codeVerifier,
        scopes.length ? scopes : ['name', 'email'],
      );
      url.searchParams.set('response_mode', 'form_post');
    } else {
      if (!provider.authorizationUrl) {
        throw new BadRequestException(`Custom OAuth provider '${provider.slug}' is missing authorizationUrl.`);
      }
      url = (client as OAuth2Client).createAuthorizationURLWithPKCE(
        provider.authorizationUrl,
        state,
        'S256' as any,
        codeVerifier,
        scopes,
      );
    }

    const payload: OAuthStatePayload = {
      provider: provider.slug,
      codeVerifier,
      frontendRedirect: input.frontendRedirect || '/login',
      linkUserId: input.linkUserId,
    };

    await this.redis.setex(`oauth:state:${state}`, 600, JSON.stringify(payload));
    return { url: url.toString(), state };
  }

  async handleCallback(input: {
    slug: string;
    code: string;
    state: string;
    requestOrigin?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ redirectUrl: string }> {
    const rawState = await this.redis.get(`oauth:state:${input.state}`);
    if (!rawState) {
      throw new BadRequestException('Invalid or expired OAuth state.');
    }
    await this.redis.del(`oauth:state:${input.state}`);

    const statePayload: OAuthStatePayload = JSON.parse(rawState);
    if (statePayload.provider !== input.slug.toLowerCase()) {
      throw new BadRequestException('OAuth provider mismatch.');
    }

    const buildErrorRedirect = (message: string, noAccount = false) => {
      const sep = statePayload.frontendRedirect.includes('?') ? '&' : '?';
      const params = new URLSearchParams();
      if (noAccount) {
        params.set('no_account', '1');
      } else {
        params.set('oauth_error', message);
      }
      return { redirectUrl: `${statePayload.frontendRedirect}${sep}${params.toString()}` };
    };

    try {
      const provider = await this.authManagerRepo.getProviderBySlug(input.slug, true);
      if (!provider || !provider.enabled) {
        return buildErrorRedirect(`OAuth provider '${input.slug}' is not enabled.`);
      }

      const callbackUrl = this.getCallbackUrl(provider.slug, input.requestOrigin);
      const client = this.buildArcticClient(provider, callbackUrl);

      let accessToken: string;
      let idToken: string | null = null;
      if (client instanceof Google) {
        const tokens = await client.validateAuthorizationCode(input.code, statePayload.codeVerifier);
        accessToken = tokens.accessToken();
      } else if (client instanceof GitHub) {
        const tokens = await client.validateAuthorizationCode(input.code);
        accessToken = tokens.accessToken();
      } else if (client instanceof MicrosoftEntraId) {
        const tokens = await client.validateAuthorizationCode(input.code, statePayload.codeVerifier);
        accessToken = tokens.accessToken();
      } else if (provider.slug === 'apple') {
        const tokenUrl = provider.tokenUrl || 'https://appleid.apple.com/auth/token';
        const tokens = await (client as OAuth2Client).validateAuthorizationCode(
          tokenUrl,
          input.code,
          statePayload.codeVerifier,
        );
        accessToken = tokens.accessToken();
        try {
          idToken = (tokens as any).idToken?.() || null;
        } catch {
          idToken = null;
        }
      } else {
        if (!provider.tokenUrl) {
          return buildErrorRedirect(`Custom OAuth provider '${provider.slug}' is missing tokenUrl.`);
        }
        const tokens = await (client as OAuth2Client).validateAuthorizationCode(
          provider.tokenUrl,
          input.code,
          statePayload.codeVerifier,
        );
        accessToken = tokens.accessToken();
      }

      const profile = await this.fetchProviderProfile(provider, accessToken, idToken);
      const settings = await this.authManagerRepo.getSettings();

      // Case 1: Explicit account linking for an already signed-in user
      if (statePayload.linkUserId) {
        await this.authManagerRepo.linkIdentity({
          userId: statePayload.linkUserId,
          provider: provider.slug,
          providerAccountId: profile.providerAccountId,
          email: profile.email,
          displayName: profile.fullName,
          avatarUrl: profile.avatarUrl,
          verified: profile.emailVerified,
        });
        const sep = statePayload.frontendRedirect.includes('?') ? '&' : '?';
        return { redirectUrl: `${statePayload.frontendRedirect}${sep}linked=${provider.slug}` };
      }

      // Case 2: Sign-in or auto-link or signup
      let user = await this.authManagerRepo.findUserByIdentity(
        provider.slug,
        profile.providerAccountId,
      );

      if (!user && profile.email && profile.emailVerified && settings.autoLinkVerifiedAccounts && provider.autoLink) {
        const emailOwner = await this.authManagerRepo.findUserByEmail(profile.email);
        if (emailOwner) {
          await this.authManagerRepo.linkIdentity({
            userId: emailOwner.id,
            provider: provider.slug,
            providerAccountId: profile.providerAccountId,
            email: profile.email,
            displayName: profile.fullName,
            avatarUrl: profile.avatarUrl,
            verified: true,
          });
          user = emailOwner;
        }
      }

      if (!user) {
        return buildErrorRedirect(
          'Create your AllGo account with verified phone OTP first, then link this sign-in provider from account settings.',
          true,
        );
      }

      if (user.status === 'BLOCKED' || user.status === 'SUSPENDED') {
        return buildErrorRedirect(`Account is ${user.status.toLowerCase()}.`);
      }

      const loginMethod = `OAUTH_${provider.slug.toUpperCase()}`;
      const deviceId = `oauth_${provider.slug}_${crypto.randomUUID().slice(0, 8)}`;

      let exchangePayload: AuthTokens | TwoFactorChallengeResponse;
      if (this.twoFactorService.isTwoFactorRequiredForLogin(user, settings.twoFactorPolicy)) {
        exchangePayload = await this.twoFactorService.createLoginChallenge(user, {
          deviceId,
          platform: 'WEB',
          ipAddress: input.ipAddress || null,
          userAgent: input.userAgent || null,
          loginMethod,
        });
      } else {
        await this.authManagerRepo.recordLoginAudit(
          user.id,
          loginMethod,
          provider.slug,
          profile.providerAccountId,
        );

        const sid = crypto.randomUUID();
        const accessJwt = this.tokenSessionService.generateAccessToken(user, deviceId, sid);
        const refreshJwt = this.tokenSessionService.generateRefreshToken(user, deviceId);
        await this.tokenSessionService.markSessionActive(user.id, deviceId, sid);

        const { evictedDevices } = await this.authManagerRepo.recordDeviceWithMetadata({
          userId: user.id,
          deviceId,
          platform: 'WEB',
          refreshToken: refreshJwt,
          deviceName: parseDeviceName(input.userAgent, 'WEB'),
          ipAddress: input.ipAddress || null,
          userAgent: input.userAgent || null,
          loginMethod,
        });
        for (const evicted of evictedDevices) {
          await this.tokenSessionService.invalidateDeviceSession(
            user.id,
            evicted.deviceId,
            evicted.sessionTokenHash,
          );
        }

        exchangePayload = {
          accessToken: accessJwt,
          refreshToken: refreshJwt,
          tokenType: 'Bearer',
          expiresIn: 900,
          user: {
            id: user.id,
            phone: user.phone || '',
            email: user.email || null,
            fullName: user.fullName || null,
            avatarUrl: user.avatarUrl || null,
            status: user.status,
            roles: user.roles,
            defaultLanguage: user.defaultLanguage || 'en',
          },
        };
      }

      const oneTimeCode = crypto.randomBytes(24).toString('hex');
      await this.redis.setex(`oauth:exchange:${oneTimeCode}`, 120, JSON.stringify(exchangePayload));

      const sep = statePayload.frontendRedirect.includes('?') ? '&' : '?';
      return { redirectUrl: `${statePayload.frontendRedirect}${sep}oauth_code=${oneTimeCode}` };
    } catch (err: any) {
      this.logger.warn(`OAuth callback error for ${input.slug}: ${err?.message || err}`);
      return buildErrorRedirect(err?.message || 'OAuth sign-in failed.');
    }
  }

  async exchangeOneTimeCode(code: string): Promise<AuthTokens | TwoFactorChallengeResponse> {
    if (!code) {
      throw new BadRequestException('OAuth exchange code is required.');
    }
    const raw = await this.redis.get(`oauth:exchange:${code}`);
    if (!raw) {
      throw new UnauthorizedException('Invalid or expired OAuth exchange code.');
    }
    await this.redis.del(`oauth:exchange:${code}`);
    return JSON.parse(raw) as AuthTokens | TwoFactorChallengeResponse;
  }

  private async fetchProviderProfile(
    provider: AuthProviderRecord,
    accessToken: string,
    idToken?: string | null,
  ): Promise<OAuthUserProfile> {
    if (provider.slug === 'apple' && idToken) {
      const parts = idToken.split('.');
      if (parts.length >= 2 && parts[1]) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        return {
          providerAccountId: String(payload.sub),
          email: payload.email || null,
          emailVerified: payload.email_verified === true || payload.email_verified === 'true',
          fullName: null,
          avatarUrl: null,
        };
      }
    }
    if (provider.slug === 'google') {
      const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data: any = await res.json();
      return {
        providerAccountId: String(data.sub),
        email: data.email || null,
        emailVerified: Boolean(data.email_verified),
        fullName: data.name || null,
        avatarUrl: data.picture || null,
      };
    }

    if (provider.slug === 'github') {
      const res = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'AllGo-Auth' },
      });
      const data: any = await res.json();
      let email = data.email || null;
      let emailVerified = false;
      if (!email) {
        const emailRes = await fetch('https://api.github.com/user/emails', {
          headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'AllGo-Auth' },
        });
        const emails = (await emailRes.json()) as any[];
        const primary = emails.find((e) => e.primary) || emails[0];
        if (primary) {
          email = primary.email;
          emailVerified = Boolean(primary.verified);
        }
      }
      return {
        providerAccountId: String(data.id),
        email,
        emailVerified,
        fullName: data.name || data.login || null,
        avatarUrl: data.avatar_url || null,
      };
    }

    if (provider.slug === 'microsoft') {
      const res = await fetch('https://graph.microsoft.com/oidc/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data: any = await res.json();
      return {
        providerAccountId: String(data.sub),
        email: data.email || null,
        emailVerified: Boolean(data.email),
        fullName: data.name || null,
        avatarUrl: null,
      };
    }

    if (!provider.userinfoUrl) {
      throw new BadRequestException(`Provider '${provider.slug}' is missing userinfoUrl.`);
    }

    const res = await fetch(provider.userinfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data: any = await res.json();
    return {
      providerAccountId: String(data.sub || data.id),
      email: data.email || null,
      emailVerified: Boolean(data.email_verified ?? data.email),
      fullName: data.name || data.preferred_username || null,
      avatarUrl: data.picture || data.avatar_url || null,
    };
  }
}
