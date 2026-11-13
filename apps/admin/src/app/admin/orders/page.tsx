'use client';

import React, { useState, useEffect } from 'react';
import { adminApi } from '../../../lib/api-client';
import { OrdersKpiCards } from '../../../components/orders/OrdersKpiCards';
import { OrdersTable } from '../../../components/orders/OrdersTable';
import { OrderDetailDrawer } from '../../../components/orders/OrderDetailDrawer';
import { CouponsTable } from '../../../components/orders/CouponsTable';
import { CreateCouponModal } from '../../../components/orders/CreateCouponModal';

export default function OrdersManagementPage() {
  const [activeTab, setActiveTab] = useState<'orders' | 'coupons'>('orders');

  // Orders State
  const [orders, setOrders] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  // Selected Order Drawer State
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Coupons State
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
      // ignore
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
    <div style={{ padding: '32px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0F172A', margin: 0 }}>
            📦 Multi-Vertical Order Management
          </h1>
          <p style={{ color: '#64748B', fontSize: '14px', marginTop: '4px' }}>
            Live governance for Food, Grocery & Retail Orders, Inventory Reservations, Payments & Refunds
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => { fetchOrders(); fetchCoupons(); }}
            style={{
              padding: '8px 16px', backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1',
              borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#334155',
            }}
          >
            🔄 Refresh
          </button>

          {activeTab === 'coupons' && (
            <button
              onClick={() => setShowNewCouponModal(true)}
              style={{
                padding: '8px 18px', backgroundColor: '#00C853', color: '#FFFFFF',
                border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600,
              }}
            >
              + Create Coupon
            </button>
          )}
        </div>
      </div>

      <OrdersKpiCards orders={orders} />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E2E8F0', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('orders')}
          style={{
            padding: '12px 20px', backgroundColor: 'transparent', border: 'none',
            borderBottom: activeTab === 'orders' ? '3px solid #00C853' : '3px solid transparent',
            color: activeTab === 'orders' ? '#00C853' : '#64748B',
            fontWeight: activeTab === 'orders' ? 'bold' : 'normal', fontSize: '15px', cursor: 'pointer',
          }}
        >
          📦 Orders Queue ({orders.length})
        </button>

        <button
          onClick={() => setActiveTab('coupons')}
          style={{
            padding: '12px 20px', backgroundColor: 'transparent', border: 'none',
            borderBottom: activeTab === 'coupons' ? '3px solid #00C853' : '3px solid transparent',
            color: activeTab === 'coupons' ? '#00C853' : '#64748B',
            fontWeight: activeTab === 'coupons' ? 'bold' : 'normal', fontSize: '15px', cursor: 'pointer',
          }}
        >
          🏷️ Promotional Coupons ({coupons.length})
        </button>
      </div>

      {activeTab === 'orders' && (
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
      )}

      {activeTab === 'coupons' && (
        <CouponsTable
          coupons={coupons}
          isLoadingCoupons={isLoadingCoupons}
          onToggleCoupon={handleToggleCoupon}
        />
      )}

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
