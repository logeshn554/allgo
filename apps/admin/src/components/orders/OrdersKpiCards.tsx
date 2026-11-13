'use client';

import React from 'react';

interface OrdersKpiCardsProps {
  orders: any[];
}

export function OrdersKpiCards({ orders }: OrdersKpiCardsProps) {
  const totalOrders = orders.length;
  const placedCount = orders.filter((o) => o.status === 'PLACED' || o.status === 'MERCHANT_ACCEPTED').length;
  const prepCount = orders.filter((o) => o.status === 'PREPARING' || o.status === 'READY').length;
  const dispatchedCount = orders.filter((o) => o.status === 'DISPATCHED').length;
  const cancelledCount = orders.filter((o) => o.status === 'CANCELLED' || o.status === 'REJECTED').length;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '28px',
      }}
    >
      <div style={{ backgroundColor: '#FFFFFF', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
        <p style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>
          Total Orders
        </p>
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0F172A', marginTop: '6px', margin: 0 }}>
          {totalOrders}
        </h2>
      </div>

      <div style={{ backgroundColor: '#FFFFFF', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
        <p style={{ fontSize: '12px', color: '#F59E0B', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>
          Placed / Awaiting Prep
        </p>
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#F59E0B', marginTop: '6px', margin: 0 }}>
          {placedCount}
        </h2>
      </div>

      <div style={{ backgroundColor: '#FFFFFF', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
        <p style={{ fontSize: '12px', color: '#3B82F6', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>
          In Kitchen / Ready
        </p>
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#3B82F6', marginTop: '6px', margin: 0 }}>
          {prepCount}
        </h2>
      </div>

      <div style={{ backgroundColor: '#FFFFFF', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
        <p style={{ fontSize: '12px', color: '#10B981', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>
          Out for Delivery
        </p>
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#10B981', marginTop: '6px', margin: 0 }}>
          {dispatchedCount}
        </h2>
      </div>

      <div style={{ backgroundColor: '#FFFFFF', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
        <p style={{ fontSize: '12px', color: '#EF4444', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>
          Cancelled / Refunded
        </p>
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#EF4444', marginTop: '6px', margin: 0 }}>
          {cancelledCount}
        </h2>
      </div>
    </div>
  );
}
