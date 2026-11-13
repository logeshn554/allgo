'use client';

import React from 'react';

interface CreateCouponModalProps {
  showNewCouponModal: boolean;
  setShowNewCouponModal: (s: boolean) => void;
  couponCode: string;
  setCouponCode: (c: string) => void;
  couponDesc: string;
  setCouponDesc: (d: string) => void;
  couponType: 'PERCENTAGE' | 'FLAT';
  setCouponType: (t: 'PERCENTAGE' | 'FLAT') => void;
  discountVal: string;
  setDiscountVal: (v: string) => void;
  minOrder: string;
  setMinOrder: (m: string) => void;
  maxDiscount: string;
  setMaxDiscount: (m: string) => void;
  isCreatingCoupon: boolean;
  handleCreateCoupon: (e: React.FormEvent) => Promise<void>;
}

export function CreateCouponModal({
  showNewCouponModal,
  setShowNewCouponModal,
  couponCode,
  setCouponCode,
  couponDesc,
  setCouponDesc,
  couponType,
  setCouponType,
  discountVal,
  setDiscountVal,
  minOrder,
  setMinOrder,
  maxDiscount,
  setMaxDiscount,
  isCreatingCoupon,
  handleCreateCoupon,
}: CreateCouponModalProps) {
  if (!showNewCouponModal) return null;

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
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          width: '480px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Create Promotional Coupon</h2>
          <button
            onClick={() => setShowNewCouponModal(false)}
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748B' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleCreateCoupon}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              Coupon Code *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. ALLGO50, FEAST100"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #CBD5E1', borderRadius: '6px' }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              Description
            </label>
            <input
              type="text"
              placeholder="e.g. 50% discount on food orders"
              value={couponDesc}
              onChange={(e) => setCouponDesc(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #CBD5E1', borderRadius: '6px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Type</label>
              <select
                value={couponType}
                onChange={(e: any) => setCouponType(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #CBD5E1', borderRadius: '6px' }}
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FLAT">Flat INR (₹)</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                {couponType === 'PERCENTAGE' ? 'Discount % *' : 'Discount Amount (₹) *'}
              </label>
              <input
                type="number"
                required
                value={discountVal}
                onChange={(e) => setDiscountVal(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #CBD5E1', borderRadius: '6px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                Min Order (₹)
              </label>
              <input
                type="number"
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #CBD5E1', borderRadius: '6px' }}
              />
            </div>
            {couponType === 'PERCENTAGE' && (
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                  Max Cap (₹)
                </label>
                <input
                  type="number"
                  value={maxDiscount}
                  onChange={(e) => setMaxDiscount(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #CBD5E1', borderRadius: '6px' }}
                />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setShowNewCouponModal(false)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#F1F5F9',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreatingCoupon}
              style={{
                padding: '8px 20px',
                backgroundColor: '#00C853',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isCreatingCoupon ? 'Creating...' : 'Create Coupon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
