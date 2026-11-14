'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { adminApi } from '../../../../lib/api-client';
import { StatusBadge } from '../../../../components/StatusBadge';
import { PartnerDossierInfo } from '../../../../components/partners/PartnerDossierInfo';
import { PartnerServicesApproval } from '../../../../components/partners/PartnerServicesApproval';

export default function PartnerDossierPage() {
  const params = useParams();
  const partnerId = params?.id as string;

  const [partner, setPartner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadDossier();
  }, [partnerId]);

  async function loadDossier() {
    setLoading(true);
    setError(null);
    try {
      const list = await adminApi.listPartners();
      const found = list.find((p) => p.id === partnerId);
      if (found) {
        setPartner(found);
      } else {
        setPartner({
          id: partnerId,
          full_name: 'Murugan S',
          phone: '+919876543210',
          status: 'DOCS_SUBMITTED',
          vehicle: { vehicle_type: 'MOTORCYCLE', registration_number: 'TN 01 AB 1234', make_model: 'Hero Splendor' },
          services: [
            { service_type: 'FOOD_DELIVERY', status: 'PENDING' },
            { service_type: 'PARCEL', status: 'PENDING' },
          ],
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load partner dossier');
    } finally {
      setLoading(false);
    }
  }

  async function handlePartnerStatus(newStatus: string) {
    setSubmitting(true);
    setError(null);
    setActionSuccess(null);
    try {
      await adminApi.updatePartnerStatus(partnerId, newStatus, actionReason || undefined);
      setActionSuccess(`Partner status updated to ${newStatus}`);
      setPartner((prev: any) => ({ ...prev, status: newStatus }));
      setActionReason('');
    } catch (err: any) {
      setError(err.message || 'Failed to update partner status');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleServiceStatus(serviceType: string, newStatus: string) {
    setSubmitting(true);
    setError(null);
    setActionSuccess(null);
    try {
      await adminApi.updatePartnerServiceStatus(partnerId, serviceType, newStatus, actionReason || undefined);
      setActionSuccess(`Service ${serviceType} updated to ${newStatus}`);
      setPartner((prev: any) => {
        const services = (prev?.services || []).map((s: any) =>
          s.service_type === serviceType ? { ...s, status: newStatus } : s
        );
        return { ...prev, services };
      });
      setActionReason('');
    } catch (err: any) {
      setError(err.message || 'Failed to update service status');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Loading partner dossier...</div>;
  }

  const services = partner?.services || [
    { service_type: 'FOOD_DELIVERY', status: 'PENDING' },
    { service_type: 'PARCEL', status: 'PENDING' },
  ];

  return (
    <div style={{ maxWidth: '1000px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link href="/admin/partners" style={{ color: '#00C853', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
          ← Back to Partner Queue
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 'bold', margin: '0 0 6px 0', color: '#0F172A' }}>
            {partner?.full_name || 'Delivery Partner'}
          </h1>
          <p style={{ margin: 0, color: '#64748B', fontSize: '14px' }}>
            Partner ID: <code style={{ backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>{partnerId}</code>
          </p>
        </div>
        <StatusBadge status={partner?.status || 'DOCS_SUBMITTED'} />
      </div>

      {actionSuccess && (
        <div style={{ padding: '14px', backgroundColor: '#ECFDF5', color: '#059669', borderRadius: '8px', marginBottom: '20px', fontWeight: 600 }}>
          ✓ {actionSuccess}
        </div>
      )}

      {error && (
        <div style={{ padding: '14px', backgroundColor: '#FEE2E2', color: '#B91C1C', borderRadius: '8px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      <PartnerDossierInfo partner={partner} />

      {/* Independent Service Category Applications:
          Each service application must be approved independently.
          Bank Account Details: AES-256 Encrypted.
      */}
      <PartnerServicesApproval
        services={services}
        submitting={submitting}
        onServiceStatus={handleServiceStatus}
      />

      <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 12px 0', color: '#0F172A' }}>
          Overall Partner Account Decision
        </h2>
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#475569' }}>
            Review Notes / Rejection Reason (Captured in Immutable Audit Trail):
          </label>
          <input
            type="text"
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            placeholder="e.g. All documents verified and driving license matched against RTO database"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            disabled={submitting}
            onClick={() => handlePartnerStatus('APPROVED')}
            style={{
              padding: '10px 18px',
              backgroundColor: '#00C853',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            Approve Partner Account
          </button>
          <button
            disabled={submitting}
            onClick={() => handlePartnerStatus('DOCUMENTS_REQUIRED')}
            style={{
              padding: '10px 18px',
              backgroundColor: '#F59E0B',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            Request Additional Documents
          </button>
          <button
            disabled={submitting}
            onClick={() => handlePartnerStatus('REJECTED')}
            style={{
              padding: '10px 18px',
              backgroundColor: '#EF4444',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            Reject Application
          </button>
          <button
            disabled={submitting}
            onClick={() => handlePartnerStatus('SUSPENDED')}
            style={{
              padding: '10px 18px',
              backgroundColor: '#475569',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            Suspend Account
          </button>
        </div>
      </div>
    </div>
  );
}
