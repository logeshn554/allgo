'use client';

import React, { useEffect, useState } from 'react';
import { authSettingsApi, UserIdentity } from '@/data/api';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  HugeiconsIcon,
} from '@allgo/ui';
import { Link01Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { OAuthProviderIcon } from '@/components/auth';

export function UserIdentitiesCard({ userId }: { userId: string }) {
  const [identities, setIdentities] = useState<UserIdentity[]>([]);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState('email');
  const [accountId, setAccountId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await authSettingsApi.listUserIdentities(userId);
      setIdentities(res.identities || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) load();
  }, [userId]);

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await authSettingsApi.linkUserIdentity(userId, {
        provider,
        providerAccountId: accountId.trim(),
        verified: true,
      });
      setAccountId('');
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to link identity');
    } finally {
      setBusy(false);
    }
  };

  const handleUnlink = async (identityId: string) => {
    setBusy(true);
    setError(null);
    try {
      await authSettingsApi.unlinkUserIdentity(userId, identityId);
      setIdentities((prev) => prev.filter((i) => i.id !== identityId));
    } catch (err: any) {
      setError(err.message || 'Failed to unlink identity');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <HugeiconsIcon icon={Link01Icon} strokeWidth={2} className="size-4 text-primary" />
          Linked Accounts &amp; Login Sources
        </CardTitle>
        <CardDescription>
          Manage linked phone numbers, emails, and OAuth providers for this account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-xs text-muted-foreground">Loading linked identities...</p>
        ) : identities.length === 0 ? (
          <p className="text-xs text-muted-foreground">No linked identities recorded.</p>
        ) : (
          <div className="space-y-2">
            {identities.map((idn) => (
              <div
                key={idn.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <OAuthProviderIcon slug={idn.provider} className="size-4 shrink-0 text-muted-foreground" />
                    <Badge variant="outline" className="uppercase text-[10px]">
                      {idn.provider}
                    </Badge>
                    <span className="text-sm font-medium font-mono">{idn.providerAccountId}</span>
                    {idn.verified && (
                      <Badge variant="secondary" className="text-[10px]">
                        Verified
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Last used: {new Date(idn.lastUsedAt).toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy || identities.length <= 1}
                  onClick={() => handleUnlink(idn.id)}
                  className="text-destructive hover:text-destructive"
                  title="Unlink identity"
                >
                  <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleLink} className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
          <Select value={provider} onValueChange={(v) => v && setProvider(v)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="google">Google</SelectItem>
              <SelectItem value="github">GitHub</SelectItem>
              <SelectItem value="apple">Apple</SelectItem>
              <SelectItem value="microsoft">Microsoft</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder={
              provider === 'phone'
                ? '+919876543210'
                : provider === 'email'
                  ? 'user@example.com'
                  : 'Provider Account ID / sub'
            }
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={busy}>
            Link Account
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
