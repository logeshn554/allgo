'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { adminApi } from '@/lib/api-client';
import { StatusBadge } from '@allgo/ui';
import { PartnerDossierInfo } from '@/components/partners/PartnerDossierInfo';
import { PartnerServicesApproval } from '@/components/partners/PartnerServicesApproval';
import { Button } from '@allgo/ui';
import { Input } from '@allgo/ui';
import { Label } from '@allgo/ui';
import { Card, CardHeader, CardTitle, CardContent } from '@allgo/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';

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
    return <div className="p-10 text-center text-muted-foreground text-sm">Loading partner dossier...</div>;
  }

  const services = partner?.services || [
    { service_type: 'FOOD_DELIVERY', status: 'PENDING' },
    { service_type: 'PARCEL', status: 'PENDING' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <Link href="/admin/partners" className="text-primary hover:underline text-sm font-semibold inline-flex items-center gap-1.5">
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4 rtl:rotate-180" />
          <span>Back to Partner Queue</span>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1.5">
            {partner?.full_name || 'Delivery Partner'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Partner ID: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{partnerId}</code>
          </p>
        </div>
        <StatusBadge status={partner?.status || 'DOCS_SUBMITTED'} />
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-lg bg-primary/10 text-primary border border-primary/20 text-sm font-semibold">
          Success: {actionSuccess}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-sm">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Overall Partner Account Decision</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="review-notes" className="text-xs font-semibold text-muted-foreground">
              Review Notes / Rejection Reason (Captured in Immutable Audit Trail):
            </Label>
            <Input
              id="review-notes"
              type="text"
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="e.g. All documents verified and driving license matched against RTO database"
            />
          </div>

          <div className="flex gap-2.5 flex-wrap pt-2">
            <Button
              disabled={submitting}
              onClick={() => handlePartnerStatus('APPROVED')}
            >
              Approve Partner Account
            </Button>
            <Button
              variant="secondary"
              disabled={submitting}
              onClick={() => handlePartnerStatus('DOCUMENTS_REQUIRED')}
            >
              Request Additional Documents
            </Button>
            <Button
              variant="destructive"
              disabled={submitting}
              onClick={() => handlePartnerStatus('REJECTED')}
            >
              Reject Application
            </Button>
            <Button
              variant="outline"
              disabled={submitting}
              onClick={() => handlePartnerStatus('SUSPENDED')}
            >
              Suspend Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
