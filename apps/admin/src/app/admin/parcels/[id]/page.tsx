'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { adminApi } from '../../../../lib/api-client';
import { ParcelInfoCards } from '../../../../components/parcels/ParcelInfoCards';
import { ParcelEventsTable } from '../../../../components/parcels/ParcelEventsTable';
import {
  ReassignModal,
  CancelModal,
  ReturnModal,
} from '../../../../components/parcels/ParcelModals';

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
  const [returnReason, setReturnReason] = useState('Recipient address unreachable or package refused');
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
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748B', fontFamily: 'sans-serif' }}>
        Loading parcel details...
      </div>
    );
  }

  if (error || !parcel) {
    return (
      <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
        <Link href="/admin/parcels" style={{ color: '#7C3AED', textDecoration: 'none', fontWeight: '600' }}>
          ← Back to Parcels
        </Link>
        <div style={{ marginTop: '20px', color: '#EF4444', backgroundColor: '#FEF2F2', padding: '16px', borderRadius: '8px' }}>
          {error || 'Parcel not found'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link href="/admin/parcels" style={{ color: '#7C3AED', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
          ← Back to Parcel Management
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
