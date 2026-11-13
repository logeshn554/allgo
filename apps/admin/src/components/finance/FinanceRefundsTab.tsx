'use client';

import React from 'react';

interface FinanceRefundsTabProps {
  refundPaymentId: string;
  setRefundPaymentId: (id: string) => void;
  refundAmount: string;
  setRefundAmount: (amt: string) => void;
  refundDestination: 'WALLET' | 'ORIGINAL_METHOD';
  setRefundDestination: (d: 'WALLET' | 'ORIGINAL_METHOD') => void;
  refundReason: string;
  setRefundReason: (r: string) => void;
  handleProcessRefund: (e: React.FormEvent) => Promise<void>;
  payments: any[];
  refunds: any[];
}

export function FinanceRefundsTab({
  refundPaymentId,
  setRefundPaymentId,
  refundAmount,
  setRefundAmount,
  refundDestination,
  setRefundDestination,
  refundReason,
  setRefundReason,
  handleProcessRefund,
  payments,
  refunds,
}: FinanceRefundsTabProps) {
  return (
    <div>
      {/* Issue Refund Form */}
      <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold' }}>Process Customer Refund</h3>
        <form onSubmit={handleProcessRefund} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Payment ID</label>
            <input
              type="text"
              value={refundPaymentId}
              onChange={(e) => setRefundPaymentId(e.target.value)}
              placeholder="UUID or Payment Ref"
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #CBD5E1' }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Refund Amount (INR)</label>
            <input
              type="number"
              step="0.01"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              placeholder="e.g. 150.00"
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #CBD5E1' }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Destination</label>
            <select
              value={refundDestination}
              onChange={(e) => setRefundDestination(e.target.value as any)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #CBD5E1' }}
            >
              <option value="WALLET">Customer Wallet</option>
              <option value="ORIGINAL_METHOD">Original Payment Method</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Reason</label>
            <input
              type="text"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="e.g. Order cancelled by restaurant"
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #CBD5E1' }}
              required
            />
          </div>
          <div>
            <button
              type="submit"
              style={{ padding: '8px 16px', backgroundColor: '#EF4444', color: '#FFFFFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Submit Refund
            </button>
          </div>
        </form>
      </div>

      {/* Payments Table */}
      <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>Recent Payment Transactions</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#FFFFFF', borderRadius: '8px', overflow: 'hidden', border: '1px solid #E2E8F0', marginBottom: '32px' }}>
        <thead>
          <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
            <th style={{ padding: '10px' }}>Payment ID</th>
            <th style={{ padding: '10px' }}>Order Group</th>
            <th style={{ padding: '10px' }}>Method</th>
            <th style={{ padding: '10px' }}>Amount</th>
            <th style={{ padding: '10px' }}>Status</th>
            <th style={{ padding: '10px' }}>Date</th>
          </tr>
        </thead>
        <tbody>
          {payments.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>
                No payment transactions recorded.
              </td>
            </tr>
          ) : (
            payments.map((pm) => (
              <tr key={pm.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                <td style={{ padding: '10px', fontFamily: 'monospace' }}>{pm.id?.slice(0, 8)}...</td>
                <td style={{ padding: '10px', fontFamily: 'monospace' }}>{pm.order_group_id ? `${pm.order_group_id.slice(0, 8)}...` : 'N/A'}</td>
                <td style={{ padding: '10px' }}>{pm.payment_method}</td>
                <td style={{ padding: '10px', fontWeight: 'bold' }}>₹{parseFloat(pm.amount_inr || '0').toFixed(2)}</td>
                <td style={{ padding: '10px' }}>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    backgroundColor: pm.status === 'CAPTURED' ? '#DCFCE7' : pm.status === 'FAILED' ? '#FEE2E2' : '#FEF3C7',
                    color: pm.status === 'CAPTURED' ? '#166534' : pm.status === 'FAILED' ? '#991B1B' : '#92400E',
                  }}>
                    {pm.status}
                  </span>
                </td>
                <td style={{ padding: '10px', color: '#64748B', fontSize: '13px' }}>
                  {pm.created_at ? new Date(pm.created_at).toLocaleDateString() : 'N/A'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Refunds Table */}
      <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>Processed Refunds</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#FFFFFF', borderRadius: '8px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
        <thead>
          <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
            <th style={{ padding: '10px' }}>Refund ID</th>
            <th style={{ padding: '10px' }}>Payment ID</th>
            <th style={{ padding: '10px' }}>Destination</th>
            <th style={{ padding: '10px' }}>Amount</th>
            <th style={{ padding: '10px' }}>Reason</th>
            <th style={{ padding: '10px' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {refunds.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>
                No refund records found.
              </td>
            </tr>
          ) : (
            refunds.map((rf) => (
              <tr key={rf.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                <td style={{ padding: '10px', fontFamily: 'monospace' }}>{rf.id?.slice(0, 8)}...</td>
                <td style={{ padding: '10px', fontFamily: 'monospace' }}>{rf.payment_id?.slice(0, 8)}...</td>
                <td style={{ padding: '10px' }}>{rf.destination}</td>
                <td style={{ padding: '10px', fontWeight: 'bold', color: '#EF4444' }}>₹{parseFloat(rf.amount_inr || '0').toFixed(2)}</td>
                <td style={{ padding: '10px' }}>{rf.reason}</td>
                <td style={{ padding: '10px' }}>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    backgroundColor: rf.status === 'PROCESSED' ? '#DCFCE7' : '#FEF3C7',
                    color: rf.status === 'PROCESSED' ? '#166534' : '#92400E',
                  }}>
                    {rf.status}
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
