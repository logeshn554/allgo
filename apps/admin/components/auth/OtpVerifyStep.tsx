'use client';

import {
  Badge,
  Button,
  HugeiconsIcon,
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
  Label,
} from '@allgo/ui';
import {
  ArrowLeft01Icon,
  Mail01Icon,
  RefreshIcon,
  SmartPhone01Icon,
} from '@hugeicons/core-free-icons';
import type React from 'react';
import type { OtpChannel } from './types';

interface OtpVerifyStepProps {
  identifier: string;
  channel: OtpChannel;
  otpCode: string;
  onOtpCodeChange: (value: string) => void;
  resendCooldown: number;
  loading: boolean;
  fieldError?: string | null;
  hasError?: boolean;
  onVerify: (codeOverride?: string) => void;
  onResend: () => void;
  onBack: () => void;
}

export function OtpVerifyStep({
  identifier,
  channel,
  otpCode,
  onOtpCodeChange,
  resendCooldown,
  loading,
  fieldError,
  hasError,
  onVerify,
  onResend,
  onBack,
}: OtpVerifyStepProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onVerify();
  };

  const handleOtpChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 6);
    onOtpCodeChange(digitsOnly);
    if (digitsOnly.length === 6 && !loading) {
      onVerify(digitsOnly);
    }
  };

  const ChannelIcon = channel === 'phone' ? SmartPhone01Icon : Mail01Icon;
  const channelLabel = channel === 'phone' ? 'SMS OTP' : 'Email OTP';

  const isInvalid = Boolean(fieldError || hasError);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="flex items-center justify-between gap-2 rounded-xl border bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <HugeiconsIcon
            icon={ChannelIcon}
            strokeWidth={2}
            className="size-4 shrink-0 text-muted-foreground"
          />
          <span className="truncate text-xs font-medium">{identifier}</span>
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] shrink-0">
            {channelLabel}
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
          Change
        </Button>
      </div>

      <div className="space-y-3 flex flex-col items-center">
        <Label htmlFor="login-otp-input" className="text-center">
          Enter 6-Digit Verification Code
        </Label>

        <InputOTP
          id="login-otp-input"
          maxLength={6}
          autoComplete="one-time-code"
          value={otpCode}
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

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Verifying...' : 'Verify & Sign In'}
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
          {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend verification code'}
        </Button>
      </div>
    </form>
  );
}
