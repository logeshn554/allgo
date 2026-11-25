'use client';

import { authApi } from '@/data/api/auth.api';
import type { LinkedIdentity } from '@/data/types';
import { useAuth } from '@/lib/auth-context';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  HugeiconsIcon,
  Input,
  Label,
} from '@allgo/ui';
import {
  CheckmarkCircle02Icon,
  Delete02Icon,
  Link01Icon,
  Mail01Icon,
  SmartPhone01Icon,
} from '@hugeicons/core-free-icons';
import Link from 'next/link';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { OAuthProviderIcon } from './OAuthProviderIcon';
import type { PublicOAuthProvider } from './types';

const PROVIDER_LABELS: Record<string, string> = {
  phone: 'Phone',
  email: 'Email',
  google: 'Google',
  microsoft: 'Microsoft',
  apple: 'Apple ID',
  github: 'GitHub',
};

export function LinkedAccountsCard() {
  const { refreshUser } = useAuth();
  const [identities, setIdentities] = useState<LinkedIdentity[]>([]);
  const [oauthProviders, setOauthProviders] = useState<PublicOAuthProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Link Phone OTP state
  const [linkPhone, setLinkPhone] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtpCode, setPhoneOtpCode] = useState('');

  // Link Email OTP state
  const [linkEmail, setLinkEmail] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [idRes, provRes] = await Promise.all([
        authApi.listMyIdentities(),
        authApi.getPublicProviders(),
      ]);
      setIdentities(idRes.identities || []);
      setOauthProviders(provRes.oauthProviders || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load linked accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const linked = params.get('linked');
      const oauthError = params.get('oauth_error');
      if (linked) {
        setMessage(`${PROVIDER_LABELS[linked] || linked} account linked successfully.`);
      } else if (oauthError) {
        setError(oauthError);
      }
      if (linked || oauthError) {
        params.delete('linked');
        params.delete('oauth_error');
        const nextQs = params.toString();
        const nextUrl = `${window.location.pathname}${nextQs ? `?${nextQs}` : ''}${window.location.hash}`;
        window.history.replaceState({}, '', nextUrl);
      }
    }
    void loadData();
  }, [loadData]);

  const handleUnlink = async (identity: LinkedIdentity) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await authApi.unlinkMyIdentity(identity.id);
      setMessage(`Unlinked ${PROVIDER_LABELS[identity.provider] || identity.provider} account.`);
      await Promise.all([loadData(), refreshUser()]);
    } catch (err: any) {
      setError(err?.message || 'Failed to unlink account');
    } finally {
      setBusy(false);
    }
  };

  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkPhone.trim()) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await authApi.sendLinkPhoneOtp(linkPhone.trim());
      setPhoneOtpSent(true);
      setMessage(`Verification code sent to ${linkPhone.trim()}.`);
    } catch (err: any) {
      setError(err?.message || 'Failed to send phone verification code');
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneOtpCode.trim()) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await authApi.verifyLinkPhoneOtp(linkPhone.trim(), phoneOtpCode.trim());
      setLinkPhone('');
      setPhoneOtpCode('');
      setPhoneOtpSent(false);
      setMessage('Phone number verified and linked to your account.');
      await Promise.all([loadData(), refreshUser()]);
    } catch (err: any) {
      setError(err?.message || 'Invalid phone verification code');
    } finally {
      setBusy(false);
    }
  };

  const handleSendEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkEmail.trim()) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await authApi.sendLinkEmailOtp(linkEmail.trim());
      setEmailOtpSent(true);
      setMessage(`Verification code sent to ${linkEmail.trim()}.`);
    } catch (err: any) {
      setError(err?.message || 'Failed to send email verification code');
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOtpCode.trim()) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await authApi.verifyLinkEmailOtp(linkEmail.trim(), emailOtpCode.trim());
      setLinkEmail('');
      setEmailOtpCode('');
      setEmailOtpSent(false);
      setMessage('Email address verified and linked to your account.');
      await Promise.all([loadData(), refreshUser()]);
    } catch (err: any) {
      setError(err?.message || 'Invalid email verification code');
    } finally {
      setBusy(false);
    }
  };

  const handleConnectOAuth = async (slug: string) => {
    setBusy(true);
    setError(null);
    try {
      const redirectUrl = `${window.location.origin}/admin/security#linked-accounts`;
      const res = await authApi.startOAuthLink(slug, redirectUrl);
      window.location.href = res.url;
    } catch (err: any) {
      setError(err?.message || `Failed to connect ${PROVIDER_LABELS[slug] || slug}`);
      setBusy(false);
    }
  };

  const linkedProviders = new Set(identities.map((i) => i.provider.toLowerCase()));

  return (
    <Card id="linked-accounts">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <HugeiconsIcon icon={Link01Icon} strokeWidth={2} className="size-4 text-primary" />
          Linked Accounts &amp; Sign-In Methods
        </CardTitle>
        <CardDescription className="text-xs">
          Link your phone number, email address, Google, Microsoft, Apple ID, or GitHub to sign in
          with any method.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {message && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              strokeWidth={2}
              className="size-4 shrink-0"
            />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium"
          >
            {error}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">Connected Identities</p>
          {loading ? (
            <p className="text-xs text-muted-foreground">Loading connected accounts...</p>
          ) : identities.length === 0 ? (
            <p className="text-xs text-muted-foreground">No linked identities found.</p>
          ) : (
            <div className="divide-y rounded-xl border">
              {identities.map((identity) => (
                <div
                  key={identity.id}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <OAuthProviderIcon
                      slug={identity.provider}
                      className="size-4 shrink-0 text-muted-foreground"
                    />
                    <Badge variant="outline" className="capitalize shrink-0">
                      {PROVIDER_LABELS[identity.provider] || identity.provider}
                    </Badge>
                    <span className="font-mono truncate text-foreground">
                      {identity.email || identity.phone || identity.providerAccountId}
                    </span>
                    {identity.verified && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        Verified
                      </Badge>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy || identities.length <= 1}
                    title={
                      identities.length <= 1
                        ? 'Cannot unlink your only sign-in method'
                        : 'Unlink this account'
                    }
                    onClick={() => handleUnlink(identity)}
                    className="text-muted-foreground hover:text-destructive h-7 px-2"
                  >
                    <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-3.5" />
                    <span className="ms-1 hidden sm:inline">Unlink</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={SmartPhone01Icon}
                strokeWidth={2}
                className="size-4 text-primary"
              />
              <Label className="text-xs font-semibold">Link Phone Number</Label>
            </div>
            {!phoneOtpSent ? (
              <form onSubmit={handleSendPhoneOtp} className="flex gap-2">
                <Input
                  type="tel"
                  value={linkPhone}
                  onChange={(e) => setLinkPhone(e.target.value)}
                  placeholder="+919876543210"
                  disabled={busy}
                  className="text-xs"
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  disabled={busy || !linkPhone.trim()}
                >
                  Send OTP
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyPhoneOtp} className="space-y-2">
                <p className="text-[11px] text-muted-foreground">
                  Enter the 6-digit code sent to <span className="font-mono">{linkPhone}</span>
                </p>
                <div className="flex gap-2">
                  <Input
                    value={phoneOtpCode}
                    onChange={(e) => setPhoneOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit OTP"
                    disabled={busy}
                    className="text-xs font-mono"
                  />
                  <Button type="submit" size="sm" disabled={busy || phoneOtpCode.length !== 6}>
                    Verify
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      setPhoneOtpSent(false);
                      setPhoneOtpCode('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>

          <div className="rounded-xl border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={Mail01Icon} strokeWidth={2} className="size-4 text-primary" />
              <Label className="text-xs font-semibold">Link Email Address</Label>
            </div>
            {!emailOtpSent ? (
              <form onSubmit={handleSendEmailOtp} className="flex gap-2">
                <Input
                  type="email"
                  value={linkEmail}
                  onChange={(e) => setLinkEmail(e.target.value)}
                  placeholder="admin@allgo.in"
                  disabled={busy}
                  className="text-xs"
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  disabled={busy || !linkEmail.trim()}
                >
                  Send OTP
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyEmailOtp} className="space-y-2">
                <p className="text-[11px] text-muted-foreground">
                  Enter the 6-digit code sent to <span className="font-mono">{linkEmail}</span>
                </p>
                <div className="flex gap-2">
                  <Input
                    value={emailOtpCode}
                    onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit OTP"
                    disabled={busy}
                    className="text-xs font-mono"
                  />
                  <Button type="submit" size="sm" disabled={busy || emailOtpCode.length !== 6}>
                    Verify
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      setEmailOtpSent(false);
                      setEmailOtpCode('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-foreground">Single Sign-On Providers</p>
            <Link href="/admin/auth-settings" className="text-[11px] text-primary hover:underline">
              Configure OAuth providers
            </Link>
          </div>
          {oauthProviders.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No OAuth providers are currently enabled. Enable Google, Microsoft, Apple ID, or
              GitHub in Auth &amp; OAuth Settings.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {oauthProviders.map((prov) => {
                const isLinked = linkedProviders.has(prov.slug.toLowerCase());
                const isConfigured = prov.configured !== false;
                return (
                  <Button
                    key={prov.slug}
                    type="button"
                    variant={isLinked ? 'secondary' : 'outline'}
                    disabled={busy || isLinked || !isConfigured}
                    onClick={() => handleConnectOAuth(prov.slug)}
                    className="justify-between text-xs gap-2"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <OAuthProviderIcon slug={prov.slug} className="size-4 shrink-0" />
                      <span className="truncate">{prov.displayName}</span>
                    </span>
                    <Badge
                      variant={isLinked ? 'default' : 'outline'}
                      className="text-[10px] shrink-0"
                    >
                      {isLinked ? 'Connected' : isConfigured ? 'Connect' : 'Unconfigured'}
                    </Badge>
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
