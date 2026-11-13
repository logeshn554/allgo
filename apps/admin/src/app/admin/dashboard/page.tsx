'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0' }}>
          Operations Overview
        </h1>
        <p style={{ color: '#64748B', margin: 0, fontSize: '14px' }}>
          Welcome back, {user?.fullName || 'Operator'}. Platform metrics and active service zones for Chennai Pilot.
        </p>
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        {_buildMetricCard('Total Users', '1,420', '+18 today', '👥', '#00C853')}
        {_buildMetricCard('Active Couriers & Drivers', '50', '38 currently online', '🛵', '#FF6D00')}
        {_buildMetricCard('Live Merchant Outlets', '42', 'Anna Nagar & Kilpauk', '🏬', '#6200EA')}
        {_buildMetricCard('Today Transactions', '780 Orders', '₹1.85 Lakhs GMV', '📈', '#2563EB')}
      </div>

      {/* Infrastructure Health Status */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #E2E8F0',
          marginBottom: '24px',
        }}
      >
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 16px 0' }}>
          Infrastructure Health Status (Local Development)
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '12px', color: '#64748B' }}>PostgreSQL / PostGIS</span>
            <p style={{ margin: '4px 0 0 0', fontWeight: 'bold', color: '#0F172A' }}>PostgreSQL 16 + PostGIS 3.4</p>
            <span style={{ fontSize: '11px', color: '#16A34A' }}>● Configured for local docker (port 5432)</span>
          </div>

          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Redis Memory Store</span>
            <p style={{ margin: '4px 0 0 0', fontWeight: 'bold', color: '#0F172A' }}>Redis 7.0 Alpine</p>
            <span style={{ fontSize: '11px', color: '#16A34A' }}>● Atomic OTP Lua script loaded (port 6379)</span>
          </div>

          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Core API Gateway</span>
            <p style={{ margin: '4px 0 0 0', fontWeight: 'bold', color: '#0F172A' }}>NestJS REST Microservice</p>
            <span style={{ fontSize: '11px', color: '#16A34A' }}>● Running on port 3000 (/docs enabled)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function _buildMetricCard(title: string, value: string, subtitle: string, icon: string, color: string) {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>{title}</span>
        <span style={{ fontSize: '20px' }}>{icon}</span>
      </div>
      <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#0F172A' }}>{value}</span>
      <span style={{ fontSize: '12px', color: color, marginTop: '4px', fontWeight: '500' }}>{subtitle}</span>
    </div>
  );
}

