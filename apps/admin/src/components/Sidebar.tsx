'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
    { label: 'Partner Approvals', href: '/admin/partners', icon: '🛵' },
    { label: 'Merchant Approvals', href: '/admin/merchants', icon: '🏪' },
    { label: 'Catalog Moderation', href: '/admin/catalog', icon: '🍽️' },
    { label: 'Dispatch Operations', href: '/admin/dispatch', icon: '🚚' },
    { label: 'Mobility & Rides', href: '/admin/mobility', icon: '🚗' },
    { label: 'Parcel Courier', href: '/admin/parcels', icon: '📫' },
    { label: 'Users & Roles', href: '/admin/users', icon: '👥' },
    { label: 'Pilot Service Zones', href: '/admin/zones', icon: '📍' },
    { label: 'Multi-Vertical Orders', href: '/admin/orders', icon: '📦' },
    { label: 'Financial Management', href: '/admin/finance', icon: '💰' },
    { label: 'Customer Support', href: '/admin/support', icon: '🎧' },
    { label: 'Ratings & Reviews', href: '/admin/ratings', icon: '⭐' },
  ];

  return (
    <aside
      style={{
        width: '260px',
        backgroundColor: '#1E293B',
        color: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
      }}
    >
      <div style={{ padding: '24px 20px', borderBottom: '1px solid #334155' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              backgroundColor: '#00C853',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '900',
              fontSize: '20px',
              color: '#FFFFFF',
            }}
          >
            A
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>AllGo Admin</h1>
            <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0 }}>Super App Control Console</p>
          </div>
        </div>
      </div>

      <nav style={{ padding: '16px 12px', flex: 1 }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <li key={item.href} style={{ marginBottom: '6px' }}>
                <a
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    color: isActive ? '#FFFFFF' : '#94A3B8',
                    backgroundColor: isActive ? '#0F172A' : 'transparent',
                    textDecoration: 'none',
                    fontWeight: isActive ? '600' : '400',
                    fontSize: '14px',
                    borderLeft: isActive ? '3px solid #00C853' : '3px solid transparent',
                  }}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div style={{ padding: '16px 20px', borderTop: '1px solid #334155', fontSize: '11px', color: '#64748B' }}>
        <p style={{ margin: 0 }}>AllGo Core Platform v1.0.0</p>
        <p style={{ margin: '4px 0 0 0' }}>Phase 1 Local Foundation</p>
      </div>
    </aside>
  );
}

