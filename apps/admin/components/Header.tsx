'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  HugeiconsIcon,
  Separator,
  SidebarTrigger,
} from '@allgo/ui';
import {
  Add01Icon,
  ArrowDown01Icon,
  CheckmarkCircle02Icon,
  Key01Icon,
  Link01Icon,
  Logout01Icon,
  Notification01Icon,
  SecurityCheckIcon,
  Shield01Icon,
} from '@hugeicons/core-free-icons';

function getInitials(name?: string | null, email?: string | null, phone?: string | null): string {
  if (name && name.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) return email.slice(0, 2).toUpperCase();
  if (phone) return phone.slice(-2);
  return 'AD';
}

export function Header() {
  const { user, sessions, switchSession, logout, logoutAll } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const segment = pathname.split('/').filter(Boolean).pop() || 'dashboard';
  const pageTitle = segment.charAt(0).toUpperCase() + segment.slice(1);

  const initials = getInitials(user?.fullName, user?.email, user?.phone);
  const otherSessions = sessions.filter((s) => s.userId !== user?.id);

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 sticky top-0 z-30">
      <div className="flex items-center gap-3 flex-1">
        <SidebarTrigger className="-ms-1" />
        <Separator orientation="vertical" className="me-2 my-auto h-4" />
        <Breadcrumb className="hidden sm:block">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin/dashboard">Admin</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/admin/security"
          className="hidden md:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-muted"
          title="Manage Two-Factor Authentication"
        >
          <HugeiconsIcon
            icon={Shield01Icon}
            strokeWidth={2}
            className={user?.twoFactorEnabled ? 'size-3.5 text-emerald-500' : 'size-3.5 text-amber-500'}
          />
          <span>{user?.twoFactorEnabled ? '2FA On' : 'Enable 2FA'}</span>
        </Link>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="text-muted-foreground hover:text-foreground relative"
        >
          <HugeiconsIcon icon={Notification01Icon} strokeWidth={2} className="size-4" />
          <span className="absolute top-1.5 end-1.5 size-2 rounded-full bg-primary" />
        </Button>

        <Separator orientation="vertical" className="my-auto h-6" />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-muted/70 transition-colors cursor-pointer outline-none"
              />
            }
          >
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-start hidden lg:block">
              <p className="text-xs font-semibold text-foreground leading-tight flex items-center gap-1">
                <HugeiconsIcon icon={SecurityCheckIcon} strokeWidth={2} className="size-3.5 text-primary inline" />
                {user?.fullName || 'Super Administrator'}
              </p>
              <p className="text-[11px] text-muted-foreground font-mono leading-tight mt-0.5">
                {user?.email || user?.phone || '+919876543210'} • {user?.roles?.join(', ') || 'ADMIN'}
              </p>
            </div>
            <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} className="size-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" sideOffset={8} className="w-72">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {user?.fullName || 'Administrator'}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-mono truncate">
                      {user?.email || user?.phone}
                    </p>
                  </div>
                  <Badge variant={user?.twoFactorEnabled ? 'default' : 'outline'} className="text-[10px] shrink-0">
                    {user?.twoFactorEnabled ? '2FA On' : '2FA Off'}
                  </Badge>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push('/admin/security')}>
                <HugeiconsIcon icon={Key01Icon} strokeWidth={2} className="size-4" />
                <span className="flex-1 text-xs">Account Security &amp; 2FA</span>
                {!user?.twoFactorEnabled && (
                  <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                    Setup
                  </span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/admin/security#linked-accounts')}>
                <HugeiconsIcon icon={Link01Icon} strokeWidth={2} className="size-4" />
                <span className="text-xs">Linked Accounts (Phone, Email, OAuth)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/admin/auth-settings')}>
                <HugeiconsIcon icon={Shield01Icon} strokeWidth={2} className="size-4" />
                <span className="text-xs">Auth &amp; OAuth Settings</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wider">
                Accounts ({sessions.length || 1})
              </DropdownMenuLabel>
              {otherSessions.map((session) => (
                <DropdownMenuItem
                  key={session.userId}
                  onClick={() => void switchSession(session.userId)}
                >
                  <Avatar className="size-6">
                    <AvatarFallback className="bg-muted text-[10px] font-semibold">
                      {getInitials(session.user.fullName, session.user.email, session.user.phone)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">
                      {session.user.fullName || session.user.email || session.user.phone}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">
                      {session.user.email || session.user.phone}
                    </p>
                  </div>
                  <span className="text-[10px] text-primary font-medium">Switch</span>
                </DropdownMenuItem>
              ))}
              {user && (
                <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-muted-foreground">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate">Active: {user.email || user.phone}</span>
                </div>
              )}
              <DropdownMenuItem onClick={() => router.push('/login?add_account=1')}>
                <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="size-4" />
                <span className="text-xs">Add another account</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem variant="destructive" onClick={logout}>
                <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} className="size-4" />
                <span className="text-xs">
                  {otherSessions.length > 0 ? 'Sign out current account' : 'Sign Out'}
                </span>
              </DropdownMenuItem>
              {otherSessions.length > 0 && (
                <DropdownMenuItem variant="destructive" onClick={logoutAll}>
                  <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} className="size-4" />
                  <span className="text-xs">Sign out all accounts</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
