import React from 'react';

interface DispatchPartnersTableProps {
  onlinePartners: any[];
}

export const DispatchPartnersTable: React.FC<DispatchPartnersTableProps> = ({ onlinePartners }) => {
  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
        <thead>
          <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
            <th style={{ padding: '12px 16px' }}>Partner Name</th>
            <th style={{ padding: '12px 16px' }}>Phone</th>
            <th style={{ padding: '12px 16px' }}>Account Status</th>
            <th style={{ padding: '12px 16px' }}>Session Status</th>
            <th style={{ padding: '12px 16px' }}>GPS Telemetry</th>
            <th style={{ padding: '12px 16px' }}>Last Heartbeat</th>
          </tr>
        </thead>
        <tbody>
          {onlinePartners.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#94A3B8' }}>
                No delivery partners currently active or online.
              </td>
            </tr>
          ) : (
            onlinePartners.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{p.fullName || 'Partner'}</td>
                <td style={{ padding: '12px 16px' }}>{p.phone}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, backgroundColor: '#DCFCE7', color: '#15803D' }}>
                    {p.accountStatus}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: p.sessionStatus === 'BUSY' ? '#FEF3C7' : '#EFF6FF',
                      color: p.sessionStatus === 'BUSY' ? '#92400E' : '#1D4ED8',
                    }}
                  >
                    {p.sessionStatus}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: '#64748B' }}>
                  {p.currentLocation ? (
                    <span>
                      {p.currentLocation.latitude.toFixed(4)}, {p.currentLocation.longitude.toFixed(4)}
                    </span>
                  ) : (
                    <span style={{ color: '#94A3B8' }}>Awaiting lock</span>
                  )}
                </td>
                <td style={{ padding: '12px 16px', color: '#64748B', fontSize: '12px' }}>
                  {p.lastHeartbeatAt ? new Date(p.lastHeartbeatAt).toLocaleTimeString() : 'N/A'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
