'use client';

import React from 'react';

interface MobilityParcelsTabProps {
  parcels: any[];
}

export function MobilityParcelsTab({ parcels }: MobilityParcelsTabProps) {
  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
        <thead>
          <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
            <th style={{ padding: '12px 16px' }}>PARCEL #</th>
            <th style={{ padding: '12px 16px' }}>CATEGORY</th>
            <th style={{ padding: '12px 16px' }}>WEIGHT</th>
            <th style={{ padding: '12px 16px' }}>SENDER</th>
            <th style={{ padding: '12px 16px' }}>RECIPIENT</th>
            <th style={{ padding: '12px 16px' }}>COURIER</th>
            <th style={{ padding: '12px 16px' }}>AMOUNT</th>
            <th style={{ padding: '12px 16px' }}>STATUS</th>
          </tr>
        </thead>
        <tbody>
          {parcels.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#94A3B8' }}>
                No parcels recorded yet.
              </td>
            </tr>
          ) : (
            parcels.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>#{p.parcel_number}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '4px 8px',
                    backgroundColor: '#F3E8FF',
                    color: '#7E22CE',
                    borderRadius: '6px',
                    fontWeight: '600',
                    fontSize: '11px',
                  }}>
                    {p.package_category}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>{Number(p.estimated_weight_kg || 1).toFixed(1)} kg</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontWeight: '600' }}>{p.sender_name || 'Sender'}</div>
                  <div style={{ color: '#64748B', fontSize: '11px' }}>{p.sender_phone}</div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontWeight: '600' }}>{p.recipient_name}</div>
                  <div style={{ color: '#64748B', fontSize: '11px' }}>{p.recipient_phone}</div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {p.courier_name ? (
                    <div>{p.courier_name}</div>
                  ) : (
                    <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Unassigned</span>
                  )}
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>
                  ₹{Number(p.total_amount_inr || 0).toFixed(2)}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '4px 8px',
                    backgroundColor: p.status === 'DELIVERED' ? '#DCFCE7' : '#F1F5F9',
                    color: p.status === 'DELIVERED' ? '#15803D' : '#475569',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    fontSize: '11px',
                  }}>
                    {p.status}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
