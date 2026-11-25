'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  HugeiconsIcon,
} from '@allgo/ui';
import { Alert02Icon } from '@hugeicons/core-free-icons';
import { EmailPasswordStep } from './EmailPasswordStep';
import { IdentifierStep } from './IdentifierStep';
import { NoAccountStep } from './NoAccountStep';
import { OAuthProvidersSection } from './OAuthProvidersSection';
import { OtpVerifyStep } from './OtpVerifyStep';
import { PasswordResetStep } from './PasswordResetStep';
import { TwoFactorStep } from './TwoFactorStep';
import { useLoginFlow } from './use-login-flow';

export interface LoginCardProps {
  title?: string;
  brandInitial?: string;
  allowSignup?: boolean;
}

export function LoginCard({
  title = 'AllGo Super Console',
  brandInitial = 'A',
  allowSignup = false,
}: LoginCardProps) {
  const flow = useLoginFlow({ allowSignup });

  const subtitle = (() => {
    switch (flow.step) {
      case 'IDENTIFIER':
        return flow.hasIdentifierMethod
          ? flow.canSignup && flow.emailAuthMode === 'signup'
            ? 'Create your account'
            : 'Sign in with your phone number or email'
          : 'Sign in with your organization account';
      case 'OTP_VERIFY':
        return flow.otpChannel === 'phone'
          ? 'Verify your mobile number'
          : 'Verify your email address';
      case 'EMAIL_PASSWORD':
        return flow.emailAuthMode === 'signup'
          ? 'Create your AllGo account'
          : 'Enter your account password';
      case 'PASSWORD_RESET':
        return 'Reset your account password';
      case 'TWO_FACTOR':
        return 'Two-factor authentication';
      case 'NO_ACCOUNT':
        return 'Account not found';
    }
  })();

  const hasOAuthProviders = flow.methods.oauth && flow.oauthProviders.length > 0;
  const noMethodsEnabled =
    flow.providersLoaded && !flow.hasIdentifierMethod && !hasOAuthProviders;

  if (flow.oauthPending) {
    return (
      <div className="w-full max-w-md mx-auto px-4">
        <Card>
          <CardContent className="py-12 flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">Completing single sign-on...</p>
            <p className="text-xs text-muted-foreground">
              Exchanging authorization token with AllGo Auth
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xl">
            {brandInitial}
          </div>
          <CardTitle className="text-xl font-semibold tracking-tight">
            {title}
          </CardTitle>
          <CardDescription>{subtitle}</CardDescription>
          {flow.isAddAccount && (
            <div className="pt-2">
              <a
                href="/admin/dashboard"
                className="inline-flex items-center gap-1.5 rounded-full border bg-muted/60 px-3 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Adding another account • Return to Console
              </a>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {flow.error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs"
            >
              <HugeiconsIcon
                icon={Alert02Icon}
                strokeWidth={2}
                className="size-4 shrink-0 mt-0.5"
              />
              <span>{flow.error}</span>
            </div>
          )}

          {flow.infoMessage && !flow.error && (
            <div className="rounded-2xl bg-muted/60 border px-3 py-2.5 text-xs text-muted-foreground text-center">
              {flow.infoMessage}
            </div>
          )}

          {noMethodsEnabled && (
            <div
              role="alert"
              className="rounded-2xl bg-muted/60 border px-4 py-3 text-xs text-muted-foreground text-center"
            >
              No sign-in methods are currently enabled. Please contact your administrator.
            </div>
          )}

          {flow.step === 'IDENTIFIER' && flow.hasIdentifierMethod && (
            <IdentifierStep
              identifier={flow.identifier}
              onIdentifierChange={(val) => {
                flow.setIdentifier(val);
                if (flow.error) flow.setError(null);
                if (flow.fieldError) flow.setFieldError(null);
              }}
              detectedKind={flow.detectedKind}
              methods={flow.methods}
              loading={flow.loading}
              fieldError={flow.fieldError}
              canSignup={flow.canSignup}
              authMode={flow.emailAuthMode}
              onToggleAuthMode={flow.toggleEmailAuthMode}
              onSubmit={() => flow.submitIdentifier()}
            />
          )}

          {flow.step === 'OTP_VERIFY' && (
            <OtpVerifyStep
              identifier={flow.activeIdentifier}
              channel={flow.otpChannel}
              otpCode={flow.otpCode}
              onOtpCodeChange={(val) => {
                flow.setOtpCode(val);
                if (flow.error) flow.setError(null);
                if (flow.fieldError) flow.setFieldError(null);
              }}
              resendCooldown={flow.resendCooldown}
              loading={flow.loading}
              fieldError={flow.fieldError}
              hasError={Boolean(flow.error || flow.fieldError)}
              onVerify={(code) => flow.verifyOtp(code)}
              onResend={() => flow.resendOtp()}
              onBack={flow.goBackToIdentifier}
            />
          )}

          {flow.step === 'EMAIL_PASSWORD' && (
            <EmailPasswordStep
              email={flow.activeIdentifier}
              mode={flow.emailAuthMode}
              hasPassword={flow.accountHasPassword}
              password={flow.password}
              onPasswordChange={(val) => {
                flow.setPassword(val);
                if (flow.error) flow.setError(null);
                if (flow.fieldError) flow.setFieldError(null);
              }}
              fullName={flow.fullName}
              onFullNameChange={flow.setFullName}
              canUseEmailOtp={flow.methods.emailOtp}
              canUsePhoneOtp={flow.methods.phoneOtp}
              allowSelfSignup={flow.canSignup}
              loading={flow.loading}
              fieldError={flow.fieldError}
              onSubmit={() => flow.submitEmailPassword()}
              onForgotPassword={() => flow.startPasswordReset()}
              onSwitchToEmailOtp={() => flow.switchToEmailOtp()}
              onSwitchToPhoneOtp={() => flow.switchToPhoneOtp()}
              onToggleMode={flow.toggleEmailAuthMode}
              onBack={flow.goBackToIdentifier}
            />
          )}

          {flow.step === 'PASSWORD_RESET' && (
            <PasswordResetStep
              email={flow.activeIdentifier}
              resetCode={flow.resetCode}
              onResetCodeChange={(val) => {
                flow.setResetCode(val);
                if (flow.error) flow.setError(null);
                if (flow.fieldError) flow.setFieldError(null);
              }}
              newPassword={flow.newPassword}
              onNewPasswordChange={(val) => {
                flow.setNewPassword(val);
                if (flow.error) flow.setError(null);
                if (flow.fieldError) flow.setFieldError(null);
              }}
              confirmPassword={flow.confirmPassword}
              onConfirmPasswordChange={(val) => {
                flow.setConfirmPassword(val);
                if (flow.error) flow.setError(null);
                if (flow.fieldError) flow.setFieldError(null);
              }}
              resendCooldown={flow.resendCooldown}
              loading={flow.loading}
              fieldError={flow.fieldError}
              hasError={Boolean(flow.error || flow.fieldError)}
              onSubmit={() => flow.submitPasswordReset()}
              onResend={() => flow.resendPasswordReset()}
              onBack={flow.goBackToEmailPassword}
            />
          )}

          {flow.step === 'TWO_FACTOR' && (
            <TwoFactorStep
              identifier={flow.activeIdentifier}
              code={flow.twoFactorCode}
              onCodeChange={(val) => {
                flow.setTwoFactorCode(val);
                if (flow.error) flow.setError(null);
                if (flow.fieldError) flow.setFieldError(null);
              }}
              backupMode={flow.twoFactorBackupMode}
              onToggleBackupMode={flow.toggleTwoFactorBackupMode}
              loading={flow.loading}
              fieldError={flow.fieldError}
              hasError={Boolean(flow.error || flow.fieldError)}
              onVerify={(code) => flow.submitTwoFactor(code)}
              onBack={flow.goBackToIdentifier}
            />
          )}

          {flow.step === 'NO_ACCOUNT' && (
            <NoAccountStep
              identifier={flow.activeIdentifier}
              loading={flow.loading}
              onTryAnother={flow.goBackToIdentifier}
            />
          )}

          {(flow.step === 'IDENTIFIER' || flow.step === 'NO_ACCOUNT') &&
            flow.methods.oauth && (
              <OAuthProvidersSection
                providers={flow.oauthProviders}
                loading={flow.loading}
                showDivider={flow.hasIdentifierMethod}
                onSelectProvider={flow.startOAuth}
              />
            )}
        </CardContent>
      </Card>
    </div>
  );
}
