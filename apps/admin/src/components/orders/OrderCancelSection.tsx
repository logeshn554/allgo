'use client';
import React from 'react';

export interface OrderCancelSectionProps {
  status: string;
  showCancelDialog: boolean;
  setShowCancelDialog: (s: boolean) => void;
  cancelReason: string;
  setCancelReason: (r: string) => void;
  handleCancelOrder: () => Promise<void>;
  isCancelling: boolean;
}

export function OrderCancelSection({
  status,
  showCancelDialog,
  setShowCancelDialog,
  cancelReason,
  setCancelReason,
  handleCancelOrder,
  isCancelling,
}: OrderCancelSectionProps) {
  if (status === 'DELIVERED' || status === 'CANCELLED') return null;

  return (
    <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '20px', marginTop: '20px' }}>
      {!showCancelDialog ? (
        <button
          onClick={() => setShowCancelDialog(true)}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#FEE2E2',
            color: '#B91C1C',
            border: '1px solid #FCA5A5',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          ⚠️ Emergency Cancel & Refund Order
        </button>
      ) : (
        <div style={{ backgroundColor: '#FEF2F2', padding: '16px', borderRadius: '8px' }}>
          <p style={{ color: '#991B1B', fontWeight: 600, fontSize: '13px', margin: 0, marginBottom: '8px' }}>
            Reason for Admin Cancellation (Required for audit log):
          </p>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="e.g. Customer dispute, restaurant outage, accidental order..."
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid #FCA5A5',
              fontSize: '13px',
              marginBottom: '10px',
            }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleCancelOrder}
              disabled={isCancelling || !cancelReason.trim()}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: '#DC2626',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isCancelling ? 'Processing...' : 'Confirm Cancellation'}
            </button>
            <button
              onClick={() => setShowCancelDialog(false)}
              style={{
                padding: '8px 14px',
                backgroundColor: '#F1F5F9',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Abort
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
