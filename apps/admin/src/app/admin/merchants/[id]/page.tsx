'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { adminApi, MerchantApplicationSummary } from '@/lib/api-client';
import { StatusBadge } from '@/components/StatusBadge';
import { MerchantInfoCards } from '@/components/merchants/MerchantInfoCards';
import { MerchantOutletsList } from '@/components/merchants/MerchantOutletsList';
import { MerchantDocumentsList } from '@/components/merchants/MerchantDocumentsList';
import { MerchantApprovalActions } from '@/components/merchants/MerchantApprovalActions';

export default function MerchantDetailPage() {
  const params = useParams();
  const merchantId = params?.id as string;

  const [merchant, setMerchant] = useState<MerchantApplicationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [outletUpdating, setOutletUpdating] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMerchant = async () => {
    if (!merchantId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getMerchant(merchantId);
      setMerchant(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch merchant dossier');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMerchant();
  }, [merchantId]);

  const handleStatusChange = async (targetStatus: string) => {
    if (!merchant) return;
    setUpdating(true);
    setMessage(null);
    setError(null);

    try {
      const res = await adminApi.updateMerchantStatus(merchant.id, targetStatus, reviewNotes);
      setMerchant(res.merchant);
      setMessage(`Merchant successfully updated to ${targetStatus}. Action recorded in audit logs.`);
      setReviewNotes('');
    } catch (err: any) {
      setError(err.message || 'Failed to update merchant status');
    } finally {
      setUpdating(false);
    }
  };

  const handleOutletStatusChange = async (outletId: string, targetStatus: string) => {
    setOutletUpdating(outletId);
    setMessage(null);
    setError(null);

    try {
      await adminApi.updateMerchantOutletStatus(
        outletId,
        targetStatus,
        reviewNotes || `Admin updated outlet status to ${targetStatus}`
      );
      setMessage(`Outlet status updated to ${targetStatus}.`);
      await fetchMerchant();
    } catch (err: any) {
      setError(err.message || 'Failed to update outlet status');
    } finally {
      setOutletUpdating(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
        Loading merchant compliance dossier...
      </div>
    );
  }

  if (!merchant) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ color: '#0F172A', marginBottom: '8px' }}>Merchant Application Not Found</h2>
        <Link href="/admin/merchants" style={{ color: '#6200EA', fontWeight: '500' }}>
          ← Return to Applications List
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '960px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link
          href="/admin/merchants"
          style={{ color: '#64748B', textDecoration: 'none', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          ← Back to Merchant Applications
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#0F172A', margin: '0 0 6px 0' }}>
            {merchant.business_name}
          </h1>
          <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
            Application ID: <code style={{ backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>{merchant.id}</code>
          </p>
        </div>
        <StatusBadge status={merchant.status as any} />
      </div>

      {message && (
        <div style={{ padding: '14px 18px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', color: '#166534', marginBottom: '20px', fontSize: '14px' }}>
          ✓ {message}
        </div>
      )}

      {error && (
        <div style={{ padding: '14px 18px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#B91C1C', marginBottom: '20px', fontSize: '14px' }}>
          ✕ {error}
        </div>
      )}

      {/* Statutory Compliance Checklist:
          - FSSAI Food License Number
          - Permanent Account Number (PAN)
          - Bank Settlement Account
          Supported Actions:
          - Approve & Activate Merchant
          - Reject Application
          - Request Additional Documents
          - Suspend Merchant
          - Reactivate Suspended Merchant
      */}
      <MerchantInfoCards merchant={merchant} />

      <MerchantOutletsList
        merchant={merchant}
        outletUpdating={outletUpdating}
        onUpdateStatus={handleOutletStatusChange}
      />

      <MerchantDocumentsList merchant={merchant} />

      <MerchantApprovalActions
        merchant={merchant}
        reviewNotes={reviewNotes}
        setReviewNotes={setReviewNotes}
        updating={updating}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
