'use client';

import React from 'react';

interface RideDetailModalProps {
  selectedRideDetail: any | null;
  onClose: () => void;
}

export function RideDetailModal({ selectedRideDetail, onClose }: RideDetailModalProps) {
  if (!selectedRideDetail) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        padding: '24px',
        borderRadius: '12px',
        maxWidth: '650px',
        width: '90%',
        maxHeight: '85vh',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
            🚗 Ride Details #{selectedRideDetail.ride?.ride_number}
          </h3>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {selectedRideDetail.ride && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px', fontSize: '13px' }}>
            <div><strong>Status:</strong> {selectedRideDetail.ride.status}</div>
            <div><strong>Vehicle:</strong> {selectedRideDetail.ride.ride_type} ({selectedRideDetail.ride.registration_number || 'N/A'})</div>
            <div><strong>Customer:</strong> {selectedRideDetail.ride.customer_name} ({selectedRideDetail.ride.customer_phone})</div>
            <div><strong>Driver:</strong> {selectedRideDetail.ride.driver_name || 'Unassigned'} ({selectedRideDetail.ride.driver_phone || 'N/A'})</div>
            <div><strong>Pickup:</strong> {selectedRideDetail.ride.pickup_address}</div>
            <div><strong>Drop:</strong> {selectedRideDetail.ride.drop_address}</div>
            <div><strong>Fare:</strong> ₹{Number(selectedRideDetail.ride.total_fare_inr || 0).toFixed(2)}</div>
            <div><strong>Created:</strong> {new Date(selectedRideDetail.ride.created_at).toLocaleString()}</div>
          </div>
        )}

        <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#0F172A' }}>
          📋 Immutable Audit Event Timeline ({selectedRideDetail.events?.length || 0})
        </h4>
        <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px', marginBottom: '16px', maxHeight: '200px', overflowY: 'auto' }}>
          {(selectedRideDetail.events || []).length === 0 ? (
            <div style={{ color: '#94A3B8', fontSize: '12px' }}>No audit events logged</div>
          ) : (
            selectedRideDetail.events.map((ev: any) => (
              <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F1F5F9', fontSize: '12px' }}>
                <span style={{ fontWeight: 'bold', color: '#0284C7' }}>{ev.event_type}</span>
                <span style={{ color: '#64748B' }}>{new Date(ev.created_at).toLocaleTimeString()}</span>
              </div>
            ))
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 16px', backgroundColor: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
