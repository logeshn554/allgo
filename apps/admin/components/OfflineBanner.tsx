'use client';

import React from 'react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { HugeiconsIcon } from '@allgo/ui';
import { WifiOff01Icon } from '@hugeicons/core-free-icons';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="assertive"
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-xs font-medium text-destructive-foreground shadow-md"
    >
      <HugeiconsIcon icon={WifiOff01Icon} strokeWidth={2} className="size-4 shrink-0" />
      <span>You are offline. Check your internet connection to continue.</span>
    </div>
  );
}
