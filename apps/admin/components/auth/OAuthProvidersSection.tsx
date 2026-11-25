'use client';

import React from 'react';
import { Button, Separator } from '@allgo/ui';
import { OAuthProviderIcon } from './OAuthProviderIcon';
import type { PublicOAuthProvider } from './types';

interface OAuthProvidersSectionProps {
  providers: PublicOAuthProvider[];
  loading: boolean;
  showDivider?: boolean;
  onSelectProvider: (slug: string) => void;
}

export function OAuthProvidersSection({
  providers,
  loading,
  showDivider = true,
  onSelectProvider,
}: OAuthProvidersSectionProps) {
  const configuredProviders = providers.filter((p) => p.configured !== false);
  if (configuredProviders.length === 0) return null;

  return (
    <div className={showDivider ? 'space-y-3 pt-2' : 'space-y-3'}>
      {showDivider && (
        <div className="relative flex items-center justify-center">
          <Separator />
          <span className="bg-card px-2 text-[11px] uppercase text-muted-foreground absolute">
            Or continue with
          </span>
        </div>
      )}

      <div className={showDivider ? 'grid grid-cols-1 gap-2 pt-2' : 'grid grid-cols-1 gap-2'}>
        {configuredProviders.map((provider) => (
          <Button
            key={provider.slug}
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => onSelectProvider(provider.slug)}
            className="w-full justify-center gap-2.5"
          >
            <OAuthProviderIcon slug={provider.slug} className="size-4 shrink-0" />
            <span>Continue with {provider.displayName}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
