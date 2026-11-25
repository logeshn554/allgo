import type { UserSummary } from './users.types';

export type TwoFactorPolicy = 'DISABLED' | 'OPTIONAL' | 'REQUIRED_FOR_ADMINS' | 'REQUIRED_FOR_ALL';

export interface SendOtpResponse {
  status: string;
  cooldownSeconds: number;
}

export interface AuthResponse {
  authenticated?: boolean;
  accessToken?: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn: number;
  deviceId?: string;
  user: UserSummary;
}

export interface TwoFactorChallengeResponse {
  requiresTwoFactor: true;
  twoFactorToken: string;
  methods: Array<'totp' | 'backup_code'>;
  user: UserSummary;
}

export type AuthLoginResult = AuthResponse | TwoFactorChallengeResponse;

export function isTwoFactorChallenge(res: AuthLoginResult): res is TwoFactorChallengeResponse {
  return 'requiresTwoFactor' in res && res.requiresTwoFactor === true;
}

export interface IdentifierLookupResponse {
  exists: boolean;
  identifierType: 'email' | 'phone';
  normalizedIdentifier: string;
  allowSelfSignup: boolean;
  hasPassword: boolean;
  twoFactorEnabled: boolean;
  availableMethods: {
    password: boolean;
    emailOtp: boolean;
    phoneOtp: boolean;
  };
}

export interface TwoFactorStatusResponse {
  enabled: boolean;
  enabledAt: string | null;
  backupCodesRemaining: number;
  policy: TwoFactorPolicy;
  setupRequired?: boolean;
}

export interface TwoFactorSetupResponse {
  secret: string;
  otpAuthUri: string;
}

export interface TwoFactorEnableResponse {
  enabled: boolean;
  backupCodes: string[];
}

export interface LogoutResponse {
  success: boolean;
  message?: string;
}

export interface StoredAdminSession {
  userId: string;
  user: UserSummary;
  addedAt: string;
  lastActiveAt: string;
}

export interface ActiveDeviceSession {
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
  isCurrent?: boolean;
}

export interface LinkedIdentity {
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
