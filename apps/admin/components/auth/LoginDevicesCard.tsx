'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { authApi } from '@/data/api/auth.api';
import { useAuth } from '@/lib/auth-context';
import type { ActiveDeviceSession } from '@/data/types';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  HugeiconsIcon,
  toast,
} from '@allgo/ui';
import {
  Delete02Icon,
  LaptopPhoneSyncIcon,
  RefreshIcon,
} from '@hugeicons/core-free-icons';

export function LoginDevicesCard() {
  const { clearClientSession } = useAuth();
  const [sessions, setSessions] = useState<ActiveDeviceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyDeviceId, setBusyDeviceId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authApi.listSessions();
      setSessions(res.sessions || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load active login devices';
      toast.add({ title: 'Error', description: msg, type: 'error', timeout: 5000 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    authApi
      .listSessions()
      .then((res) => {
        if (active) {
          setSessions(res.sessions || []);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          const msg = err instanceof Error ? err.message : 'Failed to load active login devices';
          toast.add({ title: 'Error', description: msg, type: 'error', timeout: 5000 });
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const handleRevokeDevice = async (session: ActiveDeviceSession) => {
    setBusyDeviceId(session.deviceId);
    try {
      await authApi.revokeSession(session.deviceId);
      if (session.isCurrent) {
        toast.add({
          title: 'Current session revoked',
          description: 'You have been signed out on this device.',
          type: 'success',
          timeout: 3500,
        });
        clearClientSession(true);
        return;
      }
      setSessions((prev) => prev.filter((s) => s.deviceId !== session.deviceId));
      toast.add({
        title: 'Device revoked',
        description: `${session.deviceName || session.deviceId} has been signed out.`,
        type: 'success',
        timeout: 3500,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to revoke device session';
      toast.add({ title: 'Error', description: msg, type: 'error', timeout: 5000 });
    } finally {
      setBusyDeviceId(null);
    }
  };

  const handleRevokeAll = async () => {
    setRevokingAll(true);
    try {
      await authApi.revokeAllSessions();
      setSessions([]);
      toast.add({
        title: 'All devices revoked',
        description: 'All active sessions have been signed out.',
        type: 'success',
        timeout: 3500,
      });
      clearClientSession(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to revoke all sessions';
      toast.add({ title: 'Error', description: msg, type: 'error', timeout: 5000 });
    } finally {
      setRevokingAll(false);
    }
  };

  return (
    <Card id="login-devices">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <HugeiconsIcon icon={LaptopPhoneSyncIcon} strokeWidth={2} className="size-4 text-primary" />
            Login Devices &amp; Active Sessions
          </CardTitle>
          <CardDescription className="text-xs mt-1">
            Review browsers and devices currently signed into your account. Revoking a device immediately invalidates its session cookie.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading || revokingAll}
            onClick={() => void loadSessions()}
            className="gap-1.5"
          >
            <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} className="size-3.5" />
            Refresh
          </Button>
          {sessions.length > 0 && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={revokingAll || busyDeviceId !== null}
              onClick={() => void handleRevokeAll()}
              className="gap-1.5"
            >
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-3.5" />
              {revokingAll ? 'Revoking...' : 'Revoke All'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading active devices...</p>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-muted-foreground">No active device sessions found.</p>
        ) : (
          <div className="space-y-2.5">
            {sessions.map((s) => {
              const isBusy = busyDeviceId === s.deviceId || revokingAll;
              return (
                <div
                  key={s.id || s.deviceId}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border bg-muted/30"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {s.platform}
                      </Badge>
                      {s.loginMethod && (
                        <Badge variant="secondary" className="text-[10px]">
                          {s.loginMethod}
                        </Badge>
                      )}
                      {s.isCurrent && (
                        <Badge variant="default" className="text-[10px]">
                          Current Device
                        </Badge>
                      )}
                      <span className="text-xs font-medium text-foreground truncate">
                        {s.deviceName || s.deviceId}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      ID: <span className="font-mono">{s.deviceId}</span> · IP:{' '}
                      {s.ipAddress || 'Unknown'} · Last active:{' '}
                      {new Date(s.lastActiveAt).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => void handleRevokeDevice(s)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0 gap-1.5"
                  >
                    <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-3.5" />
                    {busyDeviceId === s.deviceId ? 'Revoking...' : 'Revoke'}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
