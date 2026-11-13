'use client';

import React from 'react';

interface MobilitySosTabProps {
  sosEvents: any[];
  onSelectSos: (sos: any) => void;
}

export function MobilitySosTab({ sosEvents, onSelectSos }: MobilitySosTabProps) {
  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
        <thead>
          <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
            <th style={{ padding: '12px 16px' }}>TRIGGERED</th>
            <th style={{ padding: '12px 16px' }}>RIDE #</th>
            <th style={{ padding: '12px 16px' }}>REPORTER</th>
            <th style={{ padding: '12px 16px' }}>GPS COORDINATES</th>
            <th style={{ padding: '12px 16px' }}>ALERT REASON</th>
            <th style={{ padding: '12px 16px' }}>STATUS</th>
            <th style={{ padding: '12px 16px' }}>ACTION</th>
          </tr>
        </thead>
        <tbody>
          {sosEvents.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#94A3B8' }}>
                No SOS emergency events recorded.
              </td>
            </tr>
          ) : (
            sosEvents.map((ev) => (
              <tr key={ev.id} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: ev.status === 'TRIGGERED' ? '#FFF5F5' : 'transparent' }}>
                <td style={{ padding: '12px 16px', fontWeight: 'bold', color: ev.status === 'TRIGGERED' ? '#DC2626' : '#64748B' }}>
                  {new Date(ev.created_at).toLocaleString()}
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>#{ev.ride_number}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontWeight: '600' }}>{ev.reporter_name}</div>
                  <div style={{ color: '#64748B', fontSize: '11px' }}>{ev.reporter_phone}</div>
                </td>
                <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>
                  {ev.latitude?.toFixed(5)}, {ev.longitude?.toFixed(5)}
                </td>
                <td style={{ padding: '12px 16px', maxWidth: '260px' }}>
                  {ev.reason || 'Customer panic SOS button pressed'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '4px 8px',
                    backgroundColor: ev.status === 'TRIGGERED' ? '#FEE2E2' : '#DCFCE7',
                    color: ev.status === 'TRIGGERED' ? '#DC2626' : '#15803D',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    fontSize: '11px',
                  }}>
                    {ev.status}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {ev.status === 'TRIGGERED' ? (
                    <button
                      onClick={() => onSelectSos(ev)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#DC2626',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                      }}
                    >
                      Resolve Alert
                    </button>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#64748B' }}>Resolved: {ev.resolution_notes}</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
