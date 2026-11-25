import type React from 'react';

export const metadata = {
  title: 'AllGo Admin - Authentication',
  description: 'Sign in to AllGo Admin Control Console',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background flex flex-col justify-center">{children}</div>;
}
