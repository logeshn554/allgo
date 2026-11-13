'use client';

import React from 'react';

interface MobilityFlagsTabProps {
  featureFlags: any[];
  onToggleFlag: (stateCode: string, field: 'ridesEnabled' | 'hireDriverEnabled' | 'bikeTaxiEnabled', currentValue: boolean) => void;
}

export function MobilityFlagsTab({ featureFlags, onToggleFlag }: MobilityFlagsTabProps) {
  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
        State-by-State Mobility Regulatory Feature Clearances
      </h2>
      <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
        Strict legal compliance gating: Bike taxi, commercial auto/cab rides, and hire-driver services are legally gated per State Transport Department regulations.
      </p>

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
        <thead>
          <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
            <th style={{ padding: '12px 16px' }}>STATE</th>
            <th style={{ padding: '12px 16px' }}>STATE CODE</th>
            <th style={{ padding: '12px 16px' }}>RIDES (CAB / AUTO)</th>
            <th style={{ padding: '12px 16px' }}>BIKE TAXI CLEARANCE</th>
            <th style={{ padding: '12px 16px' }}>HIRE-DRIVER PERMISSION</th>
            <th style={{ padding: '12px 16px' }}>LAST UPDATED</th>
          </tr>
        </thead>
        <tbody>
          {featureFlags.map((ff) => (
            <tr key={ff.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
              <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{ff.state_name}</td>
              <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#0369A1' }}>{ff.state_code}</td>
              <td style={{ padding: '12px 16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={ff.rides_enabled}
                    onChange={() => onToggleFlag(ff.state_code, 'ridesEnabled', ff.rides_enabled)}
                  />
                  <span style={{ color: ff.rides_enabled ? '#15803D' : '#991B1B', fontWeight: '600' }}>
                    {ff.rides_enabled ? 'ALLOWED' : 'DISABLED'}
                  </span>
                </label>
              </td>
              <td style={{ padding: '12px 16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={ff.bike_taxi_enabled}
                    onChange={() => onToggleFlag(ff.state_code, 'bikeTaxiEnabled', ff.bike_taxi_enabled)}
                  />
                  <span style={{ color: ff.bike_taxi_enabled ? '#15803D' : '#991B1B', fontWeight: '600' }}>
                    {ff.bike_taxi_enabled ? 'ALLOWED' : 'PROHIBITED'}
                  </span>
                </label>
              </td>
              <td style={{ padding: '12px 16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={ff.hire_driver_enabled}
                    onChange={() => onToggleFlag(ff.state_code, 'hireDriverEnabled', ff.hire_driver_enabled)}
                  />
                  <span style={{ color: ff.hire_driver_enabled ? '#15803D' : '#991B1B', fontWeight: '600' }}>
                    {ff.hire_driver_enabled ? 'ALLOWED' : 'DISABLED'}
                  </span>
                </label>
              </td>
              <td style={{ padding: '12px 16px', color: '#64748B' }}>
                {new Date(ff.updated_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
