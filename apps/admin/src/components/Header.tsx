'use client';

import React from 'react';
import { useAuth } from '../lib/auth-context.js';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header
      style={{
        height: '64px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase' }}>
          Active Environment:
        </span>
        <span
          style={{
            backgroundColor: '#DCFCE7',
            color: '#15803D',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 'bold',
          }}
        >
          LOCAL DEVELOPMENT
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: '#0F172A' }}>
            {user?.fullName || 'Super Administrator'}
          </p>
          <p style={{ margin: 0, fontSize: '11px', color: '#64748B' }}>
            {user?.phone || '+91 Admin'} • {user?.roles?.join(', ')}
          </p>
        </div>

        <button
          onClick={logout}
          style={{
            padding: '6px 12px',
            border: '1px solid #CBD5E1',
            borderRadius: '6px',
            backgroundColor: '#FFFFFF',
            color: '#475569',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}
