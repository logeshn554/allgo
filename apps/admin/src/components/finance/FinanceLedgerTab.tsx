'use client';

import React from 'react';

interface FinanceLedgerTabProps {
  ledgerEntries: any[];
}

export function FinanceLedgerTab({ ledgerEntries }: FinanceLedgerTabProps) {
  return (
    <div>
      <div style={{ marginBottom: '16px', color: '#64748B', fontSize: '14px' }}>
        Showing latest immutable double-entry ledger entries from PostgreSQL authoritative source of truth.
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#FFFFFF', borderRadius: '8px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
        <thead>
          <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
            <th style={{ padding: '10px' }}>Entry ID</th>
            <th style={{ padding: '10px' }}>Tx Reference</th>
            <th style={{ padding: '10px' }}>Account Type</th>
            <th style={{ padding: '10px' }}>Direction</th>
            <th style={{ padding: '10px' }}>Amount (INR)</th>
            <th style={{ padding: '10px' }}>Description</th>
            <th style={{ padding: '10px' }}>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {ledgerEntries.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>
                No ledger entries found.
              </td>
            </tr>
          ) : (
            ledgerEntries.map((e) => (
              <tr key={e.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                <td style={{ padding: '10px', fontFamily: 'monospace' }}>{e.id.slice(0, 8)}...</td>
                <td style={{ padding: '10px', fontWeight: '500' }}>{e.transaction_reference}</td>
                <td style={{ padding: '10px', color: '#475569' }}>{e.account_type}</td>
                <td style={{ padding: '10px' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    backgroundColor: e.direction === 'DEBIT' ? '#FEE2E2' : '#DCFCE7',
                    color: e.direction === 'DEBIT' ? '#DC2626' : '#16A34A',
                  }}>
                    {e.direction}
                  </span>
                </td>
                <td style={{ padding: '10px', fontWeight: 'bold' }}>₹{parseFloat(e.amount_inr).toFixed(2)}</td>
                <td style={{ padding: '10px', color: '#64748B' }}>{e.description}</td>
                <td style={{ padding: '10px', color: '#94A3B8', fontSize: '12px' }}>{new Date(e.created_at).toLocaleString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
