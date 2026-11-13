import React from 'react';

interface ParcelRestrictionsTableProps {
  restrictions: any[];
}

export const ParcelRestrictionsTable: React.FC<ParcelRestrictionsTableProps> = ({ restrictions }) => {
  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A', marginBottom: '16px' }}>
        Configurable Goods Restrictions & Transport Policy
      </h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
        <thead>
          <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
            <th style={{ padding: '12px 16px', fontWeight: '700' }}>CATEGORY</th>
            <th style={{ padding: '12px 16px', fontWeight: '700' }}>DISPLAY NAME</th>
            <th style={{ padding: '12px 16px', fontWeight: '700' }}>PERMITTED?</th>
            <th style={{ padding: '12px 16px', fontWeight: '700' }}>REQUIRES REVIEW?</th>
            <th style={{ padding: '12px 16px', fontWeight: '700' }}>MAX WEIGHT (KG)</th>
            <th style={{ padding: '12px 16px', fontWeight: '700' }}>MAX VALUE (₹)</th>
          </tr>
        </thead>
        <tbody>
          {restrictions.map((r) => (
            <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
              <td style={{ padding: '12px 16px', fontWeight: '700' }}>{r.category_name}</td>
              <td style={{ padding: '12px 16px' }}>{r.display_name}</td>
              <td style={{ padding: '12px 16px' }}>
                <span
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '700',
                    backgroundColor: r.is_permitted ? '#DCFCE7' : '#FEE2E2',
                    color: r.is_permitted ? '#15803D' : '#B91C1C',
                  }}
                >
                  {r.is_permitted ? 'PERMITTED' : 'PROHIBITED'}
                </span>
              </td>
              <td style={{ padding: '12px 16px' }}>
                {r.requires_review ? (
                  <span style={{ color: '#D97706', fontWeight: '600' }}>⚠️ Mandatory Inspection</span>
                ) : (
                  <span style={{ color: '#64748B' }}>No</span>
                )}
              </td>
              <td style={{ padding: '12px 16px' }}>{r.max_weight_kg} kg</td>
              <td style={{ padding: '12px 16px' }}>₹{r.max_declared_value_inr}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
