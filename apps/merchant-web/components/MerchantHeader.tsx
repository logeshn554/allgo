'use client';

import { Badge, Button } from '@allgo/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function MerchantHeader() {
  const pathname = usePathname();
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    setHasToken(Boolean(localStorage.getItem('allgo_merchant_token')));
  }, [pathname]);

  const navLinks = [
    { href: '/', label: 'Live Orders' },
    { href: '/catalog', label: 'Catalog & CSV' },
    { href: '/hours', label: 'Hours & Closures' },
    { href: '/finance', label: 'Settlements' },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <span>AllGo</span>
            <Badge variant="secondary" className="text-[10px]">
              Merchant Portal
            </Badge>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {hasToken ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                localStorage.removeItem('allgo_merchant_token');
                setHasToken(false);
                window.location.href = '/login';
              }}
            >
              Sign Out
            </Button>
          ) : (
            <Link href="/login">
              <Button size="sm">Sign In</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
