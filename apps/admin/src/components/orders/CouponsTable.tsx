'use client';

import React from 'react';

interface CouponsTableProps {
  coupons: any[];
  isLoadingCoupons: boolean;
  onToggleCoupon: (couponId: string, currentStatus: boolean) => void;
}

export function CouponsTable({ coupons, isLoadingCoupons, onToggleCoupon }: CouponsTableProps) {
  if (isLoadingCoupons) {
    return <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>Loading coupons...</div>;
  }

  if (coupons.length === 0) {
    return (
      <div
        style={{
          backgroundColor: '#FFFFFF',
          padding: '48px',
          textAlign: 'center',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
        }}
      >
        <p style={{ fontSize: '18px', color: '#64748B', margin: 0 }}>No active coupons found.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
        <thead>
          <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
            <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Coupon Code</th>
            <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Description</th>
            <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Discount</th>
            <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Rules (Min / Cap)</th>
            <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Status</th>
            <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Toggle</th>
          </tr>
        </thead>
        <tbody>
          {coupons.map((c) => (
            <tr key={c.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
              <td style={{ padding: '14px 16px', fontWeight: 'bold', color: '#00C853', fontSize: '15px' }}>
                {c.code}
              </td>
              <td style={{ padding: '14px 16px', color: '#475569' }}>{c.description || '—'}</td>
              <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                {c.discount_percentage ? `${c.discount_percentage}% OFF` : `₹${c.flat_discount_inr} FLAT`}
              </td>
              <td style={{ padding: '14px 16px', color: '#64748B', fontSize: '13px' }}>
                Min Order: ₹{Number(c.min_order_amount_inr || 0).toFixed(0)}
                {c.max_discount_inr ? ` • Max Cap: ₹${Number(c.max_discount_inr).toFixed(0)}` : ''}
              </td>
              <td style={{ padding: '14px 16px' }}>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    backgroundColor: c.is_active ? '#DCFCE7' : '#F1F5F9',
                    color: c.is_active ? '#15803D' : '#64748B',
                  }}
                >
                  {c.is_active ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </td>
              <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                <button
                  onClick={() => onToggleCoupon(c.id, c.is_active)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: c.is_active ? '#FEE2E2' : '#DCFCE7',
                    color: c.is_active ? '#B91C1C' : '#15803D',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '13px',
                  }}
                >
                  {c.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
