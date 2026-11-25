'use client';

import React, { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api-client';
import { CatalogProductsTable, CatalogProduct } from '@/components/catalog/CatalogProductsTable';
import { CatalogRejectModal } from '@/components/catalog/CatalogRejectModal';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from '@allgo/ui';

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1.5">
            Catalog & Food Menu Moderation
          </h1>
          <p className="text-sm text-muted-foreground">
            Inspect restaurant dishes and grocery products submitted by merchants, verify pricing, dietary tags, and enforce safety standards.
          </p>
        </div>
        <div>
          <Select
            value={statusFilter}
            items={{
              ALL: `All Items (${total})`,
              PENDING_REVIEW: 'Pending Review',
              APPROVED: 'Approved & Live',
              REJECTED: 'Rejected',
            }}
            onValueChange={(val) => setStatusFilter(val ?? 'ALL')}
          >
            <SelectTrigger className="w-50">
              <SelectValue placeholder="All Items" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="ALL">All Items ({total})</SelectItem>
                <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
                <SelectItem value="APPROVED">Approved & Live</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-sm mb-5">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-lg bg-primary/10 text-primary border border-primary/20 text-sm mb-5">
          {successMsg}
        </div>
      )}

      <CatalogProductsTable
        products={products}
        loading={loading}
        onApprove={handleApprove}
        onOpenReject={(p: any) => {
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
