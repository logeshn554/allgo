import React from 'react';

interface DispatchExceptionsTableProps {
  exceptions: any[];
}

export const DispatchExceptionsTable: React.FC<DispatchExceptionsTableProps> = ({ exceptions }) => {
  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
        <thead>
          <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
            <th style={{ padding: '12px 16px' }}>Exception ID</th>
            <th style={{ padding: '12px 16px' }}>Job #</th>
            <th style={{ padding: '12px 16px' }}>Type</th>
            <th style={{ padding: '12px 16px' }}>Details</th>
            <th style={{ padding: '12px 16px' }}>Partner</th>
            <th style={{ padding: '12px 16px' }}>Status</th>
            <th style={{ padding: '12px 16px' }}>Recorded</th>
          </tr>
        </thead>
        <tbody>
          {exceptions.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#94A3B8' }}>
                No delivery exceptions reported. Operations running cleanly.
              </td>
            </tr>
          ) : (
            exceptions.map((ex) => (
              <tr key={ex.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '11px' }}>{ex.id.substring(0, 8)}...</td>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{ex.job_number}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, backgroundColor: '#FEE2E2', color: '#B91C1C' }}>
                    {ex.exception_type}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', maxWidth: '300px' }}>{ex.details}</td>
                <td style={{ padding: '12px 16px' }}>{ex.partner_name || 'N/A'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, backgroundColor: ex.status === 'OPEN' ? '#FEF3C7' : '#DCFCE7', color: ex.status === 'OPEN' ? '#92400E' : '#15803D' }}>
                    {ex.status}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: '#64748B', fontSize: '12px' }}>
                  {new Date(ex.created_at).toLocaleTimeString()}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
