import React from 'react';
import { MerchantApplicationSummary } from '@/lib/api-client';

interface MerchantApprovalActionsProps {
  merchant: MerchantApplicationSummary;
  reviewNotes: string;
  setReviewNotes: (val: string) => void;
  updating: boolean;
  onStatusChange: (status: string) => void;
}

export const MerchantApprovalActions: React.FC<MerchantApprovalActionsProps> = ({
  merchant,
  reviewNotes,
  setReviewNotes,
  updating,
  onStatusChange,
}) => {
  return (
    <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0F172A', marginBottom: '12px' }}>
        ⚡ Platform Approval & Lifecycle Decisions
      </h2>
      <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '16px' }}>
        Approving this merchant activates their store catalog on customer applications and allows them to receive live orders.
      </p>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
          Operational Review Audit Notes (Optional)
        </label>
        <input
          type="text"
          value={reviewNotes}
          onChange={(e) => setReviewNotes(e.target.value)}
          placeholder="e.g. FSSAI verified against online portal; bank account validated via penny-drop"
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid #CBD5E1',
            fontSize: '14px',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={() => onStatusChange('APPROVED')}
          disabled={updating || merchant.status === 'APPROVED'}
          style={{
            padding: '10px 20px',
            backgroundColor: '#00C853',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: updating || merchant.status === 'APPROVED' ? 'not-allowed' : 'pointer',
            opacity: updating || merchant.status === 'APPROVED' ? 0.6 : 1,
          }}
        >
          {updating ? 'Processing...' : '✓ Approve & Activate Merchant'}
        </button>

        <button
          onClick={() => onStatusChange('DOCUMENTS_REQUIRED')}
          disabled={updating}
          style={{
            padding: '10px 16px',
            backgroundColor: '#F59E0B',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: updating ? 'not-allowed' : 'pointer',
          }}
        >
          Request Additional Documents
        </button>

        <button
          onClick={() => onStatusChange('REJECTED')}
          disabled={updating || merchant.status === 'REJECTED'}
          style={{
            padding: '10px 16px',
            backgroundColor: '#EF4444',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: updating || merchant.status === 'REJECTED' ? 'not-allowed' : 'pointer',
          }}
        >
          Reject Application
        </button>

        {merchant.status === 'SUSPENDED' ? (
          <button
            onClick={() => onStatusChange('APPROVED')}
            disabled={updating}
            style={{
              padding: '10px 18px',
              backgroundColor: '#00C853',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: updating ? 'not-allowed' : 'pointer',
            }}
          >
            {updating ? 'Processing...' : '⚡ Reactivate Suspended Merchant'}
          </button>
        ) : (
          <button
            onClick={() => onStatusChange('SUSPENDED')}
            disabled={updating}
            style={{
              padding: '10px 16px',
              backgroundColor: '#64748B',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: updating ? 'not-allowed' : 'pointer',
            }}
          >
            Suspend Merchant
          </button>
        )}
      </div>
    </div>
  );
};
