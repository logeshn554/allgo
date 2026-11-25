'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { authSettingsApi, UserDeviceSession } from '@/data/api';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  HugeiconsIcon,
  toast,
} from '@allgo/ui';
import { LaptopPhoneSyncIcon, Delete02Icon } from '@hugeicons/core-free-icons';

export function UserDevicesCard({ userId }: { userId: string }) {
  const [devices, setDevices] = useState<UserDeviceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [revokingDeviceId, setRevokingDeviceId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authSettingsApi.listUserDevices(userId);
      setDevices(res.devices || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load user devices';
      toast.add({ title: 'Error', description: msg, type: 'error', timeout: 5000 });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) void load();
  }, [userId, load]);

  const handleRevokeDevice = async (device: UserDeviceSession) => {
    setRevokingDeviceId(device.deviceId);
    try {
      await authSettingsApi.revokeUserDevice(userId, device.deviceId);
      setDevices((prev) => prev.filter((d) => d.deviceId !== device.deviceId));
      toast.add({
        title: 'Device revoked',
        description: `${device.deviceName || device.deviceId} session has been terminated.`,
        type: 'success',
        timeout: 3500,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to revoke device session';
      toast.add({ title: 'Error', description: msg, type: 'error', timeout: 5000 });
    } finally {
      setRevokingDeviceId(null);
    }
  };

  const handleRevokeAll = async () => {
    setBusy(true);
    try {
      await authSettingsApi.revokeAllUserDevices(userId);
      setDevices([]);
      toast.add({
        title: 'All devices revoked',
        description: 'All active sessions for this user have been terminated.',
        type: 'success',
        timeout: 3500,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to revoke all user devices';
      toast.add({ title: 'Error', description: msg, type: 'error', timeout: 5000 });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <HugeiconsIcon icon={LaptopPhoneSyncIcon} strokeWidth={2} className="size-4 text-primary" />
            Active Devices &amp; Sessions
          </CardTitle>
          <CardDescription>
            Devices currently holding active sessions and their login sources.
          </CardDescription>
        </div>
        {devices.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            disabled={busy || revokingDeviceId !== null}
            onClick={() => void handleRevokeAll()}
            className="gap-1.5"
          >
            <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-3.5" />
            {busy ? 'Revoking...' : 'Revoke All'}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading devices...</p>
        ) : devices.length === 0 ? (
          <p className="text-xs text-muted-foreground">No active device sessions.</p>
        ) : (
          <div className="space-y-2">
            {devices.map((d) => (
              <div
                key={d.id || d.deviceId}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border bg-muted/30"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {d.platform}
                    </Badge>
                    {d.loginMethod && (
                      <Badge variant="secondary" className="text-[10px]">
                        {d.loginMethod}
                      </Badge>
                    )}
                    <span className="text-xs font-mono font-medium truncate">
                      {d.deviceName || d.deviceId}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    IP: {d.ipAddress || 'Unknown'} · Last active:{' '}
                    {new Date(d.lastActiveAt).toLocaleString()}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy || revokingDeviceId === d.deviceId}
                  onClick={() => void handleRevokeDevice(d)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0 gap-1.5"
                >
                  <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-3.5" />
                  {revokingDeviceId === d.deviceId ? 'Revoking...' : 'Revoke'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
