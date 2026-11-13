'use client';

import React from 'react';

interface MobilitySosModalProps {
  selectedSos: any | null;
  resolutionNotes: string;
  setResolutionNotes: (n: string) => void;
  onClose: () => void;
  onResolve: (status: 'RESOLVED' | 'FALSE_ALARM') => Promise<void>;
  isResolving: boolean;
}

export function MobilitySosModal({
  selectedSos,
  resolutionNotes,
  setResolutionNotes,
  onClose,
  onResolve,
  isResolving,
}: MobilitySosModalProps) {
  if (!selectedSos) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        padding: '24px',
        borderRadius: '12px',
        maxWidth: '500px',
        width: '90%',
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 'bold', color: '#DC2626' }}>
          🚨 Resolve SOS Emergency Incident
        </h3>
        <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>
          Ride #{selectedSos.ride_number} reported by {selectedSos.reporter_name} ({selectedSos.reporter_phone})
        </p>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>
            Resolution / Dispatcher Notes:
          </label>
          <textarea
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            placeholder="Enter actions taken (police contact, ambulance dispatch, confirmed customer safe)..."
            rows={4}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              fontSize: '13px',
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            disabled={isResolving}
            onClick={onClose}
            style={{ padding: '8px 16px', border: '1px solid #CBD5E1', borderRadius: '6px', backgroundColor: '#FFFFFF', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            disabled={isResolving}
            onClick={() => onResolve('FALSE_ALARM')}
            style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', backgroundColor: '#F59E0B', color: '#FFFFFF', cursor: 'pointer', fontWeight: '600' }}
          >
            Mark False Alarm
          </button>
          <button
            disabled={isResolving}
            onClick={() => onResolve('RESOLVED')}
            style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', backgroundColor: '#16A34A', color: '#FFFFFF', cursor: 'pointer', fontWeight: '600' }}
          >
            Resolve Incident
          </button>
        </div>
      </div>
    </div>
  );
}
