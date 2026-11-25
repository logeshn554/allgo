'use client';

import { authApi } from '@/data/api/auth.api';
import { sanitizeApiErrorMessage } from '@/data/api/base-client';
import { useAuth } from '@/lib/auth-context';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  detectIdentifierKind,
  hasAnyIdentifierMethod,
  resolveIdentifierSubmission,
  sanitizeRedirectUrl,
} from './identifier';
import type {
  AuthMethodsConfig,
  EmailAuthMode,
  LoginStep,
  OtpChannel,
  PublicOAuthProvider,
} from './types';

const DEFAULT_METHODS: AuthMethodsConfig = {
  phoneOtp: true,
  emailPassword: true,
  emailOtp: true,
  oauth: true,
  allowSelfSignup: false,
};

export interface UseLoginFlowOptions {
  allowSignup?: boolean;
}

export function useLoginFlow(options: UseLoginFlowOptions = {}) {
  const { allowSignup = false } = options;
  const searchParams = useSearchParams();
  const redirectUrl = useMemo(
    () => sanitizeRedirectUrl(searchParams.get('redirect')),
    [searchParams],
  );
  const oauthCode = searchParams.get('oauth_code');
  const oauthError = searchParams.get('oauth_error');
  const oauthNoAccount = searchParams.get('no_account');
  const isAddAccount = searchParams.get('add_account') === '1';

  const {
    login,
    loginWithPassword,
    registerWithEmail,
    loginWithEmailOtp,
    completeOAuthLogin,
    verifyTwoFactorLogin,
  } = useAuth();

  const [methods, setMethods] = useState<AuthMethodsConfig>(DEFAULT_METHODS);
  const [oauthProviders, setOauthProviders] = useState<PublicOAuthProvider[]>([]);
  const [providersLoaded, setProvidersLoaded] = useState(false);

  const [step, setStep] = useState<LoginStep>(() =>
    oauthNoAccount === '1' ? 'NO_ACCOUNT' : 'IDENTIFIER',
  );
  const [identifier, setIdentifier] = useState('');
  const [activeIdentifier, setActiveIdentifier] = useState('');
  const [otpChannel, setOtpChannel] = useState<OtpChannel>('phone');
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const [emailAuthMode, setEmailAuthMode] = useState<EmailAuthMode>('signin');
  const [accountHasPassword, setAccountHasPassword] = useState(true);
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Password Reset state
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Two-Factor Authentication state
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorBackupMode, setTwoFactorBackupMode] = useState(false);

  const [error, setError] = useState<string | null>(() =>
    oauthNoAccount === '1' ? null : oauthError ? sanitizeApiErrorMessage(oauthError) : null,
  );
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthPending, setOauthPending] = useState(false);

  const exchangedOAuthCodeRef = useRef<string | null>(null);
  const submittingRef = useRef(false);

  const detectedKind = useMemo(() => detectIdentifierKind(identifier), [identifier]);

  const hasIdentifierMethod = useMemo(() => hasAnyIdentifierMethod(methods), [methods]);

  const enterTwoFactorChallenge = useCallback((token: string, displayIdentifier?: string) => {
    if (displayIdentifier) {
      setActiveIdentifier(displayIdentifier);
    }
    setTwoFactorToken(token);
    setTwoFactorCode('');
    setTwoFactorBackupMode(false);
    setError(null);
    setFieldError(null);
    setInfoMessage('Two-factor authentication is enabled on this account.');
    setStep('TWO_FACTOR');
  }, []);

  // Fetch enabled authentication methods & OAuth providers
  useEffect(() => {
    let active = true;
    authApi
      .getPublicProviders()
      .then((res) => {
        if (!active) return;
        if (res.methods) {
          setMethods({
            phoneOtp: res.methods.phoneOtp,
            emailPassword: res.methods.emailPassword,
            emailOtp: res.methods.emailOtp,
            oauth: res.methods.oauth,
            allowSelfSignup: Boolean(res.methods.allowSelfSignup),
          });
        }
        if (res.oauthProviders) {
          setOauthProviders(res.oauthProviders.filter((p) => p.configured !== false));
        }
      })
      .catch(() => {
        // Keep safe defaults if public providers endpoint is temporarily unreachable
      })
      .finally(() => {
        if (active) setProvidersLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  // Exchange one-time OAuth callback code if present in URL
  useEffect(() => {
    if (typeof window !== 'undefined' && (oauthError || oauthNoAccount)) {
      const params = new URLSearchParams(window.location.search);
      params.delete('oauth_error');
      params.delete('no_account');
      const nextQs = params.toString();
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}${nextQs ? `?${nextQs}` : ''}${window.location.hash}`,
      );
    }
  }, [oauthError, oauthNoAccount]);

  useEffect(() => {
    if (!oauthCode || exchangedOAuthCodeRef.current === oauthCode) return;
    exchangedOAuthCodeRef.current = oauthCode;

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.delete('oauth_code');
      const nextQs = params.toString();
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}${nextQs ? `?${nextQs}` : ''}${window.location.hash}`,
      );
    }

    setOauthPending(true);
    setError(null);
    completeOAuthLogin(oauthCode, redirectUrl)
      .then((res) => {
        if (res && res.requiresTwoFactor) {
          enterTwoFactorChallenge(res.twoFactorToken, res.identifier);
          setOauthPending(false);
        }
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'OAuth sign-in failed';
        setError(message);
        setOauthPending(false);
      });
  }, [oauthCode, completeOAuthLogin, redirectUrl, enterTwoFactorChallenge]);

  // Resend OTP / reset code countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const dispatchPhoneOtp = useCallback(async (phone: string, customInfo?: string) => {
    const res = await authApi.sendOtp(phone);
    setActiveIdentifier(phone);
    setOtpChannel('phone');
    setOtpCode('');
    setResendCooldown(res.cooldownSeconds ?? 30);
    setInfoMessage(customInfo || `We sent a 6-digit SMS code to ${phone}`);
    setStep('OTP_VERIFY');
  }, []);

  const dispatchEmailOtp = useCallback(async (email: string, customInfo?: string) => {
    const res = await authApi.sendEmailOtp(email);
    setActiveIdentifier(email);
    setOtpChannel('email');
    setOtpCode('');
    setResendCooldown(res.cooldownSeconds ?? 30);
    setInfoMessage(customInfo || `We sent a 6-digit verification code to ${email}`);
    setStep('OTP_VERIFY');
  }, []);

  const submitIdentifier = useCallback(
    async (overrideIdentifier?: string) => {
      if (submittingRef.current) return;
      const value = overrideIdentifier ?? identifier;
      setError(null);
      setFieldError(null);
      setInfoMessage(null);

      const resolution = resolveIdentifierSubmission(value, methods);
      if (!resolution.ok) {
        setFieldError(resolution.error);
        return;
      }

      submittingRef.current = true;
      setLoading(true);
      try {
        const lookup = await authApi.lookupIdentifier(resolution.normalized);
        setActiveIdentifier(lookup.normalizedIdentifier);

        // 1. Account does not exist
        if (!lookup.exists) {
          if (!allowSignup || !lookup.allowSelfSignup || emailAuthMode === 'signin') {
            setStep('NO_ACCOUNT');
            return;
          }

          if (lookup.identifierType === 'email') {
            if (methods.emailPassword) {
              setPassword('');
              setFullName('');
              setAccountHasPassword(false);
              setEmailAuthMode('signup');
              setInfoMessage(
                `No account found for ${lookup.normalizedIdentifier}. Create your new account below.`,
              );
              setStep('EMAIL_PASSWORD');
              return;
            }
            if (methods.emailOtp) {
              await dispatchEmailOtp(
                lookup.normalizedIdentifier,
                `Creating a new account — we sent a 6-digit code to ${lookup.normalizedIdentifier}`,
              );
              return;
            }
          } else {
            if (methods.phoneOtp) {
              await dispatchPhoneOtp(
                lookup.normalizedIdentifier,
                `Creating a new account — we sent a 6-digit SMS code to ${lookup.normalizedIdentifier}`,
              );
              return;
            }
            setError('Phone OTP sign-up is currently disabled.');
            return;
          }
        }

        // 2. Account exists: always ask for Password first when password auth is enabled
        if (emailAuthMode === 'signup') {
          setEmailAuthMode('signin');
          setInfoMessage(
            `An account already exists for ${lookup.normalizedIdentifier}. Sign in below.`,
          );
        }
        setAccountHasPassword(lookup.hasPassword);

        if (methods.emailPassword) {
          setPassword('');
          setFullName('');
          setEmailAuthMode('signin');
          if (!lookup.hasPassword) {
            setInfoMessage(
              lookup.identifierType === 'email'
                ? 'No password is set on this account yet. Sign in with Email OTP below or use "Forgot password?" to set one.'
                : 'No password is set on this account yet. Sign in with SMS OTP below or use "Forgot password?" to set one.',
            );
          }
          setStep('EMAIL_PASSWORD');
          return;
        }

        if (lookup.identifierType === 'email') {
          await dispatchEmailOtp(lookup.normalizedIdentifier);
        } else if (methods.phoneOtp) {
          await dispatchPhoneOtp(lookup.normalizedIdentifier);
        } else {
          setError('Sign-in is currently unavailable for this account.');
        }
      } catch (err: unknown) {
        setError(
          sanitizeApiErrorMessage(
            err instanceof Error ? err.message : undefined,
            undefined,
            'Unable to continue with this identifier. Please try again.',
          ),
        );
      } finally {
        submittingRef.current = false;
        setLoading(false);
      }
    },
    [identifier, methods, allowSignup, emailAuthMode, dispatchPhoneOtp, dispatchEmailOtp],
  );

  const verifyOtp = useCallback(
    async (codeOverride?: string) => {
      if (submittingRef.current) return;
      const code = (codeOverride ?? otpCode).trim();
      if (!code) {
        setFieldError('Verification code is required.');
        return;
      }
      if (!/^\d{6}$/.test(code)) {
        setFieldError('Enter the complete 6-digit verification code.');
        return;
      }

      submittingRef.current = true;
      setError(null);
      setFieldError(null);
      setLoading(true);
      try {
        const res =
          otpChannel === 'phone'
            ? await login(activeIdentifier, code, redirectUrl)
            : await loginWithEmailOtp(activeIdentifier, code, redirectUrl);
        if (res && res.requiresTwoFactor) {
          enterTwoFactorChallenge(res.twoFactorToken, res.identifier);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Invalid or expired verification code';
        setError(message);
      } finally {
        submittingRef.current = false;
        setLoading(false);
      }
    },
    [
      otpCode,
      otpChannel,
      activeIdentifier,
      login,
      loginWithEmailOtp,
      redirectUrl,
      enterTwoFactorChallenge,
    ],
  );

  const resendOtp = useCallback(async () => {
    if (resendCooldown > 0 || loading || submittingRef.current) return;
    submittingRef.current = true;
    setError(null);
    setLoading(true);
    try {
      if (otpChannel === 'phone') {
        await dispatchPhoneOtp(activeIdentifier);
      } else {
        await dispatchEmailOtp(activeIdentifier);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to resend verification code';
      setError(message);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }, [resendCooldown, loading, otpChannel, activeIdentifier, dispatchPhoneOtp, dispatchEmailOtp]);

  const submitEmailPassword = useCallback(async () => {
    if (submittingRef.current) return;
    if (!password) {
      setFieldError('Password is required.');
      return;
    }

    if (emailAuthMode === 'signup' && password.length < 8) {
      setFieldError('Password must be at least 8 characters long.');
      return;
    }

    submittingRef.current = true;
    setError(null);
    setFieldError(null);
    setLoading(true);
    try {
      if (emailAuthMode === 'signup') {
        await registerWithEmail(
          activeIdentifier,
          password,
          fullName.trim() || undefined,
          redirectUrl,
        );
      } else {
        const res = await loginWithPassword(activeIdentifier, password, redirectUrl);
        if (res && res.requiresTwoFactor) {
          enterTwoFactorChallenge(res.twoFactorToken, res.identifier);
        }
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : emailAuthMode === 'signup'
            ? 'Registration failed'
            : 'Invalid credentials';
      setError(message);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }, [
    password,
    emailAuthMode,
    activeIdentifier,
    fullName,
    registerWithEmail,
    loginWithPassword,
    redirectUrl,
    enterTwoFactorChallenge,
  ]);

  const startPasswordReset = useCallback(async () => {
    if (!activeIdentifier || submittingRef.current) return;
    submittingRef.current = true;
    setError(null);
    setFieldError(null);
    setInfoMessage(null);
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(activeIdentifier);
      setResetCode('');
      setNewPassword('');
      setConfirmPassword('');
      setResendCooldown(res.cooldownSeconds ?? 60);
      setInfoMessage(`We sent a 6-digit password reset code to ${activeIdentifier}`);
      setStep('PASSWORD_RESET');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send password reset code';
      setError(message);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }, [activeIdentifier]);

  const resendPasswordReset = useCallback(async () => {
    if (resendCooldown > 0 || loading || submittingRef.current) return;
    submittingRef.current = true;
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(activeIdentifier);
      setResendCooldown(res.cooldownSeconds ?? 60);
      setInfoMessage(`A new 6-digit password reset code was sent to ${activeIdentifier}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to resend password reset code';
      setError(message);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }, [resendCooldown, loading, activeIdentifier]);

  const submitPasswordReset = useCallback(async () => {
    if (submittingRef.current) return;
    const code = resetCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setFieldError('Enter the 6-digit reset code.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setFieldError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setFieldError('Passwords do not match.');
      return;
    }

    submittingRef.current = true;
    setError(null);
    setFieldError(null);
    setLoading(true);
    try {
      const res = await authApi.resetPassword(activeIdentifier, code, newPassword);
      setPassword('');
      setResetCode('');
      setNewPassword('');
      setConfirmPassword('');
      setAccountHasPassword(true);
      setEmailAuthMode('signin');
      setInfoMessage(res.message || 'Password reset successful. Sign in with your new password.');
      setStep('EMAIL_PASSWORD');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reset password';
      setError(message);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }, [resetCode, newPassword, confirmPassword, activeIdentifier]);

  const submitTwoFactor = useCallback(
    async (codeOverride?: string) => {
      if (submittingRef.current) return;
      const code = (codeOverride ?? twoFactorCode).trim();
      if (!code) {
        setFieldError(
          twoFactorBackupMode
            ? 'Backup recovery code is required.'
            : '6-digit authenticator code is required.',
        );
        return;
      }
      if (!twoFactorBackupMode && !/^\d{6}$/.test(code)) {
        setFieldError('Enter the complete 6-digit authenticator code.');
        return;
      }

      submittingRef.current = true;
      setError(null);
      setFieldError(null);
      setLoading(true);
      try {
        await verifyTwoFactorLogin(twoFactorToken, code, twoFactorBackupMode, redirectUrl);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Invalid two-factor authentication code';
        setError(message);
      } finally {
        submittingRef.current = false;
        setLoading(false);
      }
    },
    [twoFactorCode, twoFactorBackupMode, twoFactorToken, verifyTwoFactorLogin, redirectUrl],
  );

  const toggleTwoFactorBackupMode = useCallback(() => {
    setError(null);
    setFieldError(null);
    setTwoFactorCode('');
    setTwoFactorBackupMode((prev) => !prev);
  }, []);

  const switchToEmailOtp = useCallback(async () => {
    if (!methods.emailOtp || !activeIdentifier || submittingRef.current) return;
    submittingRef.current = true;
    setError(null);
    setInfoMessage(null);
    setLoading(true);
    try {
      await dispatchEmailOtp(activeIdentifier);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send email verification code';
      setError(message);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }, [methods.emailOtp, activeIdentifier, dispatchEmailOtp]);

  const switchToPhoneOtp = useCallback(async () => {
    if (!methods.phoneOtp || !activeIdentifier || submittingRef.current) return;
    submittingRef.current = true;
    setError(null);
    setInfoMessage(null);
    setLoading(true);
    try {
      await dispatchPhoneOtp(activeIdentifier);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send SMS verification code';
      setError(message);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }, [methods.phoneOtp, activeIdentifier, dispatchPhoneOtp]);

  const toggleEmailAuthMode = useCallback(() => {
    setError(null);
    setFieldError(null);
    setInfoMessage(null);
    setEmailAuthMode((prev) => (prev === 'signin' ? 'signup' : 'signin'));
  }, []);

  const goBackToIdentifier = useCallback(() => {
    setError(null);
    setFieldError(null);
    setInfoMessage(null);
    setOtpCode('');
    setPassword('');
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
    setTwoFactorToken('');
    setTwoFactorCode('');
    setTwoFactorBackupMode(false);
    setStep('IDENTIFIER');
  }, []);

  const goBackToEmailPassword = useCallback(() => {
    setError(null);
    setFieldError(null);
    setInfoMessage(null);
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
    setStep('EMAIL_PASSWORD');
  }, []);

  const startOAuth = useCallback(
    (slug: string) => {
      const baseOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      const params = new URLSearchParams();
      if (redirectUrl !== '/admin/dashboard') {
        params.set('redirect', redirectUrl);
      }
      if (isAddAccount) {
        params.set('add_account', '1');
      }
      const qs = params.toString();
      const callbackTarget = `${baseOrigin}/login${qs ? `?${qs}` : ''}`;
      window.location.href = authApi.getOAuthAuthorizeUrl(slug, callbackTarget);
    },
    [redirectUrl, isAddAccount],
  );

  const quickFillDevPhone = useCallback(() => {
    setIdentifier('+919876543210');
    setError(null);
  }, []);

  const canSignup = allowSignup && methods.allowSelfSignup;

  return {
    // Config
    methods,
    oauthProviders,
    providersLoaded,
    hasIdentifierMethod,
    canSignup,
    // State
    step,
    identifier,
    setIdentifier,
    detectedKind,
    activeIdentifier,
    otpChannel,
    otpCode,
    setOtpCode,
    resendCooldown,
    emailAuthMode,
    accountHasPassword,
    password,
    setPassword,
    fullName,
    setFullName,
    resetCode,
    setResetCode,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    twoFactorCode,
    setTwoFactorCode,
    twoFactorBackupMode,
    error,
    setError,
    fieldError,
    setFieldError,
    infoMessage,
    loading,
    oauthPending,
    isAddAccount,
    // Actions
    submitIdentifier,
    verifyOtp,
    resendOtp,
    submitEmailPassword,
    startPasswordReset,
    resendPasswordReset,
    submitPasswordReset,
    submitTwoFactor,
    toggleTwoFactorBackupMode,
    switchToEmailOtp,
    switchToPhoneOtp,
    toggleEmailAuthMode,
    goBackToIdentifier,
    goBackToEmailPassword,
    startOAuth,
    quickFillDevPhone,
  };
}
