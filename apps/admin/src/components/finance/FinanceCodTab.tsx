'use client';

import React from 'react';

interface FinanceCodTabProps {
  pendingCod: any[];
  handleReconcileCod: (id: string, adjustment?: number) => Promise<void>;
}

export function FinanceCodTab({ pendingCod, handleReconcileCod }: FinanceCodTabProps) {
  return (
    <div>
      <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Pending COD Cash Handover Reconciliations</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#FFFFFF', borderRadius: '8px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
        <thead>
          <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
            <th style={{ padding: '10px' }}>Reconciliation ID</th>
            <th style={{ padding: '10px' }}>Partner Phone</th>
            <th style={{ padding: '10px' }}>Expected (INR)</th>
            <th style={{ padding: '10px' }}>Deposited (INR)</th>
            <th style={{ padding: '10px' }}>Discrepancy</th>
            <th style={{ padding: '10px' }}>Status</th>
            <th style={{ padding: '10px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pendingCod.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>
                No pending COD reconciliation records.
              </td>
            </tr>
          ) : (
            pendingCod.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                <td style={{ padding: '10px', fontFamily: 'monospace' }}>{item.id.slice(0, 8)}...</td>
                <td style={{ padding: '10px' }}>{item.partner_phone || item.partner_id.slice(0, 8)}</td>
                <td style={{ padding: '10px', fontWeight: 'bold' }}>₹{parseFloat(item.amount_expected_inr).toFixed(2)}</td>
                <td style={{ padding: '10px' }}>₹{parseFloat(item.amount_deposited_inr).toFixed(2)}</td>
                <td style={{ padding: '10px', color: parseFloat(item.discrepancy_inr) !== 0 ? '#DC2626' : '#16A34A', fontWeight: 'bold' }}>
                  ₹{parseFloat(item.discrepancy_inr).toFixed(2)}
                </td>
                <td style={{ padding: '10px' }}>
                  <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#FEF3C7', color: '#92400E' }}>
                    {item.status}
                  </span>
                </td>
                <td style={{ padding: '10px' }}>
                  <button
                    onClick={() => handleReconcileCod(item.id, parseFloat(item.discrepancy_inr))}
                    style={{ padding: '4px 10px', backgroundColor: '#00C853', color: '#FFFFFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Reconcile & Clear
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
