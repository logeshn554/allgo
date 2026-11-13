import React from 'react';
import Link from 'next/link';

interface ParcelsTableProps {
  parcels: any[];
  isLoading: boolean;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  serviceTypeFilter: string;
  setServiceTypeFilter: (val: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
}

export const ParcelsTable: React.FC<ParcelsTableProps> = ({
  parcels,
  isLoading,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  serviceTypeFilter,
  setServiceTypeFilter,
  onSearchSubmit,
}) => {
  const getStatusBadge = (status: string) => {
    let bg = '#64748B';
    let text = '#FFFFFF';

    switch (status) {
      case 'BOOKED':
      case 'PAYMENT_PENDING':
        bg = '#F59E0B';
        break;
      case 'PAYMENT_CONFIRMED':
      case 'SEARCHING_FOR_PARTNER':
        bg = '#D97706';
        break;
      case 'PARTNER_ASSIGNED':
      case 'PARTNER_ACCEPTED':
      case 'ARRIVING_AT_PICKUP':
        bg = '#3B82F6';
        break;
      case 'PICKED_UP':
      case 'IN_TRANSIT':
      case 'ARRIVING_AT_DESTINATION':
        bg = '#0284C7';
        break;
      case 'DELIVERED':
        bg = '#10B981';
        break;
      case 'DELIVERY_FAILED':
      case 'CANCELLED':
        bg = '#EF4444';
        break;
      case 'RETURN_INITIATED':
      case 'RETURN_IN_TRANSIT':
      case 'RETURNED_TO_SENDER':
        bg = '#8B5CF6';
        break;
    }

    return (
      <span
        style={{
          display: 'inline-block',
          padding: '4px 8px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: '700',
          backgroundColor: bg,
          color: text,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <form onSubmit={onSearchSubmit} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '240px' }}>
          <input
            type="text"
            placeholder="Search tracking #, customer phone, recipient..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              fontSize: '14px',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '8px 16px',
              backgroundColor: '#7C3AED',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Search
          </button>
        </form>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #CBD5E1',
            fontSize: '14px',
            backgroundColor: '#FFFFFF',
          }}
        >
          <option value="">All Statuses</option>
          <option value="BOOKED">Booked</option>
          <option value="SEARCHING_FOR_PARTNER">Searching for Partner</option>
          <option value="PARTNER_ASSIGNED">Partner Assigned</option>
          <option value="ARRIVING_AT_PICKUP">Arriving at Pickup</option>
          <option value="PICKED_UP">Picked Up</option>
          <option value="IN_TRANSIT">In Transit</option>
          <option value="ARRIVING_AT_DESTINATION">Arriving at Destination</option>
          <option value="DELIVERED">Delivered</option>
          <option value="DELIVERY_FAILED">Delivery Failed</option>
          <option value="RETURN_INITIATED">Return Initiated</option>
          <option value="RETURNED_TO_SENDER">Returned to Sender</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <select
          value={serviceTypeFilter}
          onChange={(e) => setServiceTypeFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #CBD5E1',
            fontSize: '14px',
            backgroundColor: '#FFFFFF',
          }}
        >
          <option value="">All Tiers</option>
          <option value="STANDARD">Standard</option>
          <option value="EXPRESS">Express</option>
          <option value="SAME_DAY">Same Day</option>
        </select>
      </div>

      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              <th style={{ padding: '14px 16px', fontWeight: '700', color: '#475569' }}>TRACKING #</th>
              <th style={{ padding: '14px 16px', fontWeight: '700', color: '#475569' }}>SERVICE & SPECS</th>
              <th style={{ padding: '14px 16px', fontWeight: '700', color: '#475569' }}>SENDER / PICKUP</th>
              <th style={{ padding: '14px 16px', fontWeight: '700', color: '#475569' }}>RECIPIENT / DROP</th>
              <th style={{ padding: '14px 16px', fontWeight: '700', color: '#475569' }}>PARTNER</th>
              <th style={{ padding: '14px 16px', fontWeight: '700', color: '#475569' }}>FEE (₹)</th>
              <th style={{ padding: '14px 16px', fontWeight: '700', color: '#475569' }}>STATUS</th>
              <th style={{ padding: '14px 16px', fontWeight: '700', color: '#475569' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                  Loading parcel records...
                </td>
              </tr>
            ) : parcels.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                  No parcel bookings found matching criteria.
                </td>
              </tr>
            ) : (
              parcels.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '14px 16px', fontWeight: '700', color: '#0F172A' }}>
                    {p.tracking_number || p.trackingNumber || p.id.slice(0, 8)}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: '600' }}>{p.service_type || p.serviceType}</div>
                    <div style={{ color: '#64748B', fontSize: '11px' }}>
                      {p.package_category || p.packageCategory} · {p.estimated_weight_kg || p.weightKg} kg
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: '600' }}>{p.sender_name || p.senderName}</div>
                    <div style={{ color: '#64748B', fontSize: '11px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.pickup_address || p.pickupAddress}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: '600' }}>{p.recipient_name || p.recipientName}</div>
                    <div style={{ color: '#64748B', fontSize: '11px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.drop_address || p.dropAddress}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {p.partner_id ? (
                      <div>
                        <span style={{ fontWeight: '600', color: '#0F172A' }}>Assigned</span>
                        <div style={{ color: '#64748B', fontSize: '11px' }}>{p.partner_name || p.partner_id.slice(0, 8)}</div>
                      </div>
                    ) : (
                      <span style={{ color: '#94A3B8' }}>Unassigned</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: '700', color: '#0F172A' }}>
                    ₹{Number(p.total_amount_inr || p.totalAmountInr || 0).toFixed(2)}
                  </td>
                  <td style={{ padding: '14px 16px' }}>{getStatusBadge(p.status)}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <Link
                      href={`/admin/parcels/${p.id}`}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#EDE9FE',
                        color: '#6D28D9',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontWeight: '600',
                        fontSize: '12px',
                      }}
                    >
                      Inspect & Manage →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
