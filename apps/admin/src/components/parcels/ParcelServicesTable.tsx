import React from 'react';

interface ParcelServicesTableProps {
  services: any[];
}

export const ParcelServicesTable: React.FC<ParcelServicesTableProps> = ({ services }) => {
  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A', marginBottom: '16px' }}>
        Authoritative Delivery Service Tiers & Multipliers
      </h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
        <thead>
          <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
            <th style={{ padding: '12px 16px', fontWeight: '700' }}>SERVICE TYPE</th>
            <th style={{ padding: '12px 16px', fontWeight: '700' }}>NAME</th>
            <th style={{ padding: '12px 16px', fontWeight: '700' }}>BASE MULTIPLIER</th>
            <th style={{ padding: '12px 16px', fontWeight: '700' }}>EST. DELIVERY</th>
            <th style={{ padding: '12px 16px', fontWeight: '700' }}>MAX DISTANCE (KM)</th>
            <th style={{ padding: '12px 16px', fontWeight: '700' }}>STATUS</th>
          </tr>
        </thead>
        <tbody>
          {services.map((s) => (
            <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
              <td style={{ padding: '12px 16px', fontWeight: '700' }}>{s.service_type}</td>
              <td style={{ padding: '12px 16px' }}>{s.display_name}</td>
              <td style={{ padding: '12px 16px', fontWeight: '700', color: '#7C3AED' }}>
                {Number(s.base_multiplier).toFixed(2)}x
              </td>
              <td style={{ padding: '12px 16px' }}>{s.estimated_delivery_hours} hours</td>
              <td style={{ padding: '12px 16px' }}>{s.max_distance_km} km</td>
              <td style={{ padding: '12px 16px' }}>
                <span
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '700',
                    backgroundColor: s.is_enabled ? '#DCFCE7' : '#FEE2E2',
                    color: s.is_enabled ? '#15803D' : '#B91C1C',
                  }}
                >
                  {s.is_enabled ? 'ENABLED' : 'DISABLED'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
