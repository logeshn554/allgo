'use client';
import React from 'react';
import { OrderCancelSection } from './OrderCancelSection';
interface OrderDetailDrawerProps {
  selectedOrder: any | null;
  isLoadingDetail: boolean;
  onClose: () => void;
  showCancelDialog: boolean;
  setShowCancelDialog: (s: boolean) => void;
  cancelReason: string;
  setCancelReason: (r: string) => void;
  handleCancelOrder: () => Promise<void>;
  isCancelling: boolean;
}
export function OrderDetailDrawer({
  selectedOrder,
  isLoadingDetail,
  onClose,
  showCancelDialog,
  setShowCancelDialog,
  cancelReason,
  setCancelReason,
  handleCancelOrder,
  isCancelling,
}: OrderDetailDrawerProps) {
  if (isLoadingDetail) {
    return (
      <div style={{ position: 'fixed', top: 20, right: 20, padding: '10px 16px', backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', zIndex: 1100, fontSize: '13px', fontWeight: 600 }}>
        Loading Order Details...
      </div>
    );
  }
  if (!selectedOrder) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'flex-end',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          width: '560px',
          backgroundColor: '#FFFFFF',
          height: '100%',
          overflowY: 'auto',
          padding: '28px',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
              Order #{selectedOrder.subOrderNumber}
            </h2>
            <p style={{ color: '#64748B', fontSize: '13px', margin: 0 }}>
              Group: {selectedOrder.orderGroupId || selectedOrder.subOrderNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#64748B',
            }}
          >
            ✕
          </button>
        </div>
        {/* Status & PIN Banner */}
        <div
          style={{
            padding: '14px',
            backgroundColor: '#F8FAFC',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#64748B' }}>Order Status:</span>
            <span style={{ fontWeight: 'bold', color: '#00C853' }}>{selectedOrder.status}</span>
          </div>
          {selectedOrder.deliveryPin && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <span style={{ fontSize: '13px', color: '#64748B' }}>Customer Delivery PIN:</span>
              <span style={{ fontWeight: 'bold', letterSpacing: '2px', color: '#0F172A', fontSize: '16px' }}>
                {selectedOrder.deliveryPin}
              </span>
            </div>
          )}
          {selectedOrder.handoverOtp && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <span style={{ fontSize: '13px', color: '#64748B' }}>Merchant Handover OTP:</span>
              <span style={{ fontWeight: 'bold', letterSpacing: '2px', color: '#0F172A', fontSize: '16px' }}>
                {selectedOrder.handoverOtp}
              </span>
            </div>
          )}
        </div>
        {/* Items */}
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', marginBottom: '10px' }}>
          Itemized Items ({selectedOrder.items?.length || 0})
        </h3>
        <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px', marginBottom: '20px' }}>
          {selectedOrder.items?.map((it: any, i: number) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: i < selectedOrder.items.length - 1 ? '1px solid #F1F5F9' : 'none',
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>
                  {it.quantity}x {it.itemName || it.item_name_snapshot}
                </div>
                {it.customizations && it.customizations.length > 0 && (
                  <div style={{ fontSize: '12px', color: '#64748B' }}>
                    {it.customizations.map((c: any) => c.option_name_snapshot).join(', ')}
                  </div>
                )}
              </div>
              <div style={{ fontWeight: 600 }}>₹{it.totalPriceInr || it.total_price_inr}</div>
            </div>
          ))}
        </div>
        {/* Financial Summary */}
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', marginBottom: '10px' }}>
          Financial Breakdown
        </h3>
        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '14px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
            <span style={{ color: '#64748B' }}>Items Subtotal:</span>
            <span>₹{selectedOrder.pricing?.itemsSubtotalInr || selectedOrder.pricing?.items_total_inr || 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
            <span style={{ color: '#64748B' }}>Delivery Fee:</span>
            <span>₹{selectedOrder.pricing?.deliveryFeeInr || selectedOrder.pricing?.delivery_fee_inr || 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
            <span style={{ color: '#64748B' }}>Packaging Fee:</span>
            <span>₹{selectedOrder.pricing?.packagingFeeInr || selectedOrder.pricing?.packaging_fee_inr || 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
            <span style={{ color: '#64748B' }}>Platform Fee:</span>
            <span>₹{selectedOrder.pricing?.platformFeeInr || selectedOrder.pricing?.platform_fee_inr || 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
            <span style={{ color: '#64748B' }}>GST (5%):</span>
            <span>₹{selectedOrder.pricing?.gstAmountInr || selectedOrder.pricing?.tax_total_inr || 0}</span>
          </div>
          {selectedOrder.pricing?.discountAmountInr > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: '#15803D' }}>
              <span>Discount:</span>
              <span>-₹{selectedOrder.pricing.discountAmountInr}</span>
            </div>
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 'bold',
              fontSize: '15px',
              borderTop: '1px solid #CBD5E1',
              paddingTop: '8px',
              marginTop: '8px',
            }}
          >
            <span>Total Paid:</span>
            <span style={{ color: '#00C853' }}>
              ₹{selectedOrder.pricing?.finalPayableAmountInr || selectedOrder.pricing?.total_payable_inr || 0}
            </span>
          </div>
        </div>
        <OrderCancelSection
          status={selectedOrder.status}
          showCancelDialog={showCancelDialog}
          setShowCancelDialog={setShowCancelDialog}
          cancelReason={cancelReason}
          setCancelReason={setCancelReason}
          handleCancelOrder={handleCancelOrder}
          isCancelling={isCancelling}
        />
      </div>
    </div>
  );
}