'use client';

import React from 'react';

interface MobilityHireDriverTabProps {
  hireDriverBookings: any[];
}

export function MobilityHireDriverTab({ hireDriverBookings }: MobilityHireDriverTabProps) {
  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
        <thead>
          <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
            <th style={{ padding: '12px 16px' }}>BOOKING #</th>
            <th style={{ padding: '12px 16px' }}>CUSTOMER</th>
            <th style={{ padding: '12px 16px' }}>CHAUFFEUR</th>
            <th style={{ padding: '12px 16px' }}>VEHICLE / TRANSMISSION</th>
            <th style={{ padding: '12px 16px' }}>PICKUP ADDRESS</th>
            <th style={{ padding: '12px 16px' }}>PRICING MODEL</th>
            <th style={{ padding: '12px 16px' }}>TOTAL FARE</th>
            <th style={{ padding: '12px 16px' }}>STATUS</th>
            <th style={{ padding: '12px 16px' }}>CREATED</th>
          </tr>
        </thead>
        <tbody>
          {hireDriverBookings.length === 0 ? (
            <tr>
              <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#94A3B8' }}>
                No hire driver bookings recorded yet.
              </td>
            </tr>
          ) : (
            hireDriverBookings.map((b) => (
              <tr key={b.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>#{b.booking_number}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontWeight: '600' }}>{b.customer_name || 'Customer'}</div>
                  <div style={{ color: '#64748B', fontSize: '11px' }}>{b.customer_phone}</div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {b.driver_name ? (
                    <>
                      <div style={{ fontWeight: '600' }}>{b.driver_name}</div>
                      <div style={{ color: '#64748B', fontSize: '11px' }}>{b.driver_phone}</div>
                    </>
                  ) : (
                    <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Unassigned</span>
                  )}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontWeight: '600' }}>{b.customer_vehicle_make_model || b.vehicle_make_model || 'Customer Car'}</div>
                  <div style={{ color: '#0369A1', fontSize: '11px', fontWeight: 'bold' }}>
                    {b.customer_vehicle_transmission || b.transmission_type || 'MANUAL'} • {b.customer_vehicle_fuel_type || 'PETROL'}
                  </div>
                </td>
                <td style={{ padding: '12px 16px', maxWidth: '240px' }}>
                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    📍 {b.pickup_address}
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '4px 8px',
                    backgroundColor: '#F3E8FF',
                    color: '#7E22CE',
                    borderRadius: '6px',
                    fontWeight: '600',
                    fontSize: '11px',
                  }}>
                    {b.pricing_model || 'HOURLY'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>
                  ₹{Number(b.total_fare_inr || 0).toFixed(2)}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '4px 8px',
                    backgroundColor: b.status === 'COMPLETED' ? '#DCFCE7' : b.status === 'STARTED' ? '#FEF08A' : '#F1F5F9',
                    color: b.status === 'COMPLETED' ? '#15803D' : b.status === 'STARTED' ? '#854D0E' : '#475569',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    fontSize: '11px',
                  }}>
                    {b.status}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: '#64748B' }}>
                  {new Date(b.created_at).toLocaleTimeString()}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
