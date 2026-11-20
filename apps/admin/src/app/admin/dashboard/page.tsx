'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { adminApi, DashboardSummary } from '@/lib/api-client';

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getDashboardSummary();
      setSummary(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch platform metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 30000);
    return () => clearInterval(interval);
  }, []);

  const totalUsersStr = summary ? summary.totalUsers.toLocaleString() : '...';
  const newUsersStr = summary ? `+${summary.newUsersToday} today` : 'Loading...';
  const couriersStr = summary ? summary.activeCouriersAndDrivers.toLocaleString() : '...';
  const onlinePartnersStr = summary ? `${summary.onlinePartners} currently online` : 'Loading...';
  const outletsStr = summary ? summary.liveMerchantOutlets.toLocaleString() : '...';
  const outletsSubtitle = summary ? `${summary.activeZonesCount} active zones` : 'Loading...';
  const ordersStr = summary ? `${summary.todayOrdersCount.toLocaleString()} Orders` : '...';
  const gmvStr = summary ? `₹${(summary.todayGmvInr / 100000).toFixed(2)} Lakhs GMV` : 'Loading...';

  const isPgUp = summary?.infrastructure?.postgres?.status === 'up';
  const isRedisUp = summary?.infrastructure?.redis?.status === 'up';
  const isApiUp = summary?.infrastructure?.apiGateway?.status === 'up';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0' }}>
            Operations Overview
          </h1>
          <p style={{ color: '#64748B', margin: 0, fontSize: '14px' }}>
            Welcome back, {user?.fullName || 'Operator'}. Platform metrics and infrastructure health.
          </p>
        </div>
        <button
          onClick={fetchSummary}
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            borderRadius: '6px',
            border: 'none',
            fontSize: '13px',
            cursor: 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Refreshing...' : 'Refresh Metrics'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FEF2F2', border: '1px solid #F87171', borderRadius: '8px', marginBottom: '20px', color: '#991B1B', fontSize: '13px' }}>
          <strong>Notice:</strong> Real-time API connection error ({error}). Displaying last known or default state.
        </div>
      )}

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        {_buildMetricCard('Total Users', totalUsersStr, newUsersStr, '👥', '#00C853')}
        {_buildMetricCard('Active Couriers & Drivers', couriersStr, onlinePartnersStr, '🛵', '#FF6D00')}
        {_buildMetricCard('Live Merchant Outlets', outletsStr, outletsSubtitle, '🏬', '#6200EA')}
        {_buildMetricCard('Today Transactions', ordersStr, gmvStr, '📈', '#2563EB')}
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
          Infrastructure Health Status (Real-time Probe)
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '12px', color: '#64748B' }}>PostgreSQL / PostGIS</span>
            <p style={{ margin: '4px 0 0 0', fontWeight: 'bold', color: '#0F172A' }}>
              {summary?.infrastructure?.postgres?.details || 'PostgreSQL 16 + PostGIS 3.4'}
            </p>
            <span style={{ fontSize: '11px', color: isPgUp ? '#16A34A' : '#DC2626' }}>
              ● {isPgUp ? `Connected (${summary?.infrastructure?.postgres?.latencyMs}ms)` : 'Offline / Unreachable'}
            </span>
          </div>

          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Redis Memory Store</span>
            <p style={{ margin: '4px 0 0 0', fontWeight: 'bold', color: '#0F172A' }}>
              {summary?.infrastructure?.redis?.details || 'Redis 7.0 Alpine'}
            </p>
            <span style={{ fontSize: '11px', color: isRedisUp ? '#16A34A' : '#DC2626' }}>
              ● {isRedisUp ? `Connected (${summary?.infrastructure?.redis?.latencyMs}ms)` : 'Offline / Unreachable'}
            </span>
          </div>

          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Core API Gateway</span>
            <p style={{ margin: '4px 0 0 0', fontWeight: 'bold', color: '#0F172A' }}>
              NestJS Microservice ({summary?.infrastructure?.apiGateway?.environment || 'production'})
            </p>
            <span style={{ fontSize: '11px', color: isApiUp ? '#16A34A' : '#DC2626' }}>
              ● {isApiUp ? `Healthy (Uptime: ${summary?.infrastructure?.apiGateway?.uptimeSeconds}s)` : 'Probing...'}
            </span>
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
