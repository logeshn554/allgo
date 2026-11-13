import React from 'react';

interface ParcelInfoCardsProps {
  parcel: any;
  onOpenReassign: () => void;
  onOpenReturn: () => void;
  onOpenCancel: () => void;
}

export const ParcelInfoCards: React.FC<ParcelInfoCardsProps> = ({
  parcel,
  onOpenReassign,
  onOpenReturn,
  onOpenCancel,
}) => {
  return (
    <>
      {/* Header Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
              Parcel #{parcel.tracking_number || parcel.trackingNumber || parcel.id}
            </h1>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                backgroundColor: '#7C3AED',
                color: '#FFFFFF',
                textTransform: 'uppercase',
              }}
            >
              {parcel.status?.replace(/_/g, ' ')}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '6px', margin: 0 }}>
            Service: <strong>{parcel.service_type || parcel.serviceType}</strong> · Category: <strong>{parcel.package_category || parcel.packageCategory}</strong> · Weight: <strong>{parcel.estimated_weight_kg || parcel.weightKg} kg</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={onOpenReassign}
            style={{
              padding: '8px 14px',
              backgroundColor: '#3B82F6',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            🔄 Reassign Partner
          </button>
          <button
            onClick={onOpenReturn}
            style={{
              padding: '8px 14px',
              backgroundColor: '#8B5CF6',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            ↩️ Authorize Return
          </button>
          <button
            onClick={onOpenCancel}
            style={{
              padding: '8px 14px',
              backgroundColor: '#EF4444',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            ❌ Cancel Booking
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Sender & Recipient Card */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A', marginBottom: '14px' }}>
            Sender & Recipient Information
          </h2>
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', color: '#16A34A', fontWeight: '700', textTransform: 'uppercase' }}>PICKUP (SENDER)</div>
            <div style={{ fontWeight: '600', fontSize: '14px', marginTop: '2px' }}>{parcel.sender_name || parcel.senderName}</div>
            <div style={{ fontSize: '12px', color: '#64748B' }}>{parcel.pickup_contact_phone || parcel.senderPhone}</div>
            <div style={{ fontSize: '13px', color: '#334155', marginTop: '4px' }}>{parcel.pickup_address || parcel.pickupAddress}</div>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '14px 0' }} />
          <div>
            <div style={{ fontSize: '11px', color: '#2563EB', fontWeight: '700', textTransform: 'uppercase' }}>DESTINATION (RECIPIENT)</div>
            <div style={{ fontWeight: '600', fontSize: '14px', marginTop: '2px' }}>{parcel.recipient_name || parcel.recipientName}</div>
            <div style={{ fontSize: '12px', color: '#64748B' }}>{parcel.recipient_phone || parcel.recipientPhone}</div>
            <div style={{ fontSize: '13px', color: '#334155', marginTop: '4px' }}>{parcel.drop_address || parcel.dropAddress}</div>
          </div>
        </div>

        {/* Financial & Package Specs */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A', marginBottom: '14px' }}>
            Financial Breakdown & Security
          </h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
            <span style={{ color: '#64748B' }}>Delivery Courier Fee:</span>
            <span style={{ fontWeight: '600' }}>₹{Number(parcel.delivery_fee_inr || parcel.deliveryFeeInr || 0).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
            <span style={{ color: '#64748B' }}>Platform Fee:</span>
            <span style={{ fontWeight: '600' }}>₹{Number(parcel.platform_fee_inr || parcel.platformFeeInr || 0).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
            <span style={{ color: '#64748B' }}>GST Tax:</span>
            <span style={{ fontWeight: '600' }}>₹{Number(parcel.tax_total_inr || parcel.taxTotalInr || 0).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '15px', fontWeight: '700', borderTop: '1px solid #E2E8F0', paddingTop: '8px' }}>
            <span>Total Authoritative Amount:</span>
            <span style={{ color: '#7C3AED' }}>₹{Number(parcel.total_amount_inr || parcel.totalAmountInr || 0).toFixed(2)}</span>
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', backgroundColor: '#F8FAFC', padding: '10px', borderRadius: '8px' }}>
            <div>Payment Reference: <strong>{parcel.payment_reference || 'COD / Handover'}</strong></div>
            <div>Payment Status: <strong>{parcel.payment_status || parcel.paymentStatus}</strong></div>
          </div>
        </div>
      </div>
    </>
  );
};
