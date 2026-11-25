'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Button, HugeiconsIcon } from '@allgo/ui';
import { Alert02Icon, RefreshIcon } from '@hugeicons/core-free-icons';

export default function AdminError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const message =
    error instanceof Error ? error.message : 'An unexpected error occurred in this admin view.';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="w-full max-w-lg bg-destructive/10 border border-destructive/20 p-6 rounded-2xl shadow-sm space-y-4">
        <div className="w-12 h-12 rounded-full bg-destructive/15 text-destructive flex items-center justify-center mx-auto">
          <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-6" />
        </div>
        <h2 className="text-lg font-bold text-destructive">
          Unable to Load Administrative View
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">{message}</p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <Button variant="default" size="sm" onClick={() => retry()} className="gap-2">
            <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} className="size-4" />
            Try Again
          </Button>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/admin/dashboard" />}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
