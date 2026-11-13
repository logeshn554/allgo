import React from 'react';
import { AuthProvider } from '@/lib/auth-context';

export const metadata = {
  title: 'AllGo Super App Admin Control Console',
  description: 'Operations, user identity, and service zone governance',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          backgroundColor: '#F8FAFC',
          color: '#0F172A',
        }}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

