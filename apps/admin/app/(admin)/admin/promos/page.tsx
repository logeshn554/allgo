'use client';

import { CouponsTable } from '@/components/orders/CouponsTable';
import { CreateCouponModal } from '@/components/orders/CreateCouponModal';
import { adminApi } from '@/lib/api-client';
import { Button, Card, CardDescription, CardHeader, CardTitle } from '@allgo/ui';
import { PlusSignIcon, RefreshIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type React from 'react';
import { useEffect, useState } from 'react';

export default function AdminPromosPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewCouponModal, setShowNewCouponModal] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponDesc, setCouponDesc] = useState('');
  const [couponType, setCouponType] = useState<'PERCENTAGE' | 'FLAT'>('PERCENTAGE');
  const [discountVal, setDiscountVal] = useState('20');
  const [minOrder, setMinOrder] = useState('149');
  const [maxDiscount, setMaxDiscount] = useState('100');
  const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const data = await adminApi.listCoupons();
      setCoupons(Array.isArray(data) ? data : []);
    } catch {
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setIsCreatingCoupon(true);
    try {
      await adminApi.createCoupon({
        code: couponCode.trim().toUpperCase(),
        description: couponDesc.trim() || undefined,
        discountPercentage: couponType === 'PERCENTAGE' ? Number(discountVal) : undefined,
        flatDiscountInr: couponType === 'FLAT' ? Number(discountVal) : undefined,
        minOrderAmountInr: Number(minOrder) || 0,
        maxDiscountInr: couponType === 'PERCENTAGE' ? Number(maxDiscount) || undefined : undefined,
      });
      setShowNewCouponModal(false);
      setCouponCode('');
      setCouponDesc('');
      await fetchCoupons();
    } catch (err: any) {
      alert(`Failed to create coupon: ${err?.message || 'Error'}`);
    } finally {
      setIsCreatingCoupon(false);
    }
  };

  const handleToggleCoupon = async (couponId: string, currentStatus: boolean) => {
    try {
      await adminApi.toggleCoupon(couponId, !currentStatus);
      await fetchCoupons();
    } catch (err: any) {
      alert(`Failed to update coupon: ${err?.message || 'Error'}`);
    }
  };

  const activeCount = coupons.filter((c) => c.isActive !== false).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Promotions & Campaigns</h1>
          <p className="text-sm text-muted-foreground">
            Manage discount codes, minimum basket thresholds, and active campaign toggles across
            verticals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchCoupons} className="gap-2">
            <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} className="size-4" />
            <span>Refresh</span>
          </Button>
          <Button size="sm" onClick={() => setShowNewCouponModal(true)} className="gap-2">
            <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} className="size-4" />
            <span>Create Campaign</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total Campaigns</CardDescription>
            <CardTitle className="text-2xl">{coupons.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Active Coupons</CardDescription>
            <CardTitle className="text-2xl text-green-600">{activeCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Paused Coupons</CardDescription>
            <CardTitle className="text-2xl">{coupons.length - activeCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <CouponsTable
        coupons={coupons}
        isLoadingCoupons={loading}
        onToggleCoupon={handleToggleCoupon}
      />

      <CreateCouponModal
        showNewCouponModal={showNewCouponModal}
        setShowNewCouponModal={setShowNewCouponModal}
        couponCode={couponCode}
        setCouponCode={setCouponCode}
        couponDesc={couponDesc}
        setCouponDesc={setCouponDesc}
        couponType={couponType}
        setCouponType={setCouponType}
        discountVal={discountVal}
        setDiscountVal={setDiscountVal}
        minOrder={minOrder}
        setMinOrder={setMinOrder}
        maxDiscount={maxDiscount}
        setMaxDiscount={setMaxDiscount}
        isCreatingCoupon={isCreatingCoupon}
        handleCreateCoupon={handleCreateCoupon}
      />
    </div>
  );
}
