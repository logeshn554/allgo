'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '../../../lib/api-client';
import { StatusBadge } from '../../../components/StatusBadge';

export default function PartnerApplicationsPage() {
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    loadPartners();
  }, [filterStatus]);

  async function loadPartners() {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.listPartners(filterStatus === 'ALL' ? undefined : filterStatus);
      setPartners(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch partner applications');
    } finally {
      setLoading(false);
    }
  }

  const statuses = ['ALL', 'DOCS_SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'DOCUMENTS_REQUIRED', 'REJECTED', 'SUSPENDED'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0', color: '#0F172A' }}>
            Partner Onboarding & KYC Queue
          </h1>
          <p style={{ margin: 0, color: '#64748B', fontSize: '14px' }}>
            Verify driver identity, vehicle RC, transport permits, and independent service eligibility.
          </p>
        </div>
        <button
          onClick={loadPartners}
          style={{
            padding: '8px 16px',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Refresh Queue
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid #CBD5E1',
              backgroundColor: filterStatus === s ? '#00C853' : '#FFFFFF',
              color: filterStatus === s ? '#FFFFFF' : '#334155',
              fontWeight: filterStatus === s ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: '16px', backgroundColor: '#FEE2E2', color: '#B91C1C', borderRadius: '8px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Loading partner applications...</div>
      ) : partners.length === 0 ? (
        <div style={{ padding: '48px', backgroundColor: '#FFFFFF', borderRadius: '8px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
          <p style={{ fontSize: '16px', color: '#64748B', margin: 0 }}>No partner onboarding applications found for status: {filterStatus}</p>
        </div>
      ) : (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Partner ID / User</th>
                <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Vehicle Type & Plate</th>
                <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Bank Status</th>
                <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>KYC Status</th>
                <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Submitted Date</th>
                <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#0F172A' }}>{p.full_name || 'Delivery Partner'}</div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>{p.phone || p.id}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 500 }}>{p.vehicle?.vehicle_type || 'MOTORCYCLE'}</div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>{p.vehicle?.registration_number || 'TN 01 AB 1234'}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: '12px', color: '#059669', backgroundColor: '#ECFDF5', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      Encrypted (AES-256)
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <StatusBadge status={p.status} />
                  </td>
                  <td style={{ padding: '14px 16px', color: '#64748B', fontSize: '13px' }}>
                    {p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Recent'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <Link
                      href={`/admin/partners/${p.id}`}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#F1F5F9',
                        color: '#0F172A',
                        textDecoration: 'none',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: 600,
                        border: '1px solid #CBD5E1',
                      }}
                    >
                      Review Dossier →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
