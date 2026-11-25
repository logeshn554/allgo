'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { adminApi } from '@/lib/api-client';
import { ParcelInfoCards } from '@/components/parcels/ParcelInfoCards';
import { ParcelEventsTable } from '@/components/parcels/ParcelEventsTable';
import {
  ReassignModal,
  CancelModal,
  ReturnModal,
} from '@/components/parcels/ParcelModals';

export default function AdminParcelDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [parcel, setParcel] = useState<any | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignPartnerId, setReassignPartnerId] = useState('');
  const [reassignReason, setReassignReason] = useState('');

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Administrative operational override');

  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('RECIPIENT_UNAVAILABLE');
  const [returnNotes, setReturnNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchParcelData = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [parcelData, trackingData] = await Promise.all([
        adminApi.getAdminParcel(id).catch(() => null),
        adminApi.getAdminParcelTracking(id).catch(() => null),
      ]);
      setParcel(parcelData || trackingData?.parcel || trackingData);
      setEvents(trackingData?.events || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load parcel details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchParcelData();
  }, [id]);

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignPartnerId.trim() || !reassignReason.trim()) return;
    setIsSubmitting(true);
    try {
      await adminApi.reassignAdminParcel(id, reassignPartnerId.trim(), reassignReason.trim());
      setShowReassignModal(false);
      setReassignPartnerId('');
      setReassignReason('');
      await fetchParcelData();
    } catch (err: any) {
      alert(`Reassignment failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) return;
    setIsSubmitting(true);
    try {
      await adminApi.cancelAdminParcel(id, cancelReason.trim());
      setShowCancelModal(false);
      await fetchParcelData();
    } catch (err: any) {
      alert(`Cancellation failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAuthorizeReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnReason.trim()) return;
    setIsSubmitting(true);
    try {
      await adminApi.authorizeAdminParcelReturn(id, returnReason.trim(), returnNotes.trim());
      setShowReturnModal(false);
      await fetchParcelData();
    } catch (err: any) {
      alert(`Return authorization failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-10 text-center text-muted-foreground text-sm">
        Loading parcel details...
      </div>
    );
  }

  if (error || !parcel) {
    return (
      <div className="space-y-4">
        <Link href="/admin/parcels" className="text-primary hover:underline font-semibold text-sm inline-flex items-center gap-1.5">
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4 rtl:rotate-180" />
          <span>Back to Parcels</span>
        </Link>
        <div className="mt-4 p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-sm">
          {error || 'Parcel not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <Link href="/admin/parcels" className="text-primary hover:underline font-semibold text-sm inline-flex items-center gap-1.5">
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4 rtl:rotate-180" />
          <span>Back to Parcel Management</span>
        </Link>
      </div>

      <ParcelInfoCards
        parcel={parcel}
        onOpenReassign={() => setShowReassignModal(true)}
        onOpenReturn={() => setShowReturnModal(true)}
        onOpenCancel={() => setShowCancelModal(true)}
      />

      <ParcelEventsTable events={events} />

      <ReassignModal
        show={showReassignModal}
        onClose={() => setShowReassignModal(false)}
        onSubmit={handleReassign}
        partnerId={reassignPartnerId}
        setPartnerId={setReassignPartnerId}
        reason={reassignReason}
        setReason={setReassignReason}
        isSubmitting={isSubmitting}
      />

      <CancelModal
        show={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onSubmit={handleCancel}
        reason={cancelReason}
        setReason={setCancelReason}
        isSubmitting={isSubmitting}
      />

      <ReturnModal
        show={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        onSubmit={handleAuthorizeReturn}
        reason={returnReason}
        setReason={setReturnReason}
        notes={returnNotes}
        setNotes={setReturnNotes}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
