'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, MerchantApplicationSummary } from '@/lib/api-client';
import { StatusBadge } from '@/components/StatusBadge';

export default function MerchantApplicationsPage() {
  const [merchants, setMerchants] = useState<MerchantApplicationSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMerchants() {
      setLoading(true);
      setError(null);
      try {
        const data = await adminApi.listMerchants({
          status: statusFilter || undefined,
          limit: 25,
        });
        setMerchants(data.merchants || []);
        setTotal(data.total || 0);
      } catch (err: any) {
        setError(err.message || 'Failed to load merchant applications');
      } finally {
        setLoading(false);
      }
    }
    loadMerchants();
  }, [statusFilter]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0F172A', margin: '0 0 6px 0' }}>
            Merchant Onboarding Applications
          </h1>
          <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
            Review FSSAI licenses, GSTIN compliance, bank settlement accounts, and approve merchant outlets.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              fontSize: '14px',
              color: '#334155',
            }}
          >
            <option value="">All Statuses ({total})</option>
            <option value="SUBMITTED">Submitted / Verification Pending</option>
            <option value="UNDER_REVIEW">Under Operational Review</option>
            <option value="APPROVED">Approved / Operational</option>
            <option value="DOCUMENTS_REQUIRED">Documents Required</option>
            <option value="REJECTED">Rejected</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '16px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '8px',
            color: '#B91C1C',
            marginBottom: '20px',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              <th style={{ padding: '14px 20px', color: '#475569', fontWeight: '600' }}>Business & Outlet</th>
              <th style={{ padding: '14px 20px', color: '#475569', fontWeight: '600' }}>Category</th>
              <th style={{ padding: '14px 20px', color: '#475569', fontWeight: '600' }}>Compliance</th>
              <th style={{ padding: '14px 20px', color: '#475569', fontWeight: '600' }}>Owner Contact</th>
              <th style={{ padding: '14px 20px', color: '#475569', fontWeight: '600' }}>Status</th>
              <th style={{ padding: '14px 20px', color: '#475569', fontWeight: '600', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                  Loading merchant applications...
                </td>
              </tr>
            ) : merchants.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                  No merchant applications found.
                </td>
              </tr>
            ) : (
              merchants.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: '600', color: '#0F172A' }}>{m.business_name}</div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                      {m.outlet_name || 'No Outlet Defined'} • {m.postal_code || 'N/A'}
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        backgroundColor: '#F1F5F9',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#475569',
                      }}
                    >
                      {m.merchant_type}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontSize: '12px', color: '#334155' }}>
                      PAN: <strong>{m.pan_number || 'N/A'}</strong>
                    </div>
                    {m.fssai_license_number && (
                      <div style={{ fontSize: '11px', color: '#00C853' }}>✓ FSSAI: {m.fssai_license_number}</div>
                    )}
                    {m.gstin && <div style={{ fontSize: '11px', color: '#64748B' }}>GSTIN: {m.gstin}</div>}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ color: '#0F172A', fontWeight: '500' }}>{m.owner_name || 'Merchant Owner'}</div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>{m.owner_phone || 'N/A'}</div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <StatusBadge status={m.status as any} />
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <Link
                      href={`/admin/merchants/${m.id}`}
                      style={{
                        padding: '6px 14px',
                        backgroundColor: '#6200EA',
                        color: '#FFFFFF',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '13px',
                        fontWeight: '500',
                      }}
                    >
                      Review Application
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

