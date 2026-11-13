'use client';

import React from 'react';

interface FinanceOverviewTabProps {
  dashboard: any;
}

export function FinanceOverviewTab({ dashboard }: FinanceOverviewTabProps) {
  if (!dashboard) return null;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 'bold' }}>GROSS TRANSACTION VOLUME</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0F172A', marginTop: '6px' }}>₹{dashboard.grossTransactionVolumeInr?.toFixed(2) || '0.00'}</div>
          <div style={{ fontSize: '12px', color: '#00C853', marginTop: '4px' }}>{dashboard.completedTransactionsCount || 0} completed payments</div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 'bold' }}>PLATFORM COMMISSION</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00C853', marginTop: '6px' }}>₹{dashboard.platformCommissionInr?.toFixed(2) || '0.00'}</div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Net fee revenue retained</div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 'bold' }}>REFUND TOTALS</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#EF4444', marginTop: '6px' }}>₹{dashboard.refundTotalsInr?.toFixed(2) || '0.00'}</div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>{dashboard.refundCount || 0} processed refunds</div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 'bold' }}>PARTNER EARNINGS</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563EB', marginTop: '6px' }}>₹{dashboard.partnerEarningsInr?.toFixed(2) || '0.00'}</div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Gross fleet disbursements</div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 'bold' }}>OUTSTANDING COD</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#D97706', marginTop: '6px' }}>₹{dashboard.outstandingCodInr?.toFixed(2) || '0.00'}</div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Cash in hand awaiting handover</div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 'bold' }}>PENDING SETTLEMENTS</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#7C3AED', marginTop: '6px' }}>₹{dashboard.pendingSettlementsInr?.toFixed(2) || '0.00'}</div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Approved pending payout</div>
        </div>
      </div>
    </div>
  );
}
