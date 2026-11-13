'use client';

import React from 'react';

interface FinancePayoutsTabProps {
  payouts: any[];
  handleProcessPayout: (id: string) => Promise<void>;
}

export function FinancePayoutsTab({ payouts, handleProcessPayout }: FinancePayoutsTabProps) {
  return (
    <div>
      <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>RazorpayX Payouts Console</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#FFFFFF', borderRadius: '8px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
        <thead>
          <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
            <th style={{ padding: '10px' }}>Payout ID</th>
            <th style={{ padding: '10px' }}>Recipient Type</th>
            <th style={{ padding: '10px' }}>Channel</th>
            <th style={{ padding: '10px' }}>Net Amount</th>
            <th style={{ padding: '10px' }}>Destination</th>
            <th style={{ padding: '10px' }}>Status</th>
            <th style={{ padding: '10px' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {payouts.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>
                No payout records found.
              </td>
            </tr>
          ) : (
            payouts.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                <td style={{ padding: '10px', fontFamily: 'monospace' }}>{p.id.slice(0, 8)}...</td>
                <td style={{ padding: '10px', fontWeight: 'bold' }}>{p.recipient_type}</td>
                <td style={{ padding: '10px' }}>{p.payout_channel}</td>
                <td style={{ padding: '10px', fontWeight: 'bold' }}>₹{parseFloat(p.net_amount_inr).toFixed(2)}</td>
                <td style={{ padding: '10px' }}>{p.destination_reference || 'UPI Verified'}</td>
                <td style={{ padding: '10px' }}>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    backgroundColor: p.status === 'SUCCESS' ? '#DCFCE7' : p.status === 'FAILED' ? '#FEE2E2' : '#FEF3C7',
                    color: p.status === 'SUCCESS' ? '#166534' : p.status === 'FAILED' ? '#991B1B' : '#92400E',
                  }}>
                    {p.status}
                  </span>
                </td>
                <td style={{ padding: '10px' }}>
                  {p.status === 'SCHEDULED' && (
                    <button
                      onClick={() => handleProcessPayout(p.id)}
                      style={{ padding: '4px 10px', backgroundColor: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Execute Payout
                    </button>
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
