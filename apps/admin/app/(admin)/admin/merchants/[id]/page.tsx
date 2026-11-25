'use client';

import { MerchantApprovalActions } from '@/components/merchants/MerchantApprovalActions';
import { MerchantDocumentsList } from '@/components/merchants/MerchantDocumentsList';
import { MerchantInfoCards } from '@/components/merchants/MerchantInfoCards';
import { MerchantOutletsList } from '@/components/merchants/MerchantOutletsList';
import { type MerchantApplicationSummary, adminApi } from '@/lib/api-client';
import { StatusBadge } from '@allgo/ui';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

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
      setMessage(
        `Merchant successfully updated to ${targetStatus}. Action recorded in audit logs.`,
      );
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
        reviewNotes || `Admin updated outlet status to ${targetStatus}`,
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
      <div className="p-10 text-center text-muted-foreground text-sm">
        Loading merchant compliance dossier...
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="py-8 text-center space-y-3">
        <h2 className="text-xl font-bold text-foreground">Merchant Application Not Found</h2>
        <Link
          href="/admin/merchants"
          className="text-primary hover:underline font-medium text-sm inline-flex items-center gap-1.5"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4 rtl:rotate-180" />
          <span>Return to Applications List</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <Link
          href="/admin/merchants"
          className="text-muted-foreground hover:text-foreground text-sm inline-flex items-center gap-1.5 transition-colors"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4 rtl:rotate-180" />
          <span>Back to Merchant Applications</span>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1.5">{merchant.business_name}</h1>
          <p className="text-sm text-muted-foreground">
            Application ID:{' '}
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{merchant.id}</code>
          </p>
        </div>
        <StatusBadge status={merchant.status as any} />
      </div>

      {message && (
        <div className="p-4 rounded-lg bg-primary/10 text-primary border border-primary/20 mb-6 text-sm">
          Success: {message}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 mb-6 text-sm">
          Error: {error}
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
