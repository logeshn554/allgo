'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppSidebar } from '@/components/app-sidebar';
import { Header } from '@/components/Header';
import { SidebarProvider, SidebarInset } from '@allgo/ui';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login?session_expired=1');
      return;
    }
    if (
      !isLoading &&
      isAuthenticated &&
      isAdmin &&
      user?.twoFactorSetupRequired &&
      pathname !== '/admin/security'
    ) {
      router.replace('/admin/security?setup_required=1');
    }
  }, [isAuthenticated, isLoading, isAdmin, user?.twoFactorSetupRequired, pathname, router]);

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="min-w-0 flex flex-col flex-1">
        <Header />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
