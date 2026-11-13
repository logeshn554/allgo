'use client';

import React from 'react';

interface OrdersTableProps {
  orders: any[];
  isLoadingOrders: boolean;
  ordersError: string | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  onInspectOrder: (orderId: string) => void;
}

export function OrdersTable({
  orders,
  isLoadingOrders,
  ordersError,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  onInspectOrder,
}: OrdersTableProps) {
  const filteredOrders = orders.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (o.sub_order_number || '').toLowerCase().includes(q) ||
      (o.customer_name || '').toLowerCase().includes(q) ||
      (o.customer_phone || '').toLowerCase().includes(q) ||
      (o.outlet_name || '').toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Filters Bar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          backgroundColor: '#FFFFFF',
          padding: '14px',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
          marginBottom: '16px',
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          placeholder="Search by Order #, Customer, Phone, or Outlet..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #CBD5E1',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #CBD5E1',
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: '#FFFFFF',
          }}
        >
          <option value="ALL">All Statuses</option>
          <option value="PLACED">Placed</option>
          <option value="MERCHANT_ACCEPTED">Accepted</option>
          <option value="PREPARING">Preparing</option>
          <option value="READY">Ready</option>
          <option value="DISPATCHED">Out for Delivery</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Orders Table */}
      {isLoadingOrders ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>Loading orders...</div>
      ) : ordersError ? (
        <div style={{ padding: '16px', backgroundColor: '#FEE2E2', color: '#B91C1C', borderRadius: '8px' }}>
          {ordersError}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '48px',
            textAlign: 'center',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
          }}
        >
          <p style={{ fontSize: '18px', color: '#64748B', margin: 0 }}>No matching orders found.</p>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Order / Group #</th>
                <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Restaurant / Outlet</th>
                <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Customer</th>
                <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Amount (INR)</th>
                <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Status</th>
                <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Date & Time</th>
                <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((ord) => (
                <tr key={ord.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>{ord.sub_order_number}</span>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>{ord.order_group_number}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontWeight: 600, color: '#1E293B' }}>{ord.outlet_name}</span>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>{ord.business_name}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontWeight: 500 }}>{ord.customer_name}</span>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>{ord.customer_phone}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>
                      ₹{Number(ord.total_payable_inr ?? ord.items_total_inr).toFixed(2)}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor:
                          ord.status === 'DELIVERED'
                            ? '#DCFCE7'
                            : ord.status === 'CANCELLED'
                            ? '#FEE2E2'
                            : ord.status === 'DISPATCHED'
                            ? '#E0F2FE'
                            : '#FEF3C7',
                        color:
                          ord.status === 'DELIVERED'
                            ? '#15803D'
                            : ord.status === 'CANCELLED'
                            ? '#B91C1C'
                            : ord.status === 'DISPATCHED'
                            ? '#0369A1'
                            : '#B45309',
                      }}
                    >
                      {ord.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#64748B', fontSize: '13px' }}>
                    {new Date(ord.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => onInspectOrder(ord.id)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#00C853',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '13px',
                      }}
                    >
                      Inspect & Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
