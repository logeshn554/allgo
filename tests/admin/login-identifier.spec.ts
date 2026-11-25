import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  detectIdentifierKind,
  getIdentifierActionLabel,
  getIdentifierPlaceholder,
  hasAnyIdentifierMethod,
  normalizeEmail,
  normalizePhone,
  resolveIdentifierSubmission,
  sanitizeRedirectUrl,
} from '../../apps/admin/components/auth/identifier.ts';
import type { AuthMethodsConfig } from '../../apps/admin/components/auth/types.ts';

const ALL_ENABLED: AuthMethodsConfig = {
  phoneOtp: true,
  emailPassword: true,
  emailOtp: true,
  oauth: true,
  allowSelfSignup: false,
};

describe('Login Identifier Auto-Detection', () => {
  it('detects empty and ambiguous inputs as unknown', () => {
    assert.equal(detectIdentifierKind(''), 'unknown');
    assert.equal(detectIdentifierKind('   '), 'unknown');
    assert.equal(detectIdentifierKind('12'), 'unknown');
    assert.equal(detectIdentifierKind('admin'), 'unknown');
  });

  it('detects phone numbers from + prefix or 3+ digits', () => {
    assert.equal(detectIdentifierKind('+91'), 'phone');
    assert.equal(detectIdentifierKind('+919876543210'), 'phone');
    assert.equal(detectIdentifierKind('9876543210'), 'phone');
    assert.equal(detectIdentifierKind('98765 43210'), 'phone');
    assert.equal(detectIdentifierKind('09876-543210'), 'phone');
  });

  it('detects email addresses when @ is present', () => {
    assert.equal(detectIdentifierKind('admin@allgo.in'), 'email');
    assert.equal(detectIdentifierKind('user@'), 'email');
    assert.equal(detectIdentifierKind('12345@domain.com'), 'email');
  });
});

describe('Phone & Email Normalization', () => {
  it('normalizes valid Indian mobile numbers to +91 E.164', () => {
    assert.equal(normalizePhone('+919876543210'), '+919876543210');
    assert.equal(normalizePhone('+91 98765 43210'), '+919876543210');
    assert.equal(normalizePhone('9876543210'), '+919876543210');
    assert.equal(normalizePhone('09876543210'), '+919876543210');
    assert.equal(normalizePhone('919876543210'), '+919876543210');
    assert.equal(normalizePhone('(98765)-43210'), '+919876543210');
  });

  it('rejects invalid phone numbers', () => {
    assert.equal(normalizePhone(''), null);
    assert.equal(normalizePhone('1234567890'), null); // must start with 6-9
    assert.equal(normalizePhone('+915876543210'), null);
    assert.equal(normalizePhone('987654321'), null); // 9 digits
    assert.equal(normalizePhone('+14155552671'), null); // non-IN
  });

  it('normalizes and validates emails', () => {
    assert.equal(normalizeEmail('  Admin@AllGo.IN '), 'admin@allgo.in');
    assert.equal(normalizeEmail('invalid@'), null);
    assert.equal(normalizeEmail('no-at-sign.com'), null);
    assert.equal(normalizeEmail(''), null);
  });
});

describe('Identifier Flow Resolution', () => {
  it('routes valid phone to PHONE_PASSWORD when password auth is enabled, and SEND_PHONE_OTP when only phoneOtp is enabled', () => {
    const resWithPwd = resolveIdentifierSubmission('98765 43210', ALL_ENABLED);
    assert.deepEqual(resWithPwd, {
      ok: true,
      kind: 'phone',
      normalized: '+919876543210',
      nextAction: 'PHONE_PASSWORD',
    });

    const resOtpOnly = resolveIdentifierSubmission('98765 43210', {
      ...ALL_ENABLED,
      emailPassword: false,
    });
    assert.deepEqual(resOtpOnly, {
      ok: true,
      kind: 'phone',
      normalized: '+919876543210',
      nextAction: 'SEND_PHONE_OTP',
    });

    const resPwdOnly = resolveIdentifierSubmission('+919876543210', {
      ...ALL_ENABLED,
      phoneOtp: false,
    });
    assert.deepEqual(resPwdOnly, {
      ok: true,
      kind: 'phone',
      normalized: '+919876543210',
      nextAction: 'PHONE_PASSWORD',
    });
  });

  it('rejects phone when both phoneOtp and emailPassword are disabled', () => {
    const res = resolveIdentifierSubmission('+919876543210', {
      ...ALL_ENABLED,
      phoneOtp: false,
      emailPassword: false,
    });
    assert.equal(res.ok, false);
    if (!res.ok) {
      assert.match(res.error, /disabled/i);
    }
  });

  it('routes valid email to EMAIL_PASSWORD when emailPassword is enabled', () => {
    const res = resolveIdentifierSubmission('Admin@AllGo.in', ALL_ENABLED);
    assert.deepEqual(res, {
      ok: true,
      kind: 'email',
      normalized: 'admin@allgo.in',
      nextAction: 'EMAIL_PASSWORD',
    });
  });

  it('routes valid email directly to SEND_EMAIL_OTP when only emailOtp is enabled', () => {
    const res = resolveIdentifierSubmission('admin@allgo.in', {
      ...ALL_ENABLED,
      emailPassword: false,
      emailOtp: true,
    });
    assert.deepEqual(res, {
      ok: true,
      kind: 'email',
      normalized: 'admin@allgo.in',
      nextAction: 'SEND_EMAIL_OTP',
    });
  });

  it('rejects email when both emailPassword and emailOtp are disabled', () => {
    const res = resolveIdentifierSubmission('admin@allgo.in', {
      ...ALL_ENABLED,
      emailPassword: false,
      emailOtp: false,
    });
    assert.equal(res.ok, false);
  });

  it('rejects empty or malformed identifiers with clear errors', () => {
    assert.equal(resolveIdentifierSubmission('   ', ALL_ENABLED).ok, false);
    assert.equal(resolveIdentifierSubmission('bad-input', ALL_ENABLED).ok, false);
    assert.equal(resolveIdentifierSubmission('1234567890', ALL_ENABLED).ok, false);
    assert.equal(resolveIdentifierSubmission('bad@email', ALL_ENABLED).ok, false);
  });

  it('computes dynamic placeholder and action labels', () => {
    assert.equal(getIdentifierPlaceholder(ALL_ENABLED), 'Enter email or phone number');
    assert.equal(
      getIdentifierPlaceholder({ ...ALL_ENABLED, phoneOtp: false, emailPassword: false }),
      'Enter email address',
    );
    assert.equal(
      getIdentifierPlaceholder({
        ...ALL_ENABLED,
        emailPassword: false,
        emailOtp: false,
      }),
      'Enter phone number',
    );

    assert.equal(getIdentifierActionLabel('phone', ALL_ENABLED), 'Continue with Phone');
    assert.equal(
      getIdentifierActionLabel('phone', { ...ALL_ENABLED, emailPassword: false }),
      'Send Verification Code',
    );
    assert.equal(getIdentifierActionLabel('email', ALL_ENABLED), 'Continue with Email');
    assert.equal(
      getIdentifierActionLabel('email', { ...ALL_ENABLED, emailPassword: false }),
      'Send Email Code',
    );
    assert.equal(getIdentifierActionLabel('unknown', ALL_ENABLED), 'Continue');
  });

  it('detects whether any identifier-based method is enabled', () => {
    assert.equal(hasAnyIdentifierMethod(ALL_ENABLED), true);
    assert.equal(
      hasAnyIdentifierMethod({
        phoneOtp: false,
        emailPassword: false,
        emailOtp: false,
        oauth: true,
        allowSelfSignup: false,
      }),
      false,
    );
    assert.equal(
      hasAnyIdentifierMethod({
        phoneOtp: false,
        emailPassword: false,
        emailOtp: true,
        oauth: false,
        allowSelfSignup: false,
      }),
      true,
    );
  });

  it('sanitizes redirect URLs to prevent open redirects and login loops', () => {
    assert.equal(sanitizeRedirectUrl(null), '/admin/dashboard');
    assert.equal(sanitizeRedirectUrl(''), '/admin/dashboard');
    assert.equal(sanitizeRedirectUrl('/admin/users'), '/admin/users');
    assert.equal(sanitizeRedirectUrl('/admin/orders?status=OPEN'), '/admin/orders?status=OPEN');
    assert.equal(sanitizeRedirectUrl('https://evil.example.com'), '/admin/dashboard');
    assert.equal(sanitizeRedirectUrl('//evil.example.com'), '/admin/dashboard');
    assert.equal(sanitizeRedirectUrl('/login'), '/admin/dashboard');
    assert.equal(sanitizeRedirectUrl('/login?oauth_code=abc'), '/admin/dashboard');
  });
});
