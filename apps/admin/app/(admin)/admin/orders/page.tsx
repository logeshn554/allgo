'use client';

import React, { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api-client';
import { OrdersKpiCards } from '@/components/orders/OrdersKpiCards';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { OrderDetailDrawer } from '@/components/orders/OrderDetailDrawer';
import { CouponsTable } from '@/components/orders/CouponsTable';
import { CreateCouponModal } from '@/components/orders/CreateCouponModal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@allgo/ui';
import { Button } from '@allgo/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { RefreshIcon, PlusSignIcon } from '@hugeicons/core-free-icons';

export default function OrdersManagementPage() {
  const [activeTab, setActiveTab] = useState<'orders' | 'coupons'>('orders');

  const [orders, setOrders] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const [coupons, setCoupons] = useState<any[]>([]);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);
  const [showNewCouponModal, setShowNewCouponModal] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponDesc, setCouponDesc] = useState('');
  const [couponType, setCouponType] = useState<'PERCENTAGE' | 'FLAT'>('PERCENTAGE');
  const [discountVal, setDiscountVal] = useState('20');
  const [minOrder, setMinOrder] = useState('149');
  const [maxDiscount, setMaxDiscount] = useState('100');
  const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);

  const fetchOrders = async () => {
    setIsLoadingOrders(true);
    setOrdersError(null);
    try {
      const data = await adminApi.listAdminOrders(statusFilter);
      setOrders(data);
    } catch (err: any) {
      setOrdersError(err?.message || 'Failed to load orders');
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const fetchCoupons = async () => {
    setIsLoadingCoupons(true);
    try {
      const data = await adminApi.listCoupons();
      setCoupons(data);
    } catch {
    } finally {
      setIsLoadingCoupons(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchCoupons();
  }, [statusFilter]);

  const handleInspectOrder = async (orderId: string) => {
    setIsLoadingDetail(true);
    try {
      const detail = await adminApi.getAdminOrderDetail(orderId);
      setSelectedOrder(detail);
    } catch (err: any) {
      alert(`Failed to load order detail: ${err.message}`);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder || !cancelReason.trim()) return;
    setIsCancelling(true);
    try {
      await adminApi.cancelAdminOrder(selectedOrder.id, cancelReason.trim());
      alert('Order cancelled and refund processed successfully.');
      setShowCancelDialog(false);
      setCancelReason('');
      await handleInspectOrder(selectedOrder.id);
      await fetchOrders();
    } catch (err: any) {
      alert(`Failed to cancel order: ${err.message}`);
    } finally {
      setIsCancelling(false);
    }
  };

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
      alert(`Coupon ${couponCode.toUpperCase()} created successfully!`);
      setShowNewCouponModal(false);
      setCouponCode('');
      setCouponDesc('');
      await fetchCoupons();
    } catch (err: any) {
      alert(`Failed to create coupon: ${err.message}`);
    } finally {
      setIsCreatingCoupon(false);
    }
  };

  const handleToggleCoupon = async (couponId: string, currentStatus: boolean) => {
    try {
      await adminApi.toggleCoupon(couponId, !currentStatus);
      await fetchCoupons();
    } catch (err: any) {
      alert(`Failed to update coupon status: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Multi-Vertical Order Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live governance for Food, Grocery & Retail Orders, Inventory Reservations, Payments & Refunds
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { fetchOrders(); fetchCoupons(); }}
            className="gap-2 cursor-pointer"
          >
            <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} className="size-4" />
            <span>Refresh</span>
          </Button>

          {activeTab === 'coupons' && (
            <Button
              size="sm"
              onClick={() => setShowNewCouponModal(true)}
              className="gap-2 cursor-pointer"
            >
              <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} className="size-4" />
              <span>Create Coupon</span>
            </Button>
          )}
        </div>
      </div>

      <OrdersKpiCards orders={orders} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList variant="line">
          <TabsTrigger value="orders">
            Orders Queue ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="coupons">
            Promotional Coupons ({coupons.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <OrdersTable
            orders={orders}
            isLoadingOrders={isLoadingOrders}
            ordersError={ordersError}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            onInspectOrder={handleInspectOrder}
          />
        </TabsContent>

        <TabsContent value="coupons">
          <CouponsTable
            coupons={coupons}
            isLoadingCoupons={isLoadingCoupons}
            onToggleCoupon={handleToggleCoupon}
          />
        </TabsContent>
      </Tabs>

      <OrderDetailDrawer
        selectedOrder={selectedOrder}
        isLoadingDetail={isLoadingDetail}
        onClose={() => setSelectedOrder(null)}
        showCancelDialog={showCancelDialog}
        setShowCancelDialog={setShowCancelDialog}
        cancelReason={cancelReason}
        setCancelReason={setCancelReason}
        handleCancelOrder={handleCancelOrder}
        isCancelling={isCancelling}
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
