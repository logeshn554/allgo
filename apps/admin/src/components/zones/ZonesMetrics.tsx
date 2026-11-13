'use client';

import React from 'react';

interface ZonesMetricsProps {
  totalZones: number;
  activeZones: number;
  surgeActiveCount: number;
}

export function ZonesMetrics({ totalZones, activeZones, surgeActiveCount }: ZonesMetricsProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
      <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
        <div style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>TOTAL REGISTERED ZONES</div>
        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0F172A', marginTop: '6px' }}>{totalZones}</div>
        <div style={{ fontSize: '12px', color: '#10B981', marginTop: '4px' }}>Chennai Pilot Hub</div>
      </div>
      <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
        <div style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>ACTIVE SERVICE ZONES</div>
        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10B981', marginTop: '6px' }}>{activeZones}</div>
        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>100% PostGIS polygon verified</div>
      </div>
      <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
        <div style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>ACTIVE SURGE ZONES</div>
        <div style={{ fontSize: '28px', fontWeight: 'bold', color: surgeActiveCount > 0 ? '#F97316' : '#64748B', marginTop: '6px' }}>
          {surgeActiveCount}
        </div>
        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Dynamic multiplier active</div>
      </div>
      <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
        <div style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>STANDARD BASE FEE</div>
        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0F172A', marginTop: '6px' }}>₹30 - ₹40</div>
        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Free up to 3 km</div>
      </div>
    </div>
  );
}
