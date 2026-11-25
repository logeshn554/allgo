import { AdminShell } from '@/components/AdminShell';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type React from 'react';

const SERVER_API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('allgo_admin_token')?.value?.trim();

  if (!token) {
    redirect('/login');
  }

  let user: { phone?: string; email?: string; roles?: string[] } | null = null;
  let unauthorized = false;

  try {
    const res = await fetch(`${SERVER_API_BASE}/v1/auth/me`, {
      headers: {
        // Forward the opaque session cookie so the API guard can validate it
        // via verifyOpaqueSessionCookie. The cookie value is an opaque token —
        // NOT a JWT — so we must NOT use "Authorization: Bearer" here.
        Cookie: `allgo_admin_token=${encodeURIComponent(token)}`,
        'X-AllGo-Role': 'ADMIN',
      },
      cache: 'no-store',
    });

    if (res.status === 401) {
      unauthorized = true;
    } else if (res.ok) {
      user = (await res.json()) as { phone?: string; email?: string; roles?: string[] };
    }
  } catch {
    // Allow client AuthProvider to handle transient network/offline recovery
  }

  if (unauthorized) {
    redirect('/login?session_expired=1');
  }

  if (user) {
    const roles = Array.isArray(user.roles) ? user.roles : [];
    const isAdmin = roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');
    if (!isAdmin) {
      throw new Error(
        `403 Forbidden: Your account (${user.phone || user.email || 'Unknown'}) has roles [${roles.join(', ')}], but does not possess the mandatory ADMIN role required to access the back-office console.`,
      );
    }
  }

  return <AdminShell>{children}</AdminShell>;
}
