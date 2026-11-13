import React from 'react';
import { CatalogProduct } from './CatalogProductsTable';

interface CatalogRejectModalProps {
  product: CatalogProduct | null;
  rejectionReason: string;
  setRejectionReason: (val: string) => void;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const CatalogRejectModal: React.FC<CatalogRejectModalProps> = ({
  product,
  rejectionReason,
  setRejectionReason,
  isSubmitting,
  onClose,
  onConfirm,
}) => {
  if (!product) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '480px',
          width: '90%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0F172A', margin: '0 0 10px 0' }}>
          Reject Catalog Product
        </h3>
        <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 16px 0' }}>
          Specify the exact audit reason for rejecting <strong>{product.name}</strong>. The merchant will receive this reason to rectify the item.
        </p>
        <textarea
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="e.g. Non-compliant food safety claim / Unreasonable pricing / Duplicate SKU"
          rows={4}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid #CBD5E1',
            fontSize: '13px',
            color: '#0F172A',
            marginBottom: '16px',
            boxSizing: 'border-box',
            resize: 'vertical',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '8px 16px',
              backgroundColor: '#F1F5F9',
              color: '#475569',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            style={{
              padding: '8px 16px',
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
          </button>
        </div>
      </div>
    </div>
  );
};
