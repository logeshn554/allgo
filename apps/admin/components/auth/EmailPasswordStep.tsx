'use client';

import React, { useState } from 'react';
import { Button, HugeiconsIcon, Input, Label, Separator, cn } from '@allgo/ui';
import {
  ArrowLeft01Icon,
  Key01Icon,
  Mail01Icon,
  SmartPhone01Icon,
  ViewIcon,
  ViewOffIcon,
} from '@hugeicons/core-free-icons';
import type { EmailAuthMode } from './types';

interface EmailPasswordStepProps {
  email: string;
  mode: EmailAuthMode;
  hasPassword?: boolean;
  password: string;
  onPasswordChange: (value: string) => void;
  fullName: string;
  onFullNameChange: (value: string) => void;
  canUseEmailOtp: boolean;
  canUsePhoneOtp?: boolean;
  allowSelfSignup: boolean;
  loading: boolean;
  fieldError?: string | null;
  onSubmit: () => void;
  onForgotPassword: () => void;
  onSwitchToEmailOtp: () => void;
  onSwitchToPhoneOtp?: () => void;
  onToggleMode: () => void;
  onBack: () => void;
}

export function EmailPasswordStep({
  email,
  mode,
  hasPassword = true,
  password,
  onPasswordChange,
  fullName,
  onFullNameChange,
  canUseEmailOtp,
  canUsePhoneOtp = false,
  allowSelfSignup,
  loading,
  fieldError,
  onSubmit,
  onForgotPassword,
  onSwitchToEmailOtp,
  onSwitchToPhoneOtp,
  onToggleMode,
  onBack,
}: EmailPasswordStepProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isEmailIdentifier = email.includes('@');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 rounded-xl border bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <HugeiconsIcon
            icon={isEmailIdentifier ? Mail01Icon : SmartPhone01Icon}
            strokeWidth={2}
            className="size-4 shrink-0 text-muted-foreground"
          />
          <span className="truncate text-xs font-medium">{email}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          disabled={loading}
          className="h-7 px-2 text-xs shrink-0"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-3.5" />
          Change
        </Button>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {mode === 'signup' && (
          <div className="space-y-2">
            <Label htmlFor="login-full-name">Full Name</Label>
            <Input
              id="login-full-name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => onFullNameChange(e.target.value)}
              placeholder="Enter your full name"
              disabled={loading}
            />
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="login-password">
              Password <span className="text-destructive">*</span>
            </Label>
            {mode === 'signin' && (
              <button
                type="button"
                disabled={loading}
                onClick={onForgotPassword}
                className="text-xs font-medium text-primary hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            )}
          </div>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              autoFocus
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder={mode === 'signup' ? 'Create a password' : 'Enter your password'}
              aria-invalid={Boolean(fieldError)}
              aria-describedby={fieldError ? 'login-password-error' : undefined}
              className={cn(
                'pr-10',
                fieldError &&
                  'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30',
              )}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-2.5 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              <HugeiconsIcon
                icon={showPassword ? ViewOffIcon : ViewIcon}
                strokeWidth={2}
                className="size-4"
              />
            </button>
          </div>
          {fieldError && (
            <p
              id="login-password-error"
              role="alert"
              className="text-xs font-medium text-destructive"
            >
              {fieldError}
            </p>
          )}
          {mode === 'signup' && !fieldError && (
            <p className="text-[11px] text-muted-foreground">
              Use at least 8 characters for a strong password.
            </p>
          )}
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading
            ? mode === 'signup'
              ? 'Creating account...'
              : 'Signing in...'
            : mode === 'signup'
              ? 'Create Account'
              : 'Sign In'}
        </Button>
      </form>

      {mode === 'signin' && !hasPassword && isEmailIdentifier && canUseEmailOtp && (
        <>
          <div className="relative flex items-center justify-center">
            <Separator />
            <span className="bg-card px-2 text-[11px] uppercase text-muted-foreground absolute">
              Or
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={onSwitchToEmailOtp}
            className="w-full"
          >
            <HugeiconsIcon icon={Key01Icon} strokeWidth={2} className="size-4" />
            Email me a 6-digit login code instead
          </Button>
        </>
      )}

      {mode === 'signin' && !hasPassword && !isEmailIdentifier && canUsePhoneOtp && onSwitchToPhoneOtp && (
        <>
          <div className="relative flex items-center justify-center">
            <Separator />
            <span className="bg-card px-2 text-[11px] uppercase text-muted-foreground absolute">
              Or
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={onSwitchToPhoneOtp}
            className="w-full"
          >
            <HugeiconsIcon icon={Key01Icon} strokeWidth={2} className="size-4" />
            Send SMS verification code instead
          </Button>
        </>
      )}

      {allowSelfSignup && (
        <div className="text-center">
          <button
            type="button"
            disabled={loading}
            onClick={onToggleMode}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
          >
            {mode === 'signin'
              ? 'Need an account? Create one'
              : 'Already have an account? Sign in'}
          </button>
        </div>
      )}
    </div>
  );
}
