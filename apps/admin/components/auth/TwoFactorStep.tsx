'use client';

import {
  Badge,
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
import { ArrowLeft01Icon, Key01Icon, Shield01Icon } from '@hugeicons/core-free-icons';
import type React from 'react';

interface TwoFactorStepProps {
  identifier: string;
  code: string;
  onCodeChange: (value: string) => void;
  backupMode: boolean;
  onToggleBackupMode: () => void;
  loading: boolean;
  fieldError?: string | null;
  hasError?: boolean;
  onVerify: (codeOverride?: string) => void;
  onBack: () => void;
}

export function TwoFactorStep({
  identifier,
  code,
  onCodeChange,
  backupMode,
  onToggleBackupMode,
  loading,
  fieldError,
  hasError,
  onVerify,
  onBack,
}: TwoFactorStepProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onVerify();
  };

  const handleOtpChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 6);
    onCodeChange(digitsOnly);
    if (digitsOnly.length === 6 && !loading) {
      onVerify(digitsOnly);
    }
  };

  const isInvalid = Boolean(fieldError || hasError);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="flex items-center justify-between gap-2 rounded-xl border bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <HugeiconsIcon
            icon={Shield01Icon}
            strokeWidth={2}
            className="size-4 shrink-0 text-primary"
          />
          <span className="truncate text-xs font-medium">{identifier || 'Account Protected'}</span>
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] shrink-0">
            2FA
          </Badge>
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
          Cancel
        </Button>
      </div>

      {!backupMode ? (
        <div className="space-y-3 flex flex-col items-center">
          <Label htmlFor="login-2fa-otp" className="text-center">
            Authenticator 6-Digit Code
          </Label>

          <InputOTP
            id="login-2fa-otp"
            maxLength={6}
            value={code}
            onChange={handleOtpChange}
            disabled={loading}
            aria-invalid={isInvalid}
            autoFocus
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} aria-invalid={isInvalid} />
              <InputOTPSlot index={1} aria-invalid={isInvalid} />
              <InputOTPSlot index={2} aria-invalid={isInvalid} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} aria-invalid={isInvalid} />
              <InputOTPSlot index={4} aria-invalid={isInvalid} />
              <InputOTPSlot index={5} aria-invalid={isInvalid} />
            </InputOTPGroup>
          </InputOTP>

          {fieldError && (
            <p role="alert" className="text-xs font-medium text-destructive text-center">
              {fieldError}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="login-2fa-backup">
            Backup Recovery Code <span className="text-destructive">*</span>
          </Label>
          <Input
            id="login-2fa-backup"
            type="text"
            autoFocus
            value={code}
            onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
            placeholder="XXXX-XXXX"
            aria-invalid={isInvalid}
            className={cn(
              'font-mono tracking-wider uppercase',
              isInvalid &&
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
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Verifying 2FA...' : 'Verify & Complete Sign In'}
      </Button>

      <div className="text-center">
        <button
          type="button"
          disabled={loading}
          onClick={onToggleBackupMode}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
        >
          <HugeiconsIcon icon={Key01Icon} strokeWidth={2} className="size-3.5" />
          {backupMode
            ? 'Use authenticator app code instead'
            : 'Lost your device? Use a backup recovery code'}
        </button>
      </div>
    </form>
  );
}
