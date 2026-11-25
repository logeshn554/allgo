'use client';

import { LinkedAccountsCard } from '@/components/auth/LinkedAccountsCard';
import { LoginDevicesCard } from '@/components/auth/LoginDevicesCard';
import { authApi } from '@/data/api/auth.api';
import type { TwoFactorStatusResponse } from '@/data/types';
import { useAuth } from '@/lib/auth-context';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  HugeiconsIcon,
  Input,
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
  Label,
  cn,
} from '@allgo/ui';
import {
  CheckmarkCircle02Icon,
  Copy01Icon,
  Key01Icon,
  Shield01Icon,
  ViewIcon,
  ViewOffIcon,
} from '@hugeicons/core-free-icons';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';

export default function AccountSecurityPage() {
  const { user, isAdmin, refreshUser } = useAuth();
  const [status, setStatus] = useState<TwoFactorStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // 2FA setup flow
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [setupUri, setSetupUri] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [disableCode, setDisableCode] = useState('');
  const [regenCode, setRegenCode] = useState('');
  const [acting, setActing] = useState(false);

  // Change password flow
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);

  const policyRequiresTwoFactor = Boolean(
    status &&
      (status.policy === 'REQUIRED_FOR_ALL' ||
        (status.policy === 'REQUIRED_FOR_ADMINS' && isAdmin)),
  );

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const s = await authApi.getTwoFactorStatus();
      setStatus(s);
    } catch (err: any) {
      setError(err.message || 'Failed to load security status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleStartSetup = async () => {
    setActing(true);
    setError(null);
    setMessage(null);
    setBackupCodes(null);
    try {
      const res = await authApi.setupTwoFactor();
      setSetupSecret(res.secret);
      setSetupUri(res.otpAuthUri);
      setVerifyCode('');
    } catch (err: any) {
      setError(err.message || 'Failed to start 2FA setup');
    } finally {
      setActing(false);
    }
  };

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleEnableTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(verifyCode.trim())) {
      setFieldErrors({ verifyCode: 'Enter the 6-digit code from your authenticator app.' });
      return;
    }
    setFieldErrors({});
    setActing(true);
    try {
      const res = await authApi.enableTwoFactor(verifyCode.trim());
      setBackupCodes(res.backupCodes);
      setSetupSecret(null);
      setSetupUri(null);
      setVerifyCode('');
      setMessage('Two-factor authentication is now enabled. Save your backup recovery codes!');
      await Promise.all([loadStatus(), refreshUser()]);
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setActing(false);
    }
  };

  const handleDisableTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!disableCode.trim()) {
      setFieldErrors({ disableCode: 'Enter an authenticator or backup code to disable 2FA.' });
      return;
    }
    setFieldErrors({});
    setActing(true);
    try {
      await authApi.disableTwoFactor(disableCode.trim());
      setDisableCode('');
      setBackupCodes(null);
      setMessage('Two-factor authentication has been disabled.');
      await Promise.all([loadStatus(), refreshUser()]);
    } catch (err: any) {
      setError(err.message || 'Failed to disable 2FA');
    } finally {
      setActing(false);
    }
  };

  const handleRegenerateCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!/^\d{6}$/.test(regenCode.trim())) {
      setFieldErrors({ regenCode: 'Enter a valid 6-digit authenticator code.' });
      return;
    }
    setFieldErrors({});
    setActing(true);
    try {
      const res = await authApi.regenerateBackupCodes(regenCode.trim());
      setBackupCodes(res.backupCodes);
      setRegenCode('');
      setMessage('New backup recovery codes generated. Previous codes are now invalid.');
      await loadStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate backup codes');
    } finally {
      setActing(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const errs: Record<string, string> = {};
    if (user?.hasPassword && !currentPassword) {
      errs.currentPassword = 'Current password is required.';
    }
    if (!newPassword || newPassword.length < 8) {
      errs.newPassword = 'New password must be at least 8 characters long.';
    }
    if (newPassword !== confirmPassword) {
      errs.confirmPassword = 'New passwords do not match.';
    }
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setPwdSaving(true);
    try {
      await authApi.changePassword(currentPassword || undefined, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Password updated successfully.');
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setPwdSaving(false);
    }
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setMessage(`${label} copied to clipboard.`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <HugeiconsIcon icon={Shield01Icon} strokeWidth={2} className="size-6 text-primary" />
          Account Security &amp; 2FA
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your authenticator app, backup recovery codes, and account password.
        </p>
      </div>

      {message && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium"
        >
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Two-Factor Authentication (TOTP)</CardTitle>
            <CardDescription className="text-xs mt-1">
              Add an extra layer of security using Google Authenticator, 1Password, or Authy.
            </CardDescription>
          </div>
          {status && (
            <Badge variant={status.enabled ? 'default' : 'outline'}>
              {status.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-xs text-muted-foreground">Loading 2FA configuration...</p>
          ) : status?.policy === 'DISABLED' ? (
            <p className="text-xs text-muted-foreground">
              Two-factor authentication is currently disabled by your organization policy.
            </p>
          ) : !status?.enabled ? (
            !setupSecret ? (
              <div className="space-y-3">
                {status?.setupRequired && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
                    Your organization policy ({status.policy}) requires 2FA on your account.
                  </div>
                )}
                <Button onClick={handleStartSetup} disabled={acting}>
                  {acting ? 'Generating secret...' : 'Set Up Authenticator App'}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleEnableTwoFactor} noValidate className="space-y-4">
                <div className="rounded-xl border bg-muted/40 p-4 space-y-3">
                  <p className="text-xs font-medium">
                    1. Add this account to your authenticator app using the setup key or URI:
                  </p>
                  <div className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2">
                    <code className="text-xs font-mono tracking-wider break-all">
                      {setupSecret}
                    </code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => copyText(setupSecret, 'Secret key')}
                    >
                      <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} className="size-3.5" />
                    </Button>
                  </div>
                  {setupUri && (
                    <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span className="truncate font-mono">{setupUri}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => copyText(setupUri, 'otpauth URI')}
                      >
                        Copy URI
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="setup-2fa-code">
                    2. Enter the 6-digit code from your authenticator app
                  </Label>
                  <InputOTP
                    id="setup-2fa-code"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(val) => {
                      setVerifyCode(val.replace(/\D/g, '').slice(0, 6));
                      clearFieldError('verifyCode');
                    }}
                    disabled={acting}
                    aria-invalid={Boolean(fieldErrors.verifyCode)}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} aria-invalid={Boolean(fieldErrors.verifyCode)} />
                      <InputOTPSlot index={1} aria-invalid={Boolean(fieldErrors.verifyCode)} />
                      <InputOTPSlot index={2} aria-invalid={Boolean(fieldErrors.verifyCode)} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} aria-invalid={Boolean(fieldErrors.verifyCode)} />
                      <InputOTPSlot index={4} aria-invalid={Boolean(fieldErrors.verifyCode)} />
                      <InputOTPSlot index={5} aria-invalid={Boolean(fieldErrors.verifyCode)} />
                    </InputOTPGroup>
                  </InputOTP>
                  {fieldErrors.verifyCode && (
                    <p role="alert" className="text-xs font-medium text-destructive">
                      {fieldErrors.verifyCode}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={acting}>
                    {acting ? 'Verifying...' : 'Verify & Enable 2FA'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={acting}
                    onClick={() => {
                      setSetupSecret(null);
                      setSetupUri(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )
          ) : (
            <div className="space-y-5">
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  Backup recovery codes remaining:{' '}
                  <span className="font-semibold text-foreground">
                    {status.backupCodesRemaining}
                  </span>
                </p>
                {status.enabledAt && (
                  <p>Enabled on {new Date(status.enabledAt).toLocaleString()}</p>
                )}
              </div>

              {backupCodes && (
                <div className="rounded-xl border bg-muted/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">
                      Save Your Backup Recovery Codes (shown once)
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyText(backupCodes.join('\n'), 'Backup codes')}
                    >
                      <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} className="size-3.5" />
                      Copy All
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {backupCodes.map((c) => (
                      <code
                        key={c}
                        className="rounded-md border bg-background px-2.5 py-1.5 text-center font-mono text-xs"
                      >
                        {c}
                      </code>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <form
                  onSubmit={handleRegenerateCodes}
                  noValidate
                  className="space-y-2 rounded-xl border p-3"
                >
                  <Label htmlFor="regen-2fa-code" className="text-xs">
                    Regenerate Backup Codes
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="regen-2fa-code"
                      value={regenCode}
                      onChange={(e) => {
                        setRegenCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                        clearFieldError('regenCode');
                      }}
                      placeholder="6-digit TOTP code"
                      aria-invalid={Boolean(fieldErrors.regenCode)}
                      className={cn(
                        fieldErrors.regenCode &&
                          'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30',
                      )}
                      disabled={acting}
                    />
                    <Button type="submit" variant="outline" size="sm" disabled={acting}>
                      Regenerate
                    </Button>
                  </div>
                  {fieldErrors.regenCode && (
                    <p role="alert" className="text-xs font-medium text-destructive">
                      {fieldErrors.regenCode}
                    </p>
                  )}
                </form>

                {policyRequiresTwoFactor ? (
                  <div className="rounded-xl border bg-muted/30 p-3 flex flex-col justify-center space-y-1">
                    <p className="text-xs font-medium text-foreground">2FA Enforced by Policy</p>
                    <p className="text-[11px] text-muted-foreground">
                      Your organization policy ({status.policy}) requires two-factor authentication
                      on this account, so it cannot be disabled.
                    </p>
                  </div>
                ) : (
                  <form
                    onSubmit={handleDisableTwoFactor}
                    noValidate
                    className="space-y-2 rounded-xl border p-3"
                  >
                    <Label htmlFor="disable-2fa-code" className="text-xs">
                      Disable Two-Factor Authentication
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="disable-2fa-code"
                        value={disableCode}
                        onChange={(e) => {
                          setDisableCode(e.target.value);
                          clearFieldError('disableCode');
                        }}
                        placeholder="TOTP or backup code"
                        aria-invalid={Boolean(fieldErrors.disableCode)}
                        className={cn(
                          fieldErrors.disableCode &&
                            'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30',
                        )}
                        disabled={acting}
                      />
                      <Button type="submit" variant="destructive" size="sm" disabled={acting}>
                        Disable
                      </Button>
                    </div>
                    {fieldErrors.disableCode && (
                      <p role="alert" className="text-xs font-medium text-destructive">
                        {fieldErrors.disableCode}
                      </p>
                    )}
                  </form>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HugeiconsIcon icon={Key01Icon} strokeWidth={2} className="size-4 text-primary" />
            Password Management
          </CardTitle>
          <CardDescription className="text-xs">
            Update your password or set one if you signed up via OAuth or OTP.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} noValidate className="space-y-4 max-w-md">
            {user?.hasPassword !== false && (
              <div className="space-y-1.5">
                <Label htmlFor="sec-current-password">
                  Current Password{' '}
                  {user?.hasPassword ? <span className="text-destructive">*</span> : '(if set)'}
                </Label>
                <Input
                  id="sec-current-password"
                  type={showPasswords ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    clearFieldError('currentPassword');
                  }}
                  placeholder={
                    user?.hasPassword
                      ? 'Enter current password'
                      : 'Leave blank if no password set yet'
                  }
                  aria-invalid={Boolean(fieldErrors.currentPassword)}
                  className={cn(
                    fieldErrors.currentPassword &&
                      'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30',
                  )}
                  disabled={pwdSaving}
                />
                {fieldErrors.currentPassword && (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {fieldErrors.currentPassword}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="sec-new-password">
                  New Password <span className="text-destructive">*</span>
                </Label>
                <button
                  type="button"
                  onClick={() => setShowPasswords((p) => !p)}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <HugeiconsIcon
                    icon={showPasswords ? ViewOffIcon : ViewIcon}
                    strokeWidth={2}
                    className="size-3.5"
                  />
                  {showPasswords ? 'Hide' : 'Show'}
                </button>
              </div>
              <Input
                id="sec-new-password"
                type={showPasswords ? 'text' : 'password'}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  clearFieldError('newPassword');
                }}
                placeholder="At least 8 characters"
                aria-invalid={Boolean(fieldErrors.newPassword)}
                className={cn(
                  fieldErrors.newPassword &&
                    'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30',
                )}
                disabled={pwdSaving}
              />
              {fieldErrors.newPassword && (
                <p role="alert" className="text-xs font-medium text-destructive">
                  {fieldErrors.newPassword}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sec-confirm-password">
                Confirm New Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sec-confirm-password"
                type={showPasswords ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  clearFieldError('confirmPassword');
                }}
                placeholder="Re-enter new password"
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                className={cn(
                  fieldErrors.confirmPassword &&
                    'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30',
                )}
                disabled={pwdSaving}
              />
              {fieldErrors.confirmPassword && (
                <p role="alert" className="text-xs font-medium text-destructive">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>
            <Button type="submit" disabled={pwdSaving}>
              {pwdSaving
                ? 'Saving...'
                : user?.hasPassword === false
                  ? 'Set Password'
                  : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <LinkedAccountsCard />

      <LoginDevicesCard />
    </div>
  );
}
