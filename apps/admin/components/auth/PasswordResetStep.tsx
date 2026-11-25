'use client';

import React, { useState } from 'react';
import {
  Button,
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
  ArrowLeft01Icon,
  Mail01Icon,
  RefreshIcon,
  SmartPhone01Icon,
  ViewIcon,
  ViewOffIcon,
} from '@hugeicons/core-free-icons';

interface PasswordResetStepProps {
  email: string;
  resetCode: string;
  onResetCodeChange: (value: string) => void;
  newPassword: string;
  onNewPasswordChange: (value: string) => void;
  confirmPassword: string;
  onConfirmPasswordChange: (value: string) => void;
  resendCooldown: number;
  loading: boolean;
  fieldError?: string | null;
  hasError?: boolean;
  onSubmit: () => void;
  onResend: () => void;
  onBack: () => void;
}

export function PasswordResetStep({
  email,
  resetCode,
  onResetCodeChange,
  newPassword,
  onNewPasswordChange,
  confirmPassword,
  onConfirmPasswordChange,
  resendCooldown,
  loading,
  fieldError,
  hasError,
  onSubmit,
  onResend,
  onBack,
}: PasswordResetStepProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isEmailIdentifier = email.includes('@');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const lowerErr = (fieldError || '').toLowerCase();
  const isCodeInvalid = Boolean(
    lowerErr.includes('code') || (!fieldError && hasError),
  );
  const isNewPasswordInvalid = Boolean(
    lowerErr.includes('password') && !lowerErr.includes('match'),
  );
  const isConfirmPasswordInvalid = Boolean(
    lowerErr.includes('match') || lowerErr.includes('password'),
  );

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
          Back
        </Button>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="space-y-2 flex flex-col items-center">
          <Label htmlFor="reset-otp-input" className="text-center">
            6-Digit Reset Code <span className="text-destructive">*</span>
          </Label>
          <InputOTP
            id="reset-otp-input"
            maxLength={6}
            value={resetCode}
            onChange={(val) => onResetCodeChange(val.replace(/\D/g, '').slice(0, 6))}
            disabled={loading}
            aria-invalid={isCodeInvalid}
            autoFocus
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} aria-invalid={isCodeInvalid} />
              <InputOTPSlot index={1} aria-invalid={isCodeInvalid} />
              <InputOTPSlot index={2} aria-invalid={isCodeInvalid} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} aria-invalid={isCodeInvalid} />
              <InputOTPSlot index={4} aria-invalid={isCodeInvalid} />
              <InputOTPSlot index={5} aria-invalid={isCodeInvalid} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reset-new-password">
            New Password <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="reset-new-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => onNewPasswordChange(e.target.value)}
              placeholder="At least 8 characters"
              aria-invalid={isNewPasswordInvalid}
              className={cn(
                'pr-10',
                isNewPasswordInvalid &&
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="reset-confirm-password">
            Confirm New Password <span className="text-destructive">*</span>
          </Label>
          <Input
            id="reset-confirm-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
            placeholder="Re-enter new password"
            aria-invalid={isConfirmPasswordInvalid}
            className={cn(
              isConfirmPasswordInvalid &&
                'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30',
            )}
            disabled={loading}
          />
          {fieldError && (
            <p role="alert" className="text-xs font-medium text-destructive">
              {fieldError}
            </p>
          )}
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Updating password...' : 'Reset Password'}
        </Button>

        <div className="flex items-center justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={resendCooldown > 0 || loading}
            onClick={onResend}
            className="text-xs text-muted-foreground"
          >
            <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} className="size-3.5" />
            {resendCooldown > 0
              ? `Resend code in ${resendCooldown}s`
              : 'Resend reset code'}
          </Button>
        </div>
      </form>
    </div>
  );
}
