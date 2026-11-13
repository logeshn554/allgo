'use client';

import React from 'react';

interface FinanceSettlementsTabProps {
  partnerIdInput: string;
  setPartnerIdInput: (id: string) => void;
  merchantIdInput: string;
  setMerchantIdInput: (id: string) => void;
  settlementResult: any;
  handleGeneratePartnerSettlement: (e: React.FormEvent) => Promise<void>;
  handleGenerateMerchantSettlement: (e: React.FormEvent) => Promise<void>;
  handleApprovePartnerSettlement: (id: string) => Promise<void>;
  handleApproveMerchantSettlement: (id: string) => Promise<void>;
}

export function FinanceSettlementsTab({
  partnerIdInput,
  setPartnerIdInput,
  merchantIdInput,
  setMerchantIdInput,
  settlementResult,
  handleGeneratePartnerSettlement,
  handleGenerateMerchantSettlement,
  handleApprovePartnerSettlement,
  handleApproveMerchantSettlement,
}: FinanceSettlementsTabProps) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold' }}>Generate Partner Settlement</h3>
          <form onSubmit={handleGeneratePartnerSettlement}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748B', marginBottom: '4px' }}>Partner UUID</label>
              <input
                type="text"
                value={partnerIdInput}
                onChange={(e) => setPartnerIdInput(e.target.value)}
                placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #CBD5E1' }}
                required
              />
            </div>
            <button
              type="submit"
              style={{ padding: '8px 16px', backgroundColor: '#00C853', color: '#FFFFFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Generate Partner Statement
            </button>
          </form>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold' }}>Generate Merchant Settlement</h3>
          <form onSubmit={handleGenerateMerchantSettlement}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748B', marginBottom: '4px' }}>Merchant UUID</label>
              <input
                type="text"
                value={merchantIdInput}
                onChange={(e) => setMerchantIdInput(e.target.value)}
                placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #CBD5E1' }}
                required
              />
            </div>
            <button
              type="submit"
              style={{ padding: '8px 16px', backgroundColor: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Generate Merchant Statement
            </button>
          </form>
        </div>
      </div>

      {settlementResult && (
        <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #CBD5E1', marginBottom: '24px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>Newly Generated Settlement Statement</h4>
          <pre style={{ fontSize: '12px', overflowX: 'auto', margin: 0 }}>{JSON.stringify(settlementResult, null, 2)}</pre>
          <div style={{ marginTop: '12px' }}>
            <button
              onClick={() => {
                if (settlementResult.partner_id) {
                  handleApprovePartnerSettlement(settlementResult.id);
                } else {
                  handleApproveMerchantSettlement(settlementResult.id);
                }
              }}
              style={{ padding: '6px 14px', backgroundColor: '#00C853', color: '#FFFFFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Approve Statement & Schedule Payout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
