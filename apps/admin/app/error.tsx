'use client';

import { useAuth } from '@/lib/auth-context';
import { Button, HugeiconsIcon } from '@allgo/ui';
import { Alert02Icon, Logout01Icon, RefreshIcon } from '@hugeicons/core-free-icons';
import { useEffect } from 'react';

export default function GlobalSegmentError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  const { logout } = useAuth();

  useEffect(() => {
    console.error(error);
  }, [error]);

  const message =
    error instanceof Error ? error.message : 'An unexpected administrative error occurred.';
  const isForbidden = message.startsWith('403 Forbidden');

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg bg-destructive/10 border border-destructive/20 p-6 rounded-2xl shadow-sm text-center">
        <div className="w-12 h-12 rounded-full bg-destructive/15 text-destructive flex items-center justify-center mx-auto mb-3">
          <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-6" />
        </div>
        <h2 className="text-lg font-bold text-destructive mb-2">
          {isForbidden ? '403 Forbidden: Insufficient Privileges' : 'Something went wrong'}
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed mb-5">
          {isForbidden ? message.replace(/^403 Forbidden:\s*/, '') : message}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {!isForbidden && (
            <Button variant="default" size="sm" onClick={() => retry()} className="gap-2">
              <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} className="size-4" />
              Try Again
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={logout} className="gap-2">
            <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} className="size-4" />
            Sign Out &amp; Try Another Account
          </Button>
        </div>
      </div>
    </div>
  );
}
