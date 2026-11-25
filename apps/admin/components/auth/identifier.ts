import type { AuthMethodsConfig, IdentifierKind, IdentifierResolution } from './types';

const INDIAN_E164_REGEX = /^\+91[6-9]\d{9}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;
const PHONE_CHAR_REGEX = /^[+\d\s\-()]+$/;

/**
 * Automatically detects whether the user is typing a phone number or email address.
 * - Any input containing `@` is treated as an email.
 * - Any input starting with `+` or consisting solely of phone characters with >= 3 digits is treated as a phone number.
 * - Everything else is `unknown`.
 */
export function detectIdentifierKind(raw: string): IdentifierKind {
  const trimmed = raw.trim();
  if (!trimmed) return 'unknown';

  if (trimmed.includes('@')) {
    return 'email';
  }

  if (trimmed.startsWith('+') || PHONE_CHAR_REGEX.test(trimmed)) {
    const digits = trimmed.replace(/\D/g, '');
    if (trimmed.startsWith('+') || digits.length >= 3) {
      return 'phone';
    }
  }

  return 'unknown';
}

/**
 * Normalizes an Indian mobile number into E.164 `+91[6-9]xxxxxxxxx` format.
 * Accepts:
 * - `+919876543210` or `+91 98765 43210`
 * - `919876543210`
 * - `09876543210`
 * - `9876543210`
 * Returns `null` if the number does not conform to Indian mobile E.164 rules.
 */
export function normalizePhone(raw: string): string | null {
  const cleaned = raw.trim().replace(/[\s\-()]/g, '');
  if (!cleaned) return null;

  let candidate = cleaned;
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    candidate = `+91${cleaned}`;
  } else if (/^0[6-9]\d{9}$/.test(cleaned)) {
    candidate = `+91${cleaned.slice(1)}`;
  } else if (/^91[6-9]\d{9}$/.test(cleaned)) {
    candidate = `+${cleaned}`;
  }

  return INDIAN_E164_REGEX.test(candidate) ? candidate : null;
}

/**
 * Normalizes and validates an email address.
 */
export function normalizeEmail(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  return EMAIL_REGEX.test(trimmed) ? trimmed : null;
}

/**
 * Resolves the unified identifier input against enabled server auth methods
 * to automatically determine the next step in the login flow.
 */
export function resolveIdentifierSubmission(
  raw: string,
  methods: AuthMethodsConfig,
): IdentifierResolution {
  const trimmed = raw.trim();
  if (!trimmed) {
    const hasEmail = methods.emailPassword || methods.emailOtp;
    const requiredMsg =
      methods.phoneOtp && hasEmail
        ? 'Email or phone number is required.'
        : hasEmail
          ? 'Email address is required.'
          : 'Phone number is required.';
    return {
      ok: false,
      kind: 'unknown',
      error: requiredMsg,
    };
  }

  const kind = detectIdentifierKind(trimmed);

  if (kind === 'phone') {
    if (!methods.phoneOtp && !methods.emailPassword) {
      return {
        ok: false,
        kind: 'phone',
        error: 'Phone sign-in is currently disabled. Please use email.',
      };
    }

    const normalized = normalizePhone(trimmed);
    if (!normalized) {
      return {
        ok: false,
        kind: 'phone',
        error: 'Enter a valid mobile number.',
      };
    }

    return {
      ok: true,
      kind: 'phone',
      normalized,
      nextAction: methods.emailPassword ? 'PHONE_PASSWORD' : 'SEND_PHONE_OTP',
    };
  }

  if (kind === 'email') {
    const normalized = normalizeEmail(trimmed);
    if (!normalized) {
      return {
        ok: false,
        kind: 'email',
        error: 'Enter a valid email address.',
      };
    }

    if (!methods.emailPassword && !methods.emailOtp) {
      return {
        ok: false,
        kind: 'email',
        error: 'Email sign-in is currently disabled. Please use phone or OAuth.',
      };
    }

    if (methods.emailPassword) {
      return {
        ok: true,
        kind: 'email',
        normalized,
        nextAction: 'EMAIL_PASSWORD',
      };
    }

    return {
      ok: true,
      kind: 'email',
      normalized,
      nextAction: 'SEND_EMAIL_OTP',
    };
  }

  return {
    ok: false,
    kind: 'unknown',
    error: 'Enter a valid email address or mobile number.',
  };
}

/**
 * Formats an identifier placeholder based on which authentication methods are enabled.
 */
export function getIdentifierPlaceholder(methods: AuthMethodsConfig): string {
  const hasEmail = methods.emailPassword || methods.emailOtp;
  const hasPhone = methods.phoneOtp || methods.emailPassword;
  if (hasPhone && hasEmail) {
    return 'Enter email or phone number';
  }
  if (hasEmail) {
    return 'Enter email address';
  }
  if (hasPhone) {
    return 'Enter phone number';
  }
  return 'Enter email or phone number';
}

/**
 * Returns a contextual label for the primary Continue button based on live detection.
 */
export function getIdentifierActionLabel(kind: IdentifierKind, methods: AuthMethodsConfig): string {
  if (kind === 'phone') {
    if (methods.emailPassword) {
      return 'Continue with Phone';
    }
    if (methods.phoneOtp) {
      return 'Send Verification Code';
    }
  }
  if (kind === 'email') {
    if (methods.emailPassword) {
      return 'Continue with Email';
    }
    if (methods.emailOtp) {
      return 'Send Email Code';
    }
  }
  return 'Continue';
}

/**
 * Returns true if at least one identifier-based sign-in method (Phone OTP,
 * Email+Password, or Email OTP) is enabled.
 */
export function hasAnyIdentifierMethod(methods: AuthMethodsConfig): boolean {
  return Boolean(methods.phoneOtp || methods.emailPassword || methods.emailOtp);
}

/**
 * Sanitizes a `?redirect=` query parameter to prevent open-redirect attacks
 * and `/login` redirect loops. Mirrors `apps/admin/proxy.ts`.
 */
export function sanitizeRedirectUrl(raw: string | null | undefined): string {
  if (!raw) return '/admin/dashboard';
  const trimmed = raw.trim();
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed === '/login' ||
    trimmed.startsWith('/login/') ||
    trimmed.startsWith('/login?')
  ) {
    return '/admin/dashboard';
  }
  return trimmed;
}
