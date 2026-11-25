'use client';

import { LoginCard } from '@/components/auth';
import { Suspense } from 'react';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="w-8 h-8 border-3 border-border border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginCard />
    </Suspense>
  );
}
