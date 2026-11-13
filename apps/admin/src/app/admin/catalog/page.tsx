'use client';

import React, { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api-client';
import { CatalogProductsTable, CatalogProduct } from '@/components/catalog/CatalogProductsTable';
import { CatalogRejectModal } from '@/components/catalog/CatalogRejectModal';

export default function CatalogModerationPage() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [rejectModalProduct, setRejectModalProduct] = useState<CatalogProduct | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [statusFilter]);

  async function loadProducts() {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.listCatalogProducts(statusFilter);
      setProducts(data.items || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load catalog products');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(product: CatalogProduct) {
    setError(null);
    setSuccessMsg(null);
    try {
      await adminApi.moderateProduct(product.id, 'APPROVED');
      setSuccessMsg(`Product "${product.name}" approved successfully!`);
      loadProducts();
    } catch (err: any) {
      setError(err.message || 'Failed to approve product');
    }
  }

  async function handleConfirmReject() {
    if (!rejectModalProduct) return;
    if (!rejectionReason.trim()) {
      setError('A mandatory rejection reason is required for audit compliance.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await adminApi.moderateProduct(rejectModalProduct.id, 'REJECTED', rejectionReason.trim());
      setSuccessMsg(`Product "${rejectModalProduct.name}" rejected.`);
      setRejectModalProduct(null);
      setRejectionReason('');
      loadProducts();
    } catch (err: any) {
      setError(err.message || 'Failed to reject product');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0F172A', margin: '0 0 6px 0' }}>
            Catalog & Food Menu Moderation
          </h1>
          <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
            Inspect restaurant dishes and grocery products submitted by merchants, verify pricing, dietary tags, and enforce safety standards.
          </p>
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              fontSize: '14px',
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Items ({total})</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="APPROVED">Approved & Live</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {error && (
        <div style={{ padding: '14px 18px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#B91C1C', marginBottom: '20px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {successMsg && (
        <div style={{ padding: '14px 18px', backgroundColor: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '8px', color: '#15803D', marginBottom: '20px', fontSize: '14px' }}>
          {successMsg}
        </div>
      )}

      <CatalogProductsTable
        products={products}
        loading={loading}
        onApprove={handleApprove}
        onOpenReject={(p) => {
          setRejectModalProduct(p);
          setRejectionReason('');
        }}
      />

      <CatalogRejectModal
        product={rejectModalProduct}
        rejectionReason={rejectionReason}
        setRejectionReason={setRejectionReason}
        isSubmitting={isSubmitting}
        onClose={() => setRejectModalProduct(null)}
        onConfirm={handleConfirmReject}
      />
    </div>
  );
}
