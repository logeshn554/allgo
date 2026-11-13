'use client';

import React from 'react';

interface MobilityRidesTabProps {
  rides: any[];
  isLoadingRideDetail: boolean;
  onViewRide: (rideId: string) => void;
}

export function MobilityRidesTab({ rides, isLoadingRideDetail, onViewRide }: MobilityRidesTabProps) {
  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
        <thead>
          <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
            <th style={{ padding: '12px 16px' }}>RIDE #</th>
            <th style={{ padding: '12px 16px' }}>VEHICLE</th>
            <th style={{ padding: '12px 16px' }}>CUSTOMER</th>
            <th style={{ padding: '12px 16px' }}>DRIVER</th>
            <th style={{ padding: '12px 16px' }}>PICKUP / DROPOFF</th>
            <th style={{ padding: '12px 16px' }}>TOTAL FARE</th>
            <th style={{ padding: '12px 16px' }}>STATUS</th>
            <th style={{ padding: '12px 16px' }}>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {rides.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#94A3B8' }}>
                No rides recorded yet.
              </td>
            </tr>
          ) : (
            rides.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>#{r.ride_number}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '4px 8px',
                    backgroundColor: '#E0F2FE',
                    color: '#0369A1',
                    borderRadius: '6px',
                    fontWeight: '600',
                    fontSize: '11px',
                  }}>
                    {r.ride_type}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontWeight: '600' }}>{r.customer_name || 'Customer'}</div>
                  <div style={{ color: '#64748B', fontSize: '11px' }}>{r.customer_phone}</div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {r.driver_name ? (
                    <>
                      <div style={{ fontWeight: '600' }}>{r.driver_name}</div>
                      <div style={{ color: '#64748B', fontSize: '11px' }}>{r.driver_phone}</div>
                    </>
                  ) : (
                    <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Unassigned</span>
                  )}
                </td>
                <td style={{ padding: '12px 16px', maxWidth: '240px' }}>
                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    📍 {r.pickup_address}
                  </div>
                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#64748B' }}>
                    🏁 {r.drop_address}
                  </div>
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>
                  ₹{Number(r.total_fare_inr || 0).toFixed(2)}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '4px 8px',
                    backgroundColor: r.status === 'COMPLETED' ? '#DCFCE7' : r.status === 'IN_PROGRESS' ? '#FEF08A' : '#F1F5F9',
                    color: r.status === 'COMPLETED' ? '#15803D' : r.status === 'IN_PROGRESS' ? '#854D0E' : '#475569',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    fontSize: '11px',
                  }}>
                    {r.status}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <button
                    onClick={() => onViewRide(r.id)}
                    disabled={isLoadingRideDetail}
                    style={{
                      padding: '4px 10px',
                      backgroundColor: '#0F172A',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '600',
                    }}
                  >
                    Details
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
