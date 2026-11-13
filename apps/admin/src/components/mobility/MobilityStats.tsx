'use client';

import React from 'react';

interface MobilityStatsProps {
  stats: {
    totalRides: number;
    activeRides: number;
    completedRides: number;
    totalParcels: number;
    totalHireDriverBookings: number;
    openSosAlerts: number;
  };
}

export function MobilityStats({ stats }: MobilityStatsProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
      <div style={{ backgroundColor: '#FFFFFF', padding: '18px 20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: '13px', color: '#64748B', fontWeight: '600' }}>ACTIVE RIDES</div>
        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0284C7', marginTop: '6px' }}>{stats.activeRides}</div>
        <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>{stats.totalRides} Total Booked</div>
      </div>

      <div style={{ backgroundColor: '#FFFFFF', padding: '18px 20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: '13px', color: '#64748B', fontWeight: '600' }}>COMPLETED TRIPS</div>
        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#16A34A', marginTop: '6px' }}>{stats.completedRides}</div>
        <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>Fulfilled Mobility Trips</div>
      </div>

      <div style={{ backgroundColor: '#FFFFFF', padding: '18px 20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: '13px', color: '#64748B', fontWeight: '600' }}>CITY PARCELS</div>
        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#9333EA', marginTop: '6px' }}>{stats.totalParcels}</div>
        <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>Dual-OTP Courier Parcels</div>
      </div>

      <div style={{ backgroundColor: '#FFFFFF', padding: '18px 20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: '13px', color: '#64748B', fontWeight: '600' }}>HIRE-DRIVER SESSIONS</div>
        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0D9488', marginTop: '6px' }}>{stats.totalHireDriverBookings}</div>
        <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>Designated Driver Duties</div>
      </div>

      <div style={{
        backgroundColor: stats.openSosAlerts > 0 ? '#FEF2F2' : '#FFFFFF',
        padding: '18px 20px',
        borderRadius: '12px',
        border: stats.openSosAlerts > 0 ? '2px solid #EF4444' : '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        <div style={{ fontSize: '13px', color: stats.openSosAlerts > 0 ? '#DC2626' : '#64748B', fontWeight: '700' }}>
          EMERGENCY SOS ALERTS
        </div>
        <div style={{ fontSize: '28px', fontWeight: 'bold', color: stats.openSosAlerts > 0 ? '#DC2626' : '#10B981', marginTop: '6px' }}>
          {stats.openSosAlerts}
        </div>
        <div style={{ fontSize: '12px', color: stats.openSosAlerts > 0 ? '#B91C1C' : '#94A3B8', marginTop: '4px' }}>
          {stats.openSosAlerts > 0 ? 'URGENT DISPATCH ACTION REQ' : 'All clear - No active SOS'}
        </div>
      </div>
    </div>
  );
}
