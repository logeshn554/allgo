'use client';
import { Button, HugeiconsIcon } from '@allgo/ui';
import { ArrowLeft01Icon, UserRemove01Icon } from '@hugeicons/core-free-icons';

interface NoAccountStepProps {
  identifier: string;
  loading: boolean;
  canSignup?: boolean;
  onCreateAccount?: () => void;
  onTryAnother: () => void;
}

export function NoAccountStep({
  identifier,
  loading,
  canSignup = false,
  onCreateAccount,
  onTryAnother,
}: NoAccountStepProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-muted/40 p-4 text-center space-y-2">
        <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <HugeiconsIcon icon={UserRemove01Icon} strokeWidth={2} className="size-5" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">No account found</p>
          <p className="text-xs text-muted-foreground break-all">
            {identifier ? (
              <>
                We couldn&apos;t find an AllGo account matching{' '}
                <span className="font-medium text-foreground">{identifier}</span>.
              </>
            ) : (
              'We could not find an existing AllGo account for this sign-in attempt.'
            )}
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground pt-1">
          {canSignup
            ? 'No account was found for this email or phone. You can create a new account or try another identifier.'
            : 'Self-registration is currently disabled. Check for typos, try another email or phone number, or contact your administrator to be invited.'}
        </p>
      </div>

      {canSignup && onCreateAccount && (
        <Button type="button" disabled={loading} onClick={onCreateAccount} className="w-full">
          Create Account
        </Button>
      )}

      <Button
        type="button"
        variant="outline"
        disabled={loading}
        onClick={onTryAnother}
        className="w-full"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
        Try another email or phone
      </Button>
    </div>
  );
}
