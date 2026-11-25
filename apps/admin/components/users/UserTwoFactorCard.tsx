'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { authSettingsApi } from '@/data/api';
import type { TwoFactorStatusResponse } from '@/data/types';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  HugeiconsIcon,
} from '@allgo/ui';
import { Shield01Icon } from '@hugeicons/core-free-icons';

export function UserTwoFactorCard({ userId }: { userId: string }) {
  const [status, setStatus] = useState<TwoFactorStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authSettingsApi.getUserTwoFactorStatus(userId);
      setStatus(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load 2FA status');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleResetTwoFactor = async () => {
    setActing(true);
    setMessage(null);
    setError(null);
    try {
      await authSettingsApi.resetUserTwoFactor(userId);
      setMessage('Two-factor authentication has been reset for this user.');
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to reset 2FA');
    } finally {
      setActing(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <HugeiconsIcon icon={Shield01Icon} strokeWidth={2} className="size-4 text-primary" />
            Two-Factor Authentication (2FA)
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            TOTP authenticator app and recovery backup codes
          </CardDescription>
        </div>
        {status && (
          <Badge variant={status.enabled ? 'default' : 'outline'}>
            {status.enabled ? 'Enabled' : 'Not Enabled'}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {message && (
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
            {message}
          </div>
        )}
        {error && (
          <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
            {error}
          </div>
        )}
        {loading ? (
          <p className="text-muted-foreground">Loading 2FA status...</p>
        ) : status ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1 text-muted-foreground">
              <p>
                Global Policy:{' '}
                <span className="font-medium text-foreground">{status.policy}</span>
              </p>
              {status.enabled && (
                <p>
                  Backup Codes Remaining:{' '}
                  <span className="font-medium text-foreground">
                    {status.backupCodesRemaining}
                  </span>
                </p>
              )}
              {status.enabledAt && (
                <p>
                  Enabled At:{' '}
                  <span className="font-medium text-foreground">
                    {new Date(status.enabledAt).toLocaleString()}
                  </span>
                </p>
              )}
            </div>
            {status.enabled && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={acting}
                onClick={handleResetTwoFactor}
              >
                {acting ? 'Resetting...' : 'Reset / Disable 2FA'}
              </Button>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
