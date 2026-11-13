import React from 'react';

interface ReassignModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  partnerId: string;
  setPartnerId: (val: string) => void;
  reason: string;
  setReason: (val: string) => void;
  isSubmitting: boolean;
}

export const ReassignModal: React.FC<ReassignModalProps> = ({
  show,
  onClose,
  onSubmit,
  partnerId,
  setPartnerId,
  reason,
  setReason,
  isSubmitting,
}) => {
  if (!show) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '440px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', marginTop: 0 }}>Reassign Parcel Partner</h3>
        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Partner ID (UUID):</label>
            <input
              type="text"
              required
              placeholder="e.g. 77777777-7777-7777-7777-000000000003"
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #CBD5E1', borderRadius: '6px' }}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Reason for Reassignment:</label>
            <input
              type="text"
              required
              placeholder="e.g. Courier vehicle puncture / dispatch emergency"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #CBD5E1', borderRadius: '6px' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 14px', border: '1px solid #CBD5E1', borderRadius: '6px', background: '#FFFFFF' }}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} style={{ padding: '8px 14px', backgroundColor: '#3B82F6', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: '600' }}>
              {isSubmitting ? 'Reassigning...' : 'Confirm Reassign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface CancelModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  reason: string;
  setReason: (val: string) => void;
  isSubmitting: boolean;
}

export const CancelModal: React.FC<CancelModalProps> = ({
  show,
  onClose,
  onSubmit,
  reason,
  setReason,
  isSubmitting,
}) => {
  if (!show) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '440px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', marginTop: 0, color: '#EF4444' }}>Cancel Parcel Delivery</h3>
        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Administrative Reason:</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #CBD5E1', borderRadius: '6px' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 14px', border: '1px solid #CBD5E1', borderRadius: '6px', background: '#FFFFFF' }}>
              Back
            </button>
            <button type="submit" disabled={isSubmitting} style={{ padding: '8px 14px', backgroundColor: '#EF4444', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: '600' }}>
              {isSubmitting ? 'Cancelling...' : 'Confirm Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ReturnModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  reason: string;
  setReason: (val: string) => void;
  notes: string;
  setNotes: (val: string) => void;
  isSubmitting: boolean;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({
  show,
  onClose,
  onSubmit,
  reason,
  setReason,
  notes,
  setNotes,
  isSubmitting,
}) => {
  if (!show) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '440px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', marginTop: 0, color: '#8B5CF6' }}>Authorize Return to Sender</h3>
        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Return Reason:</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #CBD5E1', borderRadius: '6px' }}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Notes / Instructions:</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional handling or refund notes..."
              style={{ width: '100%', padding: '8px', border: '1px solid #CBD5E1', borderRadius: '6px', minHeight: '60px' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 14px', border: '1px solid #CBD5E1', borderRadius: '6px', background: '#FFFFFF' }}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} style={{ padding: '8px 14px', backgroundColor: '#8B5CF6', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: '600' }}>
              {isSubmitting ? 'Authorizing...' : 'Authorize Return'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
