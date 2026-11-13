'use client';

import React from 'react';

interface ServiceabilitySimulatorProps {
  showSimulator: boolean;
  simLat: string;
  setSimLat: (l: string) => void;
  simLng: string;
  setSimLng: (l: string) => void;
  simVertical: string;
  setSimVertical: (v: string) => void;
  simResult: any | null;
  isSimulating: boolean;
  handleRunSimulator: () => Promise<void>;
}

export function ServiceabilitySimulator({
  showSimulator,
  simLat,
  setSimLat,
  simLng,
  setSimLng,
  simVertical,
  setSimVertical,
  simResult,
  isSimulating,
  handleRunSimulator,
}: ServiceabilitySimulatorProps) {
  if (!showSimulator) return null;

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        padding: '24px',
        borderRadius: '12px',
        border: '2px solid #00C853',
        marginBottom: '24px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>📍 Customer Location Serviceability Simulator</h3>
        <span style={{ fontSize: '12px', color: '#64748B' }}>Runs live PostGIS ST_Contains point-in-polygon resolution</span>
      </div>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
            Latitude
          </label>
          <input
            type="text"
            value={simLat}
            onChange={(e) => setSimLat(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', width: '130px' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
            Longitude
          </label>
          <input
            type="text"
            value={simLng}
            onChange={(e) => setSimLng(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', width: '130px' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
            Vertical
          </label>
          <select
            value={simVertical}
            onChange={(e) => setSimVertical(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
          >
            <option value="FOOD">FOOD</option>
            <option value="GROCERY">GROCERY</option>
            <option value="PARCEL">PARCEL</option>
            <option value="RIDE">RIDE</option>
            <option value="HOME_MADE">HOME_MADE</option>
          </select>
        </div>
        <button
          onClick={handleRunSimulator}
          disabled={isSimulating}
          style={{
            padding: '9px 18px',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            borderRadius: '6px',
            border: 'none',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          {isSimulating ? 'Checking...' : 'Check Location'}
        </button>
      </div>

      {simResult && (
        <div
          style={{
            marginTop: '16px',
            padding: '16px',
            borderRadius: '8px',
            backgroundColor: simResult.isServiceable ? '#F0FDF4' : '#FEF2F2',
            border: `1px solid ${simResult.isServiceable ? '#BBF7D0' : '#FECACA'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
            <span style={{ fontSize: '18px' }}>{simResult.isServiceable ? '✅' : '❌'}</span>
            <span style={{ color: simResult.isServiceable ? '#166534' : '#991B1B' }}>
              {simResult.isServiceable ? 'Location is Serviceable' : 'Location Not Serviceable'}
            </span>
            {simResult.zone && (
              <span style={{ color: '#334155', fontWeight: 'normal' }}>
                — Zone: <strong>{simResult.zone.name}</strong> ({simResult.zone.code})
              </span>
            )}
          </div>
          {simResult.reason && <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#7F1D1D' }}>{simResult.reason}</p>}
          {simResult.serviceSettings && (
            <div style={{ display: 'flex', gap: '20px', marginTop: '10px', fontSize: '13px', color: '#1E293B' }}>
              <div>
                Base Delivery Fee: <strong>₹{simResult.serviceSettings.baseDeliveryFeeInr}</strong>
              </div>
              <div>
                Free Distance: <strong>{simResult.serviceSettings.freeDeliveryDistanceKm} km</strong>
              </div>
              <div>
                Surge: <strong>{simResult.serviceSettings.surgeMultiplier}x</strong>{' '}
                {simResult.serviceSettings.isSurgeActive && <span style={{ color: '#EA580C' }}>(Active)</span>}
              </div>
              <div>
                Eligible Outlets: <strong>{simResult.eligibleOutletsCount}</strong>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
