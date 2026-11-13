'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#64748B' }}>Authenticating administrative credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: '40px', maxWidth: '600px', margin: '60px auto', textAlign: 'center' }}>
        <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #EF4444', padding: '24px', borderRadius: '12px' }}>
          <h2 style={{ color: '#991B1B', margin: '0 0 8px 0' }}>403 Forbidden: Insufficient Privileges</h2>
          <p style={{ color: '#7F1D1D', margin: 0 }}>
            Your account ({user?.phone}) has roles [{user?.roles?.join(', ')}], but does not possess the mandatory ADMIN role required to access the back-office console.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Header />
        <main style={{ flex: 1, padding: '24px', backgroundColor: '#F8FAFC' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

