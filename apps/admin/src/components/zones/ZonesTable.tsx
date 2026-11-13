'use client';

import React from 'react';

interface ZonesTableProps {
  zones: any[];
  isLoading: boolean;
  onOpenSurgeModal: (zone: any) => void;
}

export function ZonesTable({ zones, isLoading, onOpenSurgeModal }: ZonesTableProps) {
  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '12px' }}>
            <th style={{ padding: '14px 20px', fontWeight: '600' }}>ZONE NAME & CODE</th>
            <th style={{ padding: '14px 20px', fontWeight: '600' }}>STATUS</th>
            <th style={{ padding: '14px 20px', fontWeight: '600' }}>AREA</th>
            <th style={{ padding: '14px 20px', fontWeight: '600' }}>FOOD SETTINGS</th>
            <th style={{ padding: '14px 20px', fontWeight: '600' }}>GROCERY SETTINGS</th>
            <th style={{ padding: '14px 20px', fontWeight: '600' }}>SURGE MULTIPLIER</th>
            <th style={{ padding: '14px 20px', fontWeight: '600', textAlign: 'right' }}>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                Loading service zones...
              </td>
            </tr>
          ) : zones.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                No service zones found.
              </td>
            </tr>
          ) : (
            zones.map((zone) => {
              const food = zone.service_settings?.find((s: any) => s.verticalType === 'FOOD');
              const grocery = zone.service_settings?.find((s: any) => s.verticalType === 'GROCERY');
              const isSurge = food?.isSurgeActive && food?.surgeMultiplier > 1.0;

              return (
                <tr key={zone.id} style={{ borderBottom: '1px solid #F1F5F9', fontSize: '13px' }}>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 'bold', color: '#0F172A' }}>{zone.name}</div>
                    <div style={{ color: '#64748B', fontSize: '11px', fontFamily: 'monospace' }}>{zone.code}</div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        backgroundColor: zone.is_active ? '#ECFDF5' : '#F1F5F9',
                        color: zone.is_active ? '#065F46' : '#64748B',
                      }}
                    >
                      {zone.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', color: '#334155' }}>
                    {zone.area_sq_km ? `${parseFloat(zone.area_sq_km).toFixed(1)} km²` : 'Polygon'}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    {food ? (
                      <div>
                        <div>Min ₹{food.minOrderValueInr} • Base ₹{food.baseDeliveryFeeInr}</div>
                        <div style={{ color: '#64748B', fontSize: '11px' }}>Free up to {food.freeDeliveryDistanceKm} km</div>
                      </div>
                    ) : (
                      <span style={{ color: '#94A3B8' }}>Disabled</span>
                    )}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    {grocery ? (
                      <div>
                        <div>Min ₹{grocery.minOrderValueInr} • Base ₹{grocery.baseDeliveryFeeInr}</div>
                        <div style={{ color: '#64748B', fontSize: '11px' }}>Free up to {grocery.freeDeliveryDistanceKm} km</div>
                      </div>
                    ) : (
                      <span style={{ color: '#94A3B8' }}>Disabled</span>
                    )}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    {isSurge ? (
                      <span
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#FFEDD5',
                          color: '#C2410C',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          fontSize: '12px',
                        }}
                      >
                        ⚡ {food.surgeMultiplier}x Active
                      </span>
                    ) : (
                      <span style={{ color: '#64748B' }}>1.0x (Standard)</span>
                    )}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <button
                      onClick={() => onOpenSurgeModal(zone)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      ⚡ Surge Control
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
