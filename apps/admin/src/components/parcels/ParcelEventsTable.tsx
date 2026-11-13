import React from 'react';

interface ParcelEventsTableProps {
  events: any[];
}

export const ParcelEventsTable: React.FC<ParcelEventsTableProps> = ({ events }) => {
  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A', marginBottom: '16px' }}>
        Immutable Delivery Events Log ({events.length})
      </h2>
      {events.length === 0 ? (
        <p style={{ color: '#64748B', fontSize: '14px' }}>No events logged yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              <th style={{ padding: '10px 14px', fontWeight: '700' }}>TIMESTAMP</th>
              <th style={{ padding: '10px 14px', fontWeight: '700' }}>EVENT TYPE</th>
              <th style={{ padding: '10px 14px', fontWeight: '700' }}>ACTOR ROLE</th>
              <th style={{ padding: '10px 14px', fontWeight: '700' }}>FROM → TO</th>
              <th style={{ padding: '10px 14px', fontWeight: '700' }}>REASON & DETAILS</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e, idx) => (
              <tr key={e.id || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ padding: '10px 14px', color: '#64748B', whiteSpace: 'nowrap' }}>
                  {new Date(e.created_at || e.createdAt).toLocaleString()}
                </td>
                <td style={{ padding: '10px 14px', fontWeight: '700', color: '#0F172A' }}>
                  {e.event_type || e.eventType}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '600', backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
                    {e.actor_role || e.actorRole}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', color: '#475569' }}>
                  {e.from_status || e.fromStatus || '—'} → {e.to_status || e.toStatus || '—'}
                </td>
                <td style={{ padding: '10px 14px', color: '#334155' }}>
                  {e.reason || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
