'use client';

import React, { useEffect, useState } from 'react';
import {
  authSettingsApi,
  AuthSettings,
  AuthProviderConfig,
  API_BASE,
} from '@/data/api';
import { OAuthProviderIcon } from '@/components/auth';
import {
  Button,
  Label,
  Switch,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  HugeiconsIcon,
  Input,
  toast,
} from '@allgo/ui';
import {
  Shield01Icon,
  Add01Icon,
  Delete02Icon,
  Copy01Icon,
} from '@hugeicons/core-free-icons';

export default function AuthSettingsPage() {
  const [settings, setSettings] = useState<AuthSettings | null>(null);
  const [providers, setProviders] = useState<AuthProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Provider toggle options modal (no credentials — just autoLink / allowSignup)
  const [editingProvider, setEditingProvider] = useState<AuthProviderConfig | null>(null);
  const [providerAutoLink, setProviderAutoLink] = useState(true);
  const [providerAllowSignup, setProviderAllowSignup] = useState(true);

  // Add custom provider modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSlug, setNewSlug] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newAuthUrl, setNewAuthUrl] = useState('');
  const [newTokenUrl, setNewTokenUrl] = useState('');
  const [newUserinfoUrl, setNewUserinfoUrl] = useState('');
  const [newScopes, setNewScopes] = useState('openid email profile');

  const notify = {
    success: (title: string, description?: string) =>
      toast.add({ title, description, type: 'success', timeout: 3500 }),
    error: (title: string, description?: string) =>
      toast.add({ title, description, type: 'error', timeout: 5000 }),
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([
        authSettingsApi.getSettings(),
        authSettingsApi.listProviders(),
      ]);
      setSettings(s);
      setProviders(p.providers || []);
    } catch (err: unknown) {
      notify.error('Failed to load settings', err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleSetting = async (
    key: keyof AuthSettings,
    value: boolean | number | string,
  ) => {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await authSettingsApi.updateSettings({ [key]: value });
      setSettings(updated);
      notify.success('Policy updated', 'Authentication settings have been saved.');
    } catch (err: unknown) {
      notify.error('Failed to update setting', err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleProvider = async (provider: AuthProviderConfig, enabled: boolean) => {
    setSaving(true);
    try {
      const updated = await authSettingsApi.updateProvider(provider.slug, { enabled });
      setProviders((prev) => prev.map((p) => (p.slug === provider.slug ? updated : p)));
      notify.success(
        `${provider.displayName} ${enabled ? 'enabled' : 'disabled'}`,
        enabled
          ? 'Provider is now active on the login screen.'
          : 'Provider has been hidden from login.',
      );
    } catch (err: unknown) {
      notify.error('Failed to update provider', err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const openProviderOptions = (p: AuthProviderConfig) => {
    setEditingProvider(p);
    setProviderAutoLink(p.autoLink);
    setProviderAllowSignup(p.allowSignup);
  };

  const handleSaveProviderOptions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProvider) return;
    setSaving(true);
    try {
      const updated = await authSettingsApi.updateProvider(editingProvider.slug, {
        autoLink: providerAutoLink,
        allowSignup: providerAllowSignup,
      });
      setProviders((prev) =>
        prev.map((p) => (p.slug === editingProvider.slug ? updated : p)),
      );
      setEditingProvider(null);
      notify.success(`${updated.displayName} options saved`);
    } catch (err: unknown) {
      notify.error('Failed to save options', err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCustomProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await authSettingsApi.createProvider({
        slug: newSlug.trim().toLowerCase(),
        displayName: newDisplayName.trim(),
        providerType: 'OAUTH2',
        enabled: true,
        authorizationUrl: newAuthUrl.trim(),
        tokenUrl: newTokenUrl.trim(),
        userinfoUrl: newUserinfoUrl.trim(),
        scopes: newScopes.trim(),
      });
      setProviders((prev) => [...prev, created]);
      setShowAddModal(false);
      setNewSlug('');
      setNewDisplayName('');
      setNewAuthUrl('');
      setNewTokenUrl('');
      setNewUserinfoUrl('');
      notify.success(
        `Provider '${created.displayName}' added`,
        'Enter OAuth credentials via your server environment variables.',
      );
    } catch (err: unknown) {
      notify.error('Failed to add provider', err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProvider = async (slug: string, name: string) => {
    setSaving(true);
    try {
      await authSettingsApi.deleteProvider(slug);
      setProviders((prev) => prev.filter((p) => p.slug !== slug));
      notify.success(`Provider '${name}' removed`);
    } catch (err: unknown) {
      notify.error('Failed to remove provider', err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const copyCallbackUrl = async (slug: string) => {
    const url = `${API_BASE}/v1/auth/oauth/${slug}/callback`;
    try {
      await navigator.clipboard.writeText(url);
      notify.success('Copied!', url);
    } catch {
      notify.error('Copy failed', 'Please copy the URL manually.');
    }
  };

  if (loading) {
    return (
      <div className="p-10 text-center text-sm text-muted-foreground">
        Loading authentication settings…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <HugeiconsIcon icon={Shield01Icon} strokeWidth={2} className="size-6 text-primary" />
            Authentication &amp; OAuth Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Control login methods, provider toggles, account linking policies, and session limits.
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="size-4" />
          Add Custom Provider
        </Button>
      </div>

      <Tabs defaultValue="providers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="providers">OAuth &amp; Social Providers</TabsTrigger>
          <TabsTrigger value="methods">Auth Methods &amp; Policies</TabsTrigger>
        </TabsList>

        {/* ── OAuth Providers Tab ─────────────────────────── */}
        <TabsContent value="providers" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {providers.map((p) => {
              const isBuiltIn = ['google', 'github', 'apple', 'microsoft'].includes(p.slug);
              return (
                <Card key={p.slug}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <OAuthProviderIcon slug={p.slug} className="size-4 shrink-0" />
                        {p.displayName}
                        <Badge variant="outline" className="text-[10px]">
                          {p.providerType}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {p.clientId
                          ? `Credentials configured`
                          : 'Credentials not set — configure via environment variables'}
                      </CardDescription>
                    </div>
                    <Switch
                      checked={p.enabled}
                      disabled={saving}
                      onCheckedChange={(checked) => handleToggleProvider(p, checked)}
                    />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Callback URL */}
                    <div className="flex items-center justify-between text-xs bg-muted/50 px-3 py-2 rounded-lg">
                      <span className="truncate font-mono text-[11px] text-muted-foreground">
                        {API_BASE}/v1/auth/oauth/{p.slug}/callback
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => copyCallbackUrl(p.slug)}
                        className="h-7 px-2 shrink-0"
                      >
                        <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} className="size-3.5" />
                      </Button>
                    </div>

                    {/* Status + actions */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant={p.clientId ? 'secondary' : 'outline'} className="text-[10px]">
                          {p.clientId ? 'Credentials Set' : 'No Credentials'}
                        </Badge>
                        {p.autoLink && (
                          <Badge variant="secondary" className="text-[10px]">
                            Auto-Link
                          </Badge>
                        )}
                        {p.allowSignup && (
                          <Badge variant="secondary" className="text-[10px]">
                            Sign-up allowed
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {!isBuiltIn && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteProvider(p.slug, p.displayName)}
                            className="text-destructive hover:text-destructive"
                          >
                            <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-4" />
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => openProviderOptions(p)}>
                          Options
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            💡 OAuth credentials (Client ID &amp; Secret) are configured via environment variables on the API server — not stored here.
          </p>
        </TabsContent>

        {/* ── Auth Methods & Policies Tab ─────────────────── */}
        <TabsContent value="methods" className="space-y-4">
          {settings && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sign-In Methods */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sign-In Methods</CardTitle>
                  <CardDescription>
                    Control which authentication methods appear on login screens
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Phone Number + SMS OTP</p>
                      <p className="text-xs text-muted-foreground">Indian E.164 +91 OTP verification</p>
                    </div>
                    <Switch
                      checked={settings.phoneOtpEnabled}
                      disabled={saving}
                      onCheckedChange={(v) => handleToggleSetting('phoneOtpEnabled', v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Email &amp; Password</p>
                      <p className="text-xs text-muted-foreground">Scrypt-hashed password authentication</p>
                    </div>
                    <Switch
                      checked={settings.emailPasswordEnabled}
                      disabled={saving}
                      onCheckedChange={(v) => handleToggleSetting('emailPasswordEnabled', v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Email OTP (Passwordless)</p>
                      <p className="text-xs text-muted-foreground">6-digit verification code sent to email</p>
                    </div>
                    <Switch
                      checked={settings.emailOtpEnabled}
                      disabled={saving}
                      onCheckedChange={(v) => handleToggleSetting('emailOtpEnabled', v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">OAuth / Social Sign-In</p>
                      <p className="text-xs text-muted-foreground">Allow login via enabled OAuth providers</p>
                    </div>
                    <Switch
                      checked={settings.oauthEnabled}
                      disabled={saving}
                      onCheckedChange={(v) => handleToggleSetting('oauthEnabled', v)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Account Policies */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Account &amp; Session Policies</CardTitle>
                  <CardDescription>
                    Registration rules, identity linking, and device caps
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Allow Self-Registration</p>
                      <p className="text-xs text-muted-foreground">Permit new users to sign up automatically</p>
                    </div>
                    <Switch
                      checked={settings.allowSelfSignup}
                      disabled={saving}
                      onCheckedChange={(v) => handleToggleSetting('allowSelfSignup', v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Auto-Link Verified Accounts</p>
                      <p className="text-xs text-muted-foreground">Merge OAuth logins matching verified email</p>
                    </div>
                    <Switch
                      checked={settings.autoLinkVerifiedAccounts}
                      disabled={saving}
                      onCheckedChange={(v) => handleToggleSetting('autoLinkVerifiedAccounts', v)}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">Two-Factor Policy</p>
                      <p className="text-xs text-muted-foreground">
                        TOTP authenticator &amp; backup code enforcement
                      </p>
                    </div>
                    <select
                      aria-label="Two-Factor Authentication Policy"
                      value={settings.twoFactorPolicy || 'OPTIONAL'}
                      disabled={saving}
                      onChange={(e) => handleToggleSetting('twoFactorPolicy', e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="DISABLED">Disabled</option>
                      <option value="OPTIONAL">Optional (User Choice)</option>
                      <option value="REQUIRED_FOR_ADMINS">Required for Admins</option>
                      <option value="REQUIRED_FOR_ALL">Required for All Users</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">Max Devices Per User</p>
                      <p className="text-xs text-muted-foreground">Concurrent active device sessions</p>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      className="w-24"
                      value={settings.maxDevicesPerUser}
                      onChange={(e) =>
                        handleToggleSetting('maxDevicesPerUser', Number(e.target.value) || 5)
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Provider Options Dialog (no credentials) ───── */}
      <Dialog open={!!editingProvider} onOpenChange={(open) => !open && setEditingProvider(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingProvider && (
                <OAuthProviderIcon slug={editingProvider.slug} className="size-4" />
              )}
              {editingProvider?.displayName} Options
            </DialogTitle>
            <DialogDescription>
              Toggle linking and registration behaviour for this provider.
              OAuth credentials are set via server environment variables.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveProviderOptions} className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Auto-link verified emails</Label>
                <p className="text-xs text-muted-foreground">
                  Merge with an existing account that shares the same verified email
                </p>
              </div>
              <Switch checked={providerAutoLink} onCheckedChange={setProviderAutoLink} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Allow new user sign-up</Label>
                <p className="text-xs text-muted-foreground">
                  Let first-time OAuth users create a new account automatically
                </p>
              </div>
              <Switch checked={providerAllowSignup} onCheckedChange={setProviderAllowSignup} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingProvider(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save Options'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Add Custom Provider Dialog ───────────────────── */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom OAuth 2.0 / OIDC Provider</DialogTitle>
            <DialogDescription>
              Register an enterprise SSO or custom OAuth provider. Enter the OAuth endpoints — credentials are added via API server environment variables.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCustomProvider} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Slug</Label>
                <Input
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  placeholder="okta-corp"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Display Name</Label>
                <Input
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="Okta Corporate"
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Authorization URL</Label>
              <Input value={newAuthUrl} onChange={(e) => setNewAuthUrl(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Token URL</Label>
              <Input value={newTokenUrl} onChange={(e) => setNewTokenUrl(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>UserInfo URL</Label>
              <Input
                value={newUserinfoUrl}
                onChange={(e) => setNewUserinfoUrl(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Scopes</Label>
              <Input value={newScopes} onChange={(e) => setNewScopes(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Adding…' : 'Add Provider'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
