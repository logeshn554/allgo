'use client';

import React from 'react';

interface ZoneSurgeModalProps {
  selectedZoneForSurge: any | null;
  isSurgeActive: boolean;
  setIsSurgeActive: (a: boolean) => void;
  surgeMultiplier: number;
  setSurgeMultiplier: (m: number) => void;
  surgeReason: string;
  setSurgeReason: (r: string) => void;
  onClose: () => void;
  onSaveSurge: () => Promise<void>;
  isSavingSurge: boolean;
}

export function ZoneSurgeModal({
  selectedZoneForSurge,
  isSurgeActive,
  setIsSurgeActive,
  surgeMultiplier,
  setSurgeMultiplier,
  surgeReason,
  setSurgeReason,
  onClose,
  onSaveSurge,
  isSavingSurge,
}: ZoneSurgeModalProps) {
  if (!selectedZoneForSurge) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          width: '460px',
          maxWidth: '90%',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
        }}
      >
        <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 'bold' }}>
          ⚡ Dynamic Surge Pricing: {selectedZoneForSurge.name}
        </h3>
        <p style={{ color: '#64748B', fontSize: '13px', margin: '0 0 20px' }}>
          Modifying surge multipliers directly updates checkout fees and records an immutable audit log.
        </p>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
            Surge Active Status
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="radio"
                checked={isSurgeActive}
                onChange={() => setIsSurgeActive(true)}
              />
              <span>Active Surge</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="radio"
                checked={!isSurgeActive}
                onChange={() => setIsSurgeActive(false)}
              />
              <span>Standard Pricing (Inactive)</span>
            </label>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
            Surge Multiplier (1.00x – 3.00x)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="range"
              min="1.0"
              max="3.0"
              step="0.1"
              value={surgeMultiplier}
              onChange={(e) => setSurgeMultiplier(parseFloat(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ fontWeight: 'bold', fontSize: '16px', width: '50px', textAlign: 'right' }}>
              {surgeMultiplier.toFixed(1)}x
            </span>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
            Mandatory Operational Reason *
          </label>
          <textarea
            value={surgeReason}
            onChange={(e) => setSurgeReason(e.target.value)}
            placeholder="e.g., Heavy Monsoon Rains, High Dispatch Pressure in Anna Nagar"
            rows={3}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSaveSurge}
            disabled={isSavingSurge}
            style={{
              padding: '8px 18px',
              backgroundColor: '#00C853',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            {isSavingSurge ? 'Saving...' : 'Apply Surge'}
          </button>
        </div>
      </div>
    </div>
  );
}
