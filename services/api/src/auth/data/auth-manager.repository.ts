import crypto from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '../../config/config.service.js';
import { DatabaseService } from '../../database/database.service.js';
import { parseDeviceName } from '../device-utils.js';
import { UserEntity } from './auth.repository.js';

export type TwoFactorPolicy = 'DISABLED' | 'OPTIONAL' | 'REQUIRED_FOR_ADMINS' | 'REQUIRED_FOR_ALL';

export interface AuthSettingsRecord {
  phoneOtpEnabled: boolean;
  emailPasswordEnabled: boolean;
  emailOtpEnabled: boolean;
  oauthEnabled: boolean;
  allowSelfSignup: boolean;
  autoLinkVerifiedAccounts: boolean;
  requireEmailVerification: boolean;
  twoFactorPolicy: TwoFactorPolicy;
  maxDevicesPerUser: number;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  updatedAt: string;
}

export interface AuthProviderRecord {
  id: string;
  slug: string;
  displayName: string;
  providerType: 'OAUTH2' | 'OIDC';
  enabled: boolean;
  clientId: string | null;
  hasClientSecret: boolean;
  clientSecret?: string | null;
  scopes: string;
  authorizationUrl: string | null;
  tokenUrl: string | null;
  userinfoUrl: string | null;
  issuerUrl: string | null;
  autoLink: boolean;
  allowSignup: boolean;
  icon: string | null;
  sortOrder: number;
  updatedAt: string;
}

export interface UserIdentityRecord {
  id: string;
  userId: string;
  provider: string;
  providerAccountId: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  verified: boolean;
  lastUsedAt: string;
  createdAt: string;
}

export interface DeviceSessionRecord {
  id: string;
  userId: string;
  deviceId: string;
  platform: string;
  deviceName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  loginMethod: string | null;
  lastActiveAt: string;
  createdAt: string;
}

export interface ExtendedUserEntity extends UserEntity {
  email?: string | null;
  fullName?: string | null;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  avatarUrl?: string | null;
  passwordHash?: string | null;
  lastLoginAt?: string | null;
  lastLoginMethod?: string | null;
  twoFactorEnabled?: boolean;
  twoFactorSecretEncrypted?: string | null;
  twoFactorBackupCodesHash?: string[];
  twoFactorEnabledAt?: string | null;
}

@Injectable()
export class AuthManagerRepository {
  private memSettings: AuthSettingsRecord = {
    phoneOtpEnabled: true,
    emailPasswordEnabled: true,
    emailOtpEnabled: true,
    oauthEnabled: true,
    allowSelfSignup: true,
    autoLinkVerifiedAccounts: true,
    requireEmailVerification: false,
    twoFactorPolicy: 'OPTIONAL',
    maxDevicesPerUser: 5,
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 604800,
    updatedAt: new Date().toISOString(),
  };

  private readonly memProviders = new Map<string, AuthProviderRecord>([
    [
      'google',
      {
        id: 'prov-google',
        slug: 'google',
        displayName: 'Google',
        providerType: 'OIDC',
        enabled: Boolean(process.env.GOOGLE_CLIENT_ID),
        clientId: process.env.GOOGLE_CLIENT_ID || null,
        hasClientSecret: Boolean(process.env.GOOGLE_CLIENT_SECRET),
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || null,
        scopes: 'openid email profile',
        authorizationUrl: null,
        tokenUrl: null,
        userinfoUrl: null,
        issuerUrl: null,
        autoLink: true,
        allowSignup: true,
        icon: 'google',
        sortOrder: 1,
        updatedAt: new Date().toISOString(),
      },
    ],
    [
      'github',
      {
        id: 'prov-github',
        slug: 'github',
        displayName: 'GitHub',
        providerType: 'OAUTH2',
        enabled: Boolean(process.env.GITHUB_CLIENT_ID),
        clientId: process.env.GITHUB_CLIENT_ID || null,
        hasClientSecret: Boolean(process.env.GITHUB_CLIENT_SECRET),
        clientSecret: process.env.GITHUB_CLIENT_SECRET || null,
        scopes: 'read:user user:email',
        authorizationUrl: null,
        tokenUrl: null,
        userinfoUrl: null,
        issuerUrl: null,
        autoLink: true,
        allowSignup: true,
        icon: 'github',
        sortOrder: 2,
        updatedAt: new Date().toISOString(),
      },
    ],
    [
      'apple',
      {
        id: 'prov-apple',
        slug: 'apple',
        displayName: 'Apple',
        providerType: 'OIDC',
        enabled: false,
        clientId: null,
        hasClientSecret: false,
        clientSecret: null,
        scopes: 'name email',
        authorizationUrl: null,
        tokenUrl: null,
        userinfoUrl: null,
        issuerUrl: null,
        autoLink: true,
        allowSignup: true,
        icon: 'apple',
        sortOrder: 3,
        updatedAt: new Date().toISOString(),
      },
    ],
    [
      'microsoft',
      {
        id: 'prov-microsoft',
        slug: 'microsoft',
        displayName: 'Microsoft',
        providerType: 'OIDC',
        enabled: false,
        clientId: null,
        hasClientSecret: false,
        clientSecret: null,
        scopes: 'openid email profile',
        authorizationUrl: null,
        tokenUrl: null,
        userinfoUrl: null,
        issuerUrl: null,
        autoLink: true,
        allowSignup: true,
        icon: 'microsoft',
        sortOrder: 4,
        updatedAt: new Date().toISOString(),
      },
    ],
  ]);

  private readonly memUsers = new Map<string, ExtendedUserEntity>();
  private readonly memIdentities = new Map<string, UserIdentityRecord>();
  private readonly memDevices = new Map<string, DeviceSessionRecord>();
  private readonly memSessionHashes = new Map<
    string,
    { sessionTokenHash: string; sessionExpiresAt: number }
  >();

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  private deriveEncryptionKey(): Buffer {
    return crypto.createHash('sha256').update(this.config.jwtSecret).digest();
  }

  encryptSecret(plain: string): string {
    const iv = crypto.randomBytes(12);
    const key = this.deriveEncryptionKey();
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
  }

  decryptSecret(encrypted: string | null | undefined): string | null {
    if (!encrypted) return null;
    const parts = encrypted.split(':');
    if (parts.length !== 3) return encrypted;
    try {
      const [ivHex, tagHex, dataHex] = parts;
      if (!ivHex || !tagHex || !dataHex) return null;
      const key = this.deriveEncryptionKey();
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
      decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
      const dec = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
      return dec.toString('utf8');
    } catch {
      return null;
    }
  }

  // ==================== SETTINGS ====================

  async getSettings(): Promise<AuthSettingsRecord> {
    try {
      const res = await this.db.query(`SELECT * FROM auth_settings WHERE id = 1;`);
      if (res.rows.length > 0) {
        const r = res.rows[0];
        const record: AuthSettingsRecord = {
          phoneOtpEnabled: r.phone_otp_enabled,
          emailPasswordEnabled: r.email_password_enabled,
          emailOtpEnabled: r.email_otp_enabled,
          oauthEnabled: r.oauth_enabled,
          allowSelfSignup: r.allow_self_signup,
          autoLinkVerifiedAccounts: r.auto_link_verified_accounts,
          requireEmailVerification: r.require_email_verification,
          twoFactorPolicy: (r.two_factor_policy as TwoFactorPolicy) || 'OPTIONAL',
          maxDevicesPerUser: r.max_devices_per_user,
          accessTokenTtlSeconds: r.access_token_ttl_seconds,
          refreshTokenTtlSeconds: r.refresh_token_ttl_seconds,
          updatedAt: r.updated_at?.toISOString?.() || new Date().toISOString(),
        };
        this.memSettings = record;
        return record;
      }
    } catch (err: any) {
      if (this.isDatabaseConnectivityError(err) && this.memUsers.size === 0) {
        throw new ServiceUnavailableException(
          'Database service is temporarily unavailable. Please try again shortly.',
        );
      }
      // Fallback to in-memory settings
    }
    return this.memSettings;
  }

  private isDatabaseConnectivityError(err: any): boolean {
    const code = err?.code;
    return (
      code === 'ENOTFOUND' ||
      code === 'ECONNREFUSED' ||
      code === 'ETIMEDOUT' ||
      code === 'EAI_AGAIN' ||
      code === 'ECONNRESET' ||
      code === '57P01' ||
      code === '08001' ||
      code === '08006'
    );
  }

  async updateSettings(
    patch: Partial<Omit<AuthSettingsRecord, 'updatedAt'>>,
    updatedBy?: string,
  ): Promise<AuthSettingsRecord> {
    const current = await this.getSettings();
    const next: AuthSettingsRecord = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.memSettings = next;

    try {
      await this.db.query(
        `UPDATE auth_settings
         SET phone_otp_enabled = $1,
             email_password_enabled = $2,
             email_otp_enabled = $3,
             oauth_enabled = $4,
             allow_self_signup = $5,
             auto_link_verified_accounts = $6,
             require_email_verification = $7,
             two_factor_policy = $8,
             max_devices_per_user = $9,
             access_token_ttl_seconds = $10,
             refresh_token_ttl_seconds = $11,
             updated_by = $12,
             updated_at = NOW()
         WHERE id = 1;`,
        [
          next.phoneOtpEnabled,
          next.emailPasswordEnabled,
          next.emailOtpEnabled,
          next.oauthEnabled,
          next.allowSelfSignup,
          next.autoLinkVerifiedAccounts,
          next.requireEmailVerification,
          next.twoFactorPolicy || 'OPTIONAL',
          next.maxDevicesPerUser,
          next.accessTokenTtlSeconds,
          next.refreshTokenTtlSeconds,
          updatedBy || null,
        ],
      );
    } catch {
      // In-memory updated
    }
    return next;
  }

  // ==================== PROVIDERS ====================

  private mapProviderRow(r: any, includeSecret = false): AuthProviderRecord {
    const secret = includeSecret ? this.decryptSecret(r.client_secret_encrypted) : undefined;
    return {
      id: r.id,
      slug: r.slug,
      displayName: r.display_name,
      providerType: r.provider_type || 'OAUTH2',
      enabled: Boolean(r.enabled),
      clientId: r.client_id || null,
      hasClientSecret: Boolean(r.client_secret_encrypted),
      ...(includeSecret ? { clientSecret: secret } : {}),
      scopes: r.scopes || 'openid email profile',
      authorizationUrl: r.authorization_url || null,
      tokenUrl: r.token_url || null,
      userinfoUrl: r.userinfo_url || null,
      issuerUrl: r.issuer_url || null,
      autoLink: Boolean(r.auto_link),
      allowSignup: Boolean(r.allow_signup),
      icon: r.icon || r.slug,
      sortOrder: Number(r.sort_order ?? 0),
      updatedAt: r.updated_at?.toISOString?.() || new Date().toISOString(),
    };
  }

  async listProviders(includeSecrets = false): Promise<AuthProviderRecord[]> {
    try {
      const res = await this.db.query(
        `SELECT * FROM auth_providers ORDER BY sort_order ASC, display_name ASC;`,
      );
      if (res.rows.length > 0) {
        return res.rows.map((r) => this.mapProviderRow(r, includeSecrets));
      }
    } catch {
      // Fallback to in-memory
    }
    return Array.from(this.memProviders.values())
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => {
        if (includeSecrets) return p;
        const { clientSecret: _, ...safe } = p;
        return safe;
      });
  }

  async getProviderBySlug(slug: string, includeSecret = false): Promise<AuthProviderRecord | null> {
    const normalized = slug.toLowerCase().trim();
    try {
      const res = await this.db.query(`SELECT * FROM auth_providers WHERE slug = $1;`, [
        normalized,
      ]);
      if (res.rows.length > 0) {
        return this.mapProviderRow(res.rows[0], includeSecret);
      }
    } catch {
      // Fallback
    }
    const mem = this.memProviders.get(normalized);
    if (!mem) return null;
    if (includeSecret) return mem;
    const { clientSecret: _, ...safe } = mem;
    return safe;
  }

  async upsertProvider(input: {
    slug: string;
    displayName?: string;
    providerType?: 'OAUTH2' | 'OIDC';
    enabled?: boolean;
    clientId?: string | null;
    clientSecret?: string | null;
    scopes?: string;
    authorizationUrl?: string | null;
    tokenUrl?: string | null;
    userinfoUrl?: string | null;
    issuerUrl?: string | null;
    autoLink?: boolean;
    allowSignup?: boolean;
    icon?: string | null;
    sortOrder?: number;
  }): Promise<AuthProviderRecord> {
    const slug = input.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]/g, '-');
    const existing = await this.getProviderBySlug(slug, true);

    const encryptedSecret =
      input.clientSecret !== undefined
        ? input.clientSecret
          ? this.encryptSecret(input.clientSecret)
          : null
        : existing?.clientSecret
          ? this.encryptSecret(existing.clientSecret)
          : null;

    const merged: AuthProviderRecord = {
      id: existing?.id || crypto.randomUUID(),
      slug,
      displayName: input.displayName ?? existing?.displayName ?? slug,
      providerType: input.providerType ?? existing?.providerType ?? 'OAUTH2',
      enabled: input.enabled ?? existing?.enabled ?? false,
      clientId: input.clientId !== undefined ? input.clientId : (existing?.clientId ?? null),
      hasClientSecret: Boolean(encryptedSecret),
      clientSecret:
        input.clientSecret !== undefined ? input.clientSecret : (existing?.clientSecret ?? null),
      scopes: input.scopes ?? existing?.scopes ?? 'openid email profile',
      authorizationUrl:
        input.authorizationUrl !== undefined
          ? input.authorizationUrl
          : (existing?.authorizationUrl ?? null),
      tokenUrl: input.tokenUrl !== undefined ? input.tokenUrl : (existing?.tokenUrl ?? null),
      userinfoUrl:
        input.userinfoUrl !== undefined ? input.userinfoUrl : (existing?.userinfoUrl ?? null),
      issuerUrl: input.issuerUrl !== undefined ? input.issuerUrl : (existing?.issuerUrl ?? null),
      autoLink: input.autoLink ?? existing?.autoLink ?? true,
      allowSignup: input.allowSignup ?? existing?.allowSignup ?? true,
      icon: input.icon ?? existing?.icon ?? slug,
      sortOrder: input.sortOrder ?? existing?.sortOrder ?? 10,
      updatedAt: new Date().toISOString(),
    };

    this.memProviders.set(slug, merged);

    try {
      const res = await this.db.query(
        `INSERT INTO auth_providers (
           id, slug, display_name, provider_type, enabled, client_id, client_secret_encrypted,
           scopes, authorization_url, token_url, userinfo_url, issuer_url,
           auto_link, allow_signup, icon, sort_order, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW())
         ON CONFLICT (slug) DO UPDATE SET
           display_name = EXCLUDED.display_name,
           provider_type = EXCLUDED.provider_type,
           enabled = EXCLUDED.enabled,
           client_id = EXCLUDED.client_id,
           client_secret_encrypted = COALESCE(EXCLUDED.client_secret_encrypted, auth_providers.client_secret_encrypted),
           scopes = EXCLUDED.scopes,
           authorization_url = EXCLUDED.authorization_url,
           token_url = EXCLUDED.token_url,
           userinfo_url = EXCLUDED.userinfo_url,
           issuer_url = EXCLUDED.issuer_url,
           auto_link = EXCLUDED.auto_link,
           allow_signup = EXCLUDED.allow_signup,
           icon = EXCLUDED.icon,
           sort_order = EXCLUDED.sort_order,
           updated_at = NOW()
         RETURNING *;`,
        [
          merged.id,
          merged.slug,
          merged.displayName,
          merged.providerType,
          merged.enabled,
          merged.clientId,
          encryptedSecret,
          merged.scopes,
          merged.authorizationUrl,
          merged.tokenUrl,
          merged.userinfoUrl,
          merged.issuerUrl,
          merged.autoLink,
          merged.allowSignup,
          merged.icon,
          merged.sortOrder,
        ],
      );
      if (res.rows.length > 0) {
        return this.mapProviderRow(res.rows[0], false);
      }
    } catch {
      // In-memory updated
    }

    const { clientSecret: _, ...safe } = merged;
    return safe;
  }

  async deleteProvider(slug: string): Promise<{ success: boolean }> {
    const normalized = slug.toLowerCase().trim();
    this.memProviders.delete(normalized);
    try {
      await this.db.query(`DELETE FROM auth_providers WHERE slug = $1;`, [normalized]);
    } catch {
      // Ignore offline
    }
    return { success: true };
  }

  // ==================== USERS & IDENTITIES ====================

  private mapUserRow(r: any): ExtendedUserEntity {
    return {
      id: r.id,
      phone: r.phone || '',
      email: r.email || null,
      fullName: r.full_name || null,
      status: r.status,
      roles: Array.isArray(r.roles) ? r.roles : ['CUSTOMER'],
      defaultLanguage: r.default_language || 'en',
      emailVerified: Boolean(r.email_verified),
      phoneVerified: Boolean(r.phone_verified),
      avatarUrl: r.avatar_url || null,
      passwordHash: r.password_hash || null,
      lastLoginAt: r.last_login_at?.toISOString?.() || null,
      lastLoginMethod: r.last_login_method || null,
      twoFactorEnabled: Boolean(r.two_factor_enabled),
      twoFactorSecretEncrypted: r.two_factor_secret_encrypted || null,
      twoFactorBackupCodesHash: Array.isArray(r.two_factor_backup_codes_hash)
        ? r.two_factor_backup_codes_hash
        : [],
      twoFactorEnabledAt: r.two_factor_enabled_at?.toISOString?.() || null,
    };
  }

  async findUserById(userId: string): Promise<ExtendedUserEntity | null> {
    try {
      const res = await this.db.query(
        `SELECT u.*, COALESCE(json_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '["CUSTOMER"]') as roles
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
         WHERE u.id = $1
         GROUP BY u.id;`,
        [userId],
      );
      if (res.rows.length > 0) {
        return this.mapUserRow(res.rows[0]);
      }
      return null;
    } catch {
      return this.memUsers.get(userId) || null;
    }
  }

  async findUserByPhone(phone: string): Promise<ExtendedUserEntity | null> {
    const normalized = phone.trim();
    try {
      const res = await this.db.query(
        `SELECT u.*, COALESCE(json_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '["CUSTOMER"]') as roles
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
         WHERE u.phone = $1
            OR EXISTS (
              SELECT 1 FROM user_identities ui
              WHERE ui.user_id = u.id AND ui.provider = 'phone' AND ui.phone = $1
            )
         GROUP BY u.id;`,
        [normalized],
      );
      if (res.rows.length > 0) {
        return this.mapUserRow(res.rows[0]);
      }
      return null;
    } catch (err: any) {
      if (this.isDatabaseConnectivityError(err) && this.memUsers.size === 0) {
        throw new ServiceUnavailableException(
          'Database service is temporarily unavailable. Please try again shortly.',
        );
      }
      for (const u of this.memUsers.values()) {
        if (u.phone === normalized) return u;
      }
      for (const identity of this.memIdentities.values()) {
        if (identity.provider === 'phone' && identity.phone === normalized) {
          return this.memUsers.get(identity.userId) || null;
        }
      }
      return null;
    }
  }

  async findUserByEmail(email: string): Promise<ExtendedUserEntity | null> {
    const normalized = email.toLowerCase().trim();
    try {
      const res = await this.db.query(
        `SELECT u.*, COALESCE(json_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '["CUSTOMER"]') as roles
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
         WHERE LOWER(u.email) = $1
            OR EXISTS (
              SELECT 1 FROM user_identities ui
              WHERE ui.user_id = u.id AND ui.provider = 'email' AND LOWER(ui.email) = $1
            )
         GROUP BY u.id;`,
        [normalized],
      );
      if (res.rows.length > 0) {
        return this.mapUserRow(res.rows[0]);
      }
      return null;
    } catch (err: any) {
      if (this.isDatabaseConnectivityError(err) && this.memUsers.size === 0) {
        throw new ServiceUnavailableException(
          'Database service is temporarily unavailable. Please try again shortly.',
        );
      }
      for (const u of this.memUsers.values()) {
        if (u.email?.toLowerCase() === normalized) return u;
      }
      for (const identity of this.memIdentities.values()) {
        if (identity.provider === 'email' && identity.email?.toLowerCase() === normalized) {
          return this.memUsers.get(identity.userId) || null;
        }
      }
      return null;
    }
  }

  async findUserByIdentity(
    provider: string,
    providerAccountId: string,
  ): Promise<ExtendedUserEntity | null> {
    try {
      const res = await this.db.query(
        `SELECT u.*, COALESCE(json_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '["CUSTOMER"]') as roles
         FROM user_identities ui
         JOIN users u ON u.id = ui.user_id
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
         WHERE ui.provider = $1 AND ui.provider_account_id = $2
         GROUP BY u.id;`,
        [provider, providerAccountId],
      );
      if (res.rows.length > 0) {
        return this.mapUserRow(res.rows[0]);
      }
      return null;
    } catch {
      const key = `${provider}:${providerAccountId}`;
      const identity = this.memIdentities.get(key);
      if (identity) {
        return this.memUsers.get(identity.userId) || null;
      }
      return null;
    }
  }

  async createUserWithIdentity(input: {
    phone?: string | null;
    email?: string | null;
    fullName?: string | null;
    avatarUrl?: string | null;
    passwordHash?: string | null;
    emailVerified?: boolean;
    phoneVerified?: boolean;
    role?: string;
    provider: string;
    providerAccountId: string;
    loginMethod: string;
  }): Promise<ExtendedUserEntity> {
    const newUserId = crypto.randomUUID();
    const roleName = input.role || 'CUSTOMER';
    const normalizedEmail = input.email ? input.email.toLowerCase().trim() : null;

    const user: ExtendedUserEntity = {
      id: newUserId,
      phone: input.phone || '',
      email: normalizedEmail,
      fullName: input.fullName || null,
      status: 'ACTIVE',
      roles: [roleName],
      defaultLanguage: 'en',
      emailVerified: Boolean(input.emailVerified),
      phoneVerified: Boolean(input.phoneVerified),
      avatarUrl: input.avatarUrl || null,
      passwordHash: input.passwordHash || null,
      lastLoginAt: new Date().toISOString(),
      lastLoginMethod: input.loginMethod,
    };

    this.memUsers.set(newUserId, user);
    this.memIdentities.set(`${input.provider}:${input.providerAccountId}`, {
      id: crypto.randomUUID(),
      userId: newUserId,
      provider: input.provider,
      providerAccountId: input.providerAccountId,
      email: normalizedEmail,
      phone: input.phone || null,
      displayName: input.fullName || null,
      avatarUrl: input.avatarUrl || null,
      verified: Boolean(input.emailVerified || input.phoneVerified),
      lastUsedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    try {
      await this.db.transaction(async (client) => {
        await client.query(
          `INSERT INTO users (
             id, phone, email, full_name, status, firebase_uid, default_language,
             email_verified, phone_verified, password_hash, avatar_url, last_login_at, last_login_method
           ) VALUES ($1,$2,$3,$4,'ACTIVE',$5,'en',$6,$7,$8,$9,NOW(),$10);`,
          [
            newUserId,
            input.phone || null,
            normalizedEmail,
            input.fullName || null,
            `local_${newUserId}`,
            Boolean(input.emailVerified),
            Boolean(input.phoneVerified),
            input.passwordHash || null,
            input.avatarUrl || null,
            input.loginMethod,
          ],
        );

        const roleRes = await client.query(`SELECT id FROM roles WHERE name = $1;`, [roleName]);
        let roleId: string;
        if (roleRes.rows.length === 0) {
          roleId = crypto.randomUUID();
          await client.query(`INSERT INTO roles (id, name, description) VALUES ($1, $2, $3);`, [
            roleId,
            roleName,
            `${roleName} role`,
          ]);
        } else {
          roleId = roleRes.rows[0].id;
        }

        await client.query(
          `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
          [newUserId, roleId],
        );

        await client.query(
          `INSERT INTO user_identities (
             user_id, provider, provider_account_id, email, phone, display_name, avatar_url, verified
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (provider, provider_account_id) DO NOTHING;`,
          [
            newUserId,
            input.provider,
            input.providerAccountId,
            normalizedEmail,
            input.phone || null,
            input.fullName || null,
            input.avatarUrl || null,
            Boolean(input.emailVerified || input.phoneVerified),
          ],
        );
      });
    } catch {
      // In-memory created
    }

    return user;
  }

  async linkIdentity(input: {
    userId: string;
    provider: string;
    providerAccountId: string;
    email?: string | null;
    phone?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
    verified?: boolean;
  }): Promise<UserIdentityRecord> {
    const memKey = `${input.provider}:${input.providerAccountId}`;
    const existingMem = this.memIdentities.get(memKey);
    if (existingMem && existingMem.userId !== input.userId) {
      throw new ConflictException(
        `This ${input.provider} account is already linked to another user.`,
      );
    }

    try {
      const existingDb = await this.db.query(
        `SELECT user_id FROM user_identities WHERE provider = $1 AND provider_account_id = $2 LIMIT 1;`,
        [input.provider, input.providerAccountId],
      );
      if (existingDb.rows.length > 0 && existingDb.rows[0].user_id !== input.userId) {
        throw new ConflictException(
          `This ${input.provider} account is already linked to another user.`,
        );
      }
    } catch (err) {
      if (err instanceof ConflictException) throw err;
    }

    const id = crypto.randomUUID();
    const record: UserIdentityRecord = {
      id,
      userId: input.userId,
      provider: input.provider,
      providerAccountId: input.providerAccountId,
      email: input.email ? input.email.toLowerCase().trim() : null,
      phone: input.phone || null,
      displayName: input.displayName || null,
      avatarUrl: input.avatarUrl || null,
      verified: Boolean(input.verified),
      lastUsedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    this.memIdentities.set(memKey, record);
    const memUser = this.memUsers.get(input.userId);
    if (memUser) {
      if (input.provider === 'email' && record.email) {
        if (!memUser.email) memUser.email = record.email;
        if (record.verified) memUser.emailVerified = true;
      } else if (input.provider === 'phone' && record.phone) {
        if (!memUser.phone) memUser.phone = record.phone;
        if (record.verified) memUser.phoneVerified = true;
      }
    }

    try {
      const res = await this.db.query(
        `INSERT INTO user_identities (
           id, user_id, provider, provider_account_id, email, phone, display_name, avatar_url, verified
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (provider, provider_account_id) DO UPDATE SET
           last_used_at = NOW(),
           verified = user_identities.verified OR EXCLUDED.verified,
           display_name = COALESCE(EXCLUDED.display_name, user_identities.display_name),
           avatar_url = COALESCE(EXCLUDED.avatar_url, user_identities.avatar_url)
         RETURNING *;`,
        [
          id,
          input.userId,
          input.provider,
          input.providerAccountId,
          record.email,
          record.phone,
          record.displayName,
          record.avatarUrl,
          record.verified,
        ],
      );

      if (input.provider === 'email' && record.email) {
        await this.db.query(
          `UPDATE users
           SET email = COALESCE(email, $2),
               email_verified = CASE WHEN $3 THEN TRUE ELSE email_verified END,
               updated_at = NOW()
           WHERE id = $1;`,
          [input.userId, record.email, record.verified],
        );
      } else if (input.provider === 'phone' && record.phone) {
        await this.db.query(
          `UPDATE users
           SET phone = COALESCE(phone, $2),
               phone_verified = CASE WHEN $3 THEN TRUE ELSE phone_verified END,
               updated_at = NOW()
           WHERE id = $1;`,
          [input.userId, record.phone, record.verified],
        );
      }

      if (res.rows.length > 0) {
        const r = res.rows[0];
        return {
          id: r.id,
          userId: r.user_id,
          provider: r.provider,
          providerAccountId: r.provider_account_id,
          email: r.email,
          phone: r.phone,
          displayName: r.display_name,
          avatarUrl: r.avatar_url,
          verified: Boolean(r.verified),
          lastUsedAt: r.last_used_at?.toISOString?.() || record.lastUsedAt,
          createdAt: r.created_at?.toISOString?.() || record.createdAt,
        };
      }
    } catch {
      // In-memory stored
    }
    return record;
  }

  async listIdentitiesForUser(userId: string): Promise<UserIdentityRecord[]> {
    try {
      const res = await this.db.query(
        `SELECT * FROM user_identities WHERE user_id = $1 ORDER BY created_at ASC;`,
        [userId],
      );
      return res.rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        provider: r.provider,
        providerAccountId: r.provider_account_id,
        email: r.email,
        phone: r.phone,
        displayName: r.display_name,
        avatarUrl: r.avatar_url,
        verified: Boolean(r.verified),
        lastUsedAt: r.last_used_at?.toISOString?.() || new Date().toISOString(),
        createdAt: r.created_at?.toISOString?.() || new Date().toISOString(),
      }));
    } catch {
      return Array.from(this.memIdentities.values()).filter((i) => i.userId === userId);
    }
  }

  async unlinkIdentity(userId: string, identityId: string): Promise<{ success: boolean }> {
    const existing = await this.listIdentitiesForUser(userId);
    const target = existing.find((i) => i.id === identityId);
    if (!target) {
      return { success: true };
    }
    if (existing.length <= 1) {
      throw new BadRequestException('Cannot unlink the only remaining authentication method.');
    }

    for (const [k, v] of this.memIdentities.entries()) {
      if (v.userId === userId && v.id === identityId) {
        this.memIdentities.delete(k);
      }
    }

    const memUser = this.memUsers.get(userId);
    if (memUser) {
      if (
        target.provider === 'email' &&
        target.email &&
        memUser.email?.toLowerCase() === target.email.toLowerCase()
      ) {
        memUser.email = null;
        memUser.emailVerified = false;
      } else if (target.provider === 'phone' && target.phone && memUser.phone === target.phone) {
        memUser.phone = '';
        memUser.phoneVerified = false;
      }
    }

    try {
      await this.db.query(`DELETE FROM user_identities WHERE id = $1 AND user_id = $2;`, [
        identityId,
        userId,
      ]);
      if (target.provider === 'email' && target.email) {
        await this.db.query(
          `UPDATE users
           SET email = NULL, email_verified = FALSE, updated_at = NOW()
           WHERE id = $1 AND LOWER(email) = $2;`,
          [userId, target.email.toLowerCase()],
        );
      } else if (target.provider === 'phone' && target.phone) {
        await this.db.query(
          `UPDATE users
           SET phone = NULL, phone_verified = FALSE, updated_at = NOW()
           WHERE id = $1 AND phone = $2;`,
          [userId, target.phone],
        );
      }
    } catch {
      // Ignore offline
    }
    return { success: true };
  }

  async recordLoginAudit(
    userId: string,
    loginMethod: string,
    provider?: string,
    providerAccountId?: string,
  ) {
    try {
      await this.db.query(
        `UPDATE users SET last_login_at = NOW(), last_login_method = $2, updated_at = NOW() WHERE id = $1;`,
        [userId, loginMethod],
      );
      if (provider && providerAccountId) {
        await this.db.query(
          `UPDATE user_identities SET last_used_at = NOW() WHERE provider = $1 AND provider_account_id = $2;`,
          [provider, providerAccountId],
        );
      }
    } catch {
      // Ignore offline
    }
  }

  async updateUserPasswordHash(
    userId: string,
    passwordHash: string,
    verifyEmail = false,
  ): Promise<void> {
    const memUser = this.memUsers.get(userId);
    if (memUser) {
      memUser.passwordHash = passwordHash;
      if (verifyEmail) memUser.emailVerified = true;
    }
    try {
      await this.db.query(
        `UPDATE users
         SET password_hash = $2,
             email_verified = CASE WHEN $3 THEN TRUE ELSE email_verified END,
             updated_at = NOW()
         WHERE id = $1;`,
        [userId, passwordHash, verifyEmail],
      );
    } catch {
      // In-memory updated
    }
  }

  async enableTwoFactor(
    userId: string,
    encryptedSecret: string,
    backupCodeHashes: string[],
  ): Promise<void> {
    const now = new Date().toISOString();
    const memUser = this.memUsers.get(userId);
    if (memUser) {
      memUser.twoFactorEnabled = true;
      memUser.twoFactorSecretEncrypted = encryptedSecret;
      memUser.twoFactorBackupCodesHash = backupCodeHashes;
      memUser.twoFactorEnabledAt = now;
    }
    try {
      await this.db.query(
        `UPDATE users
         SET two_factor_enabled = TRUE,
             two_factor_secret_encrypted = $2,
             two_factor_backup_codes_hash = $3::jsonb,
             two_factor_enabled_at = NOW(),
             updated_at = NOW()
         WHERE id = $1;`,
        [userId, encryptedSecret, JSON.stringify(backupCodeHashes)],
      );
    } catch {
      // In-memory updated
    }
  }

  async disableTwoFactor(userId: string): Promise<void> {
    const memUser = this.memUsers.get(userId);
    if (memUser) {
      memUser.twoFactorEnabled = false;
      memUser.twoFactorSecretEncrypted = null;
      memUser.twoFactorBackupCodesHash = [];
      memUser.twoFactorEnabledAt = null;
    }
    try {
      await this.db.query(
        `UPDATE users
         SET two_factor_enabled = FALSE,
             two_factor_secret_encrypted = NULL,
             two_factor_backup_codes_hash = '[]'::jsonb,
             two_factor_enabled_at = NULL,
             updated_at = NOW()
         WHERE id = $1;`,
        [userId],
      );
    } catch {
      // In-memory updated
    }
  }

  async updateBackupCodeHashes(userId: string, remainingHashes: string[]): Promise<void> {
    const memUser = this.memUsers.get(userId);
    if (memUser) {
      memUser.twoFactorBackupCodesHash = remainingHashes;
    }
    try {
      await this.db.query(
        `UPDATE users
         SET two_factor_backup_codes_hash = $2::jsonb,
             updated_at = NOW()
         WHERE id = $1;`,
        [userId, JSON.stringify(remainingHashes)],
      );
    } catch {
      // In-memory updated
    }
  }

  // ==================== DEVICES & SESSIONS ====================

  async recordDeviceWithMetadata(input: {
    userId: string;
    deviceId: string;
    platform: string;
    refreshToken?: string | null;
    sessionTokenHash?: string | null;
    sessionExpiresAt?: Date | null;
    deviceName?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    loginMethod?: string;
  }): Promise<{ evictedDevices: Array<{ deviceId: string; sessionTokenHash?: string | null }> }> {
    const hash = input.refreshToken
      ? crypto.createHash('sha256').update(input.refreshToken).digest('hex')
      : null;
    const now = new Date().toISOString();
    const resolvedDeviceName = input.deviceName || parseDeviceName(input.userAgent, input.platform);
    const evictedDevices: Array<{ deviceId: string; sessionTokenHash?: string | null }> = [];

    const existingKey = `${input.userId}:${input.deviceId}`;
    const prevMem = this.memDevices.get(existingKey);
    this.memDevices.set(existingKey, {
      id: prevMem?.id || crypto.randomUUID(),
      userId: input.userId,
      deviceId: input.deviceId,
      platform: input.platform,
      deviceName: resolvedDeviceName,
      ipAddress: input.ipAddress ?? prevMem?.ipAddress ?? null,
      userAgent: input.userAgent ?? prevMem?.userAgent ?? null,
      loginMethod: input.loginMethod || prevMem?.loginMethod || 'PHONE_OTP',
      lastActiveAt: now,
      createdAt: prevMem?.createdAt || now,
    });

    if (input.sessionTokenHash && input.sessionExpiresAt) {
      this.memSessionHashes.set(existingKey, {
        sessionTokenHash: input.sessionTokenHash,
        sessionExpiresAt: input.sessionExpiresAt.getTime(),
      });
    }

    const settings = await this.getSettings();
    const maxDevices = settings.maxDevicesPerUser || 0;

    try {
      await this.db.query(
        `INSERT INTO devices (
           id, user_id, device_id, platform, refresh_token_hash,
           session_token_hash, session_expires_at,
           device_name, ip_address, user_agent, login_method, last_active_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
         ON CONFLICT (user_id, device_id) DO UPDATE SET
           platform = EXCLUDED.platform,
           refresh_token_hash = COALESCE(EXCLUDED.refresh_token_hash, devices.refresh_token_hash),
           session_token_hash = COALESCE(EXCLUDED.session_token_hash, devices.session_token_hash),
           session_expires_at = COALESCE(EXCLUDED.session_expires_at, devices.session_expires_at),
           device_name = COALESCE(EXCLUDED.device_name, devices.device_name),
           ip_address = COALESCE(EXCLUDED.ip_address, devices.ip_address),
           user_agent = COALESCE(EXCLUDED.user_agent, devices.user_agent),
           login_method = EXCLUDED.login_method,
           last_active_at = NOW();`,
        [
          crypto.randomUUID(),
          input.userId,
          input.deviceId,
          input.platform,
          hash,
          input.sessionTokenHash || null,
          input.sessionExpiresAt || null,
          resolvedDeviceName,
          input.ipAddress || null,
          input.userAgent || null,
          input.loginMethod || 'PHONE_OTP',
        ],
      );

      if (maxDevices > 0) {
        const overflow = await this.db.query(
          `SELECT id, device_id, session_token_hash
           FROM devices
           WHERE user_id = $1
           ORDER BY last_active_at DESC
           OFFSET $2;`,
          [input.userId, maxDevices],
        );
        for (const row of overflow.rows) {
          await this.db.query(`DELETE FROM devices WHERE id = $1;`, [row.id]);
          this.memDevices.delete(`${input.userId}:${row.device_id}`);
          this.memSessionHashes.delete(`${input.userId}:${row.device_id}`);
          evictedDevices.push({
            deviceId: row.device_id,
            sessionTokenHash: row.session_token_hash || null,
          });
        }
      }
    } catch {
      // In-memory fallback eviction
      if (maxDevices > 0) {
        const userDevices = Array.from(this.memDevices.values())
          .filter((d) => d.userId === input.userId)
          .sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime());
        for (const extra of userDevices.slice(maxDevices)) {
          const k = `${input.userId}:${extra.deviceId}`;
          const sess = this.memSessionHashes.get(k);
          this.memDevices.delete(k);
          this.memSessionHashes.delete(k);
          evictedDevices.push({
            deviceId: extra.deviceId,
            sessionTokenHash: sess?.sessionTokenHash || null,
          });
        }
      }
    }

    return { evictedDevices };
  }

  async listDevicesForUser(userId: string): Promise<DeviceSessionRecord[]> {
    try {
      const res = await this.db.query(
        `SELECT id, user_id, device_id, platform, device_name, ip_address, user_agent, login_method, last_active_at, created_at
         FROM devices
         WHERE user_id = $1
           AND (session_expires_at IS NULL OR session_expires_at > NOW())
         ORDER BY last_active_at DESC;`,
        [userId],
      );
      return res.rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        deviceId: r.device_id,
        platform: r.platform,
        deviceName: r.device_name || parseDeviceName(r.user_agent, r.platform),
        ipAddress: r.ip_address || null,
        userAgent: r.user_agent || null,
        loginMethod: r.login_method || null,
        lastActiveAt: r.last_active_at?.toISOString?.() || new Date().toISOString(),
        createdAt: r.created_at?.toISOString?.() || new Date().toISOString(),
      }));
    } catch {
      const nowMs = Date.now();
      return Array.from(this.memDevices.values())
        .filter((d) => {
          if (d.userId !== userId) return false;
          const sess = this.memSessionHashes.get(`${d.userId}:${d.deviceId}`);
          if (sess && sess.sessionExpiresAt <= nowMs) return false;
          return true;
        })
        .sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime());
    }
  }

  async revokeDeviceForUser(
    userId: string,
    deviceId: string,
  ): Promise<{ success: boolean; sessionTokenHash?: string | null }> {
    const key = `${userId}:${deviceId}`;
    const memSess = this.memSessionHashes.get(key);
    this.memDevices.delete(key);
    this.memSessionHashes.delete(key);
    let sessionTokenHash: string | null = memSess?.sessionTokenHash || null;

    try {
      const res = await this.db.query(
        `DELETE FROM devices WHERE user_id = $1 AND device_id = $2 RETURNING session_token_hash;`,
        [userId, deviceId],
      );
      if (res.rows[0]?.session_token_hash) {
        sessionTokenHash = res.rows[0].session_token_hash;
      }
    } catch {
      // Ignore offline
    }
    return { success: true, sessionTokenHash };
  }

  async revokeAllDevicesForUser(userId: string): Promise<{
    success: boolean;
    revokedDevices: Array<{ deviceId: string; sessionTokenHash?: string | null }>;
  }> {
    const revokedMap = new Map<string, string | null>();
    for (const [k, v] of this.memDevices.entries()) {
      if (v.userId === userId) {
        const sess = this.memSessionHashes.get(k);
        revokedMap.set(v.deviceId, sess?.sessionTokenHash || null);
        this.memDevices.delete(k);
        this.memSessionHashes.delete(k);
      }
    }
    try {
      const res = await this.db.query(
        `DELETE FROM devices WHERE user_id = $1 RETURNING device_id, session_token_hash;`,
        [userId],
      );
      for (const row of res.rows) {
        revokedMap.set(
          row.device_id,
          row.session_token_hash || revokedMap.get(row.device_id) || null,
        );
      }
    } catch {
      // Ignore offline
    }
    return {
      success: true,
      revokedDevices: Array.from(revokedMap.entries()).map(([deviceId, sessionTokenHash]) => ({
        deviceId,
        sessionTokenHash,
      })),
    };
  }
}
