export interface AuthMethodsConfig {
  phoneOtp: boolean;
  emailPassword: boolean;
  emailOtp: boolean;
  oauth: boolean;
  allowSelfSignup: boolean;
}

export interface PublicOAuthProvider {
  slug: string;
  displayName: string;
  providerType: string;
  icon: string | null;
  configured?: boolean;
}

export type IdentifierKind = 'phone' | 'email' | 'unknown';

export type OtpChannel = 'phone' | 'email';

export type LoginStep =
  | 'IDENTIFIER'
  | 'OTP_VERIFY'
  | 'EMAIL_PASSWORD'
  | 'PASSWORD_RESET'
  | 'TWO_FACTOR'
  | 'NO_ACCOUNT';

export type EmailAuthMode = 'signin' | 'signup';

export type IdentifierResolution =
  | {
      ok: true;
      kind: 'phone';
      normalized: string;
      nextAction: 'PHONE_PASSWORD' | 'SEND_PHONE_OTP';
    }
  | {
      ok: true;
      kind: 'email';
      normalized: string;
      nextAction: 'EMAIL_PASSWORD' | 'SEND_EMAIL_OTP';
    }
  | {
      ok: false;
      kind: IdentifierKind;
      error: string;
    };
