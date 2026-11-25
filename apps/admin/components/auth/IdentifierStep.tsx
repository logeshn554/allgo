'use client';

import { Badge, Button, HugeiconsIcon, Input, Label, cn } from '@allgo/ui';
import {
  ArrowRight01Icon,
  Mail01Icon,
  Shield01Icon,
  SmartPhone01Icon,
} from '@hugeicons/core-free-icons';
import type React from 'react';
import { getIdentifierActionLabel, getIdentifierPlaceholder } from './identifier';
import type { AuthMethodsConfig, IdentifierKind } from './types';

interface IdentifierStepProps {
  identifier: string;
  onIdentifierChange: (value: string) => void;
  detectedKind: IdentifierKind;
  methods: AuthMethodsConfig;
  loading: boolean;
  fieldError?: string | null;
  canSignup?: boolean;
  authMode?: 'signin' | 'signup';
  onToggleAuthMode?: () => void;
  onSubmit: () => void;
}

export function IdentifierStep({
  identifier,
  onIdentifierChange,
  detectedKind,
  methods,
  loading,
  fieldError,
  canSignup = false,
  authMode = 'signin',
  onToggleAuthMode,
  onSubmit,
}: IdentifierStepProps) {
  const placeholder = getIdentifierPlaceholder(methods);
  const actionLabel = getIdentifierActionLabel(detectedKind, methods);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const LeadingIcon =
    detectedKind === 'phone'
      ? SmartPhone01Icon
      : detectedKind === 'email'
        ? Mail01Icon
        : Shield01Icon;

  const detectedBadgeLabel =
    detectedKind === 'phone'
      ? methods.emailPassword
        ? 'Phone'
        : 'Phone OTP'
      : detectedKind === 'email'
        ? methods.emailPassword
          ? 'Email'
          : 'Email OTP'
        : null;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="login-identifier">
            Email or Phone Number <span className="text-destructive">*</span>
          </Label>
          {detectedBadgeLabel && (
            <Badge
              variant="secondary"
              className="h-5 px-2 text-[10px] font-medium tracking-wide uppercase"
            >
              {detectedBadgeLabel}
            </Badge>
          )}
        </div>

        <div className="relative">
          <span
            className={cn(
              'pointer-events-none absolute inset-y-0 left-3 flex items-center',
              fieldError ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            <HugeiconsIcon icon={LeadingIcon} strokeWidth={2} className="size-4" />
          </span>
          <Input
            id="login-identifier"
            type="text"
            inputMode={detectedKind === 'phone' ? 'tel' : 'email'}
            autoComplete="username"
            autoFocus
            value={identifier}
            onChange={(e) => onIdentifierChange(e.target.value)}
            placeholder={placeholder}
            aria-invalid={Boolean(fieldError)}
            aria-describedby={fieldError ? 'login-identifier-error' : undefined}
            className={cn(
              'pl-9',
              fieldError &&
                'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30',
            )}
            disabled={loading}
          />
        </div>

        {fieldError && (
          <p
            id="login-identifier-error"
            role="alert"
            className="text-xs font-medium text-destructive"
          >
            {fieldError}
          </p>
        )}
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        <span>{loading ? 'Processing...' : actionLabel}</span>
        {!loading && <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />}
      </Button>

      {canSignup && onToggleAuthMode && (
        <div className="text-center pt-1">
          <button
            type="button"
            disabled={loading}
            onClick={onToggleAuthMode}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
          >
            {authMode === 'signin'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </button>
        </div>
      )}
    </form>
  );
}
