'use client';

import React from 'react';

interface MobilityFaresTabProps {
  faresData: {
    rideFares: any[];
    parcelFares: any[];
  };
}

export function MobilityFaresTab({ faresData }: MobilityFaresTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Ride Fares */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
          🚗 Ride Fare Configurations (Per Vehicle Category)
        </h2>
        <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>
          Active base rate, per-km distance fee, per-minute time fee, and platform commission.
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
              <th style={{ padding: '12px 16px' }}>CATEGORY</th>
              <th style={{ padding: '12px 16px' }}>BASE FARE</th>
              <th style={{ padding: '12px 16px' }}>BASE DISTANCE</th>
              <th style={{ padding: '12px 16px' }}>PER KM RATE</th>
              <th style={{ padding: '12px 16px' }}>PER MINUTE</th>
              <th style={{ padding: '12px 16px' }}>MINIMUM FARE</th>
              <th style={{ padding: '12px 16px' }}>CANCEL FEE</th>
              <th style={{ padding: '12px 16px' }}>COMMISSION</th>
            </tr>
          </thead>
          <tbody>
            {faresData.rideFares.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>
                  No ride fare slabs configured.
                </td>
              </tr>
            ) : (
              faresData.rideFares.map((f: any) => (
                <tr key={f.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#0369A1' }}>{f.vehicle_category}</td>
                  <td style={{ padding: '12px 16px' }}>₹{Number(f.base_fare_inr || 0).toFixed(2)}</td>
                  <td style={{ padding: '12px 16px' }}>{Number(f.base_distance_km || 0).toFixed(1)} km</td>
                  <td style={{ padding: '12px 16px' }}>₹{Number(f.per_km_rate_inr || 0).toFixed(2)}/km</td>
                  <td style={{ padding: '12px 16px' }}>₹{Number(f.per_minute_rate_inr || 0).toFixed(2)}/min</td>
                  <td style={{ padding: '12px 16px' }}>₹{Number(f.minimum_fare_inr || 0).toFixed(2)}</td>
                  <td style={{ padding: '12px 16px', color: '#DC2626' }}>₹{Number(f.cancellation_fee_inr || 0).toFixed(2)}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#16A34A' }}>{f.commission_rate_percentage || 20}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Parcel Fares */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
          📦 Parcel Courier Fare Configurations
        </h2>
        <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>
          Pricing slabs per package category and per-kg weight tiers.
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
              <th style={{ padding: '12px 16px' }}>CATEGORY</th>
              <th style={{ padding: '12px 16px' }}>BASE FARE</th>
              <th style={{ padding: '12px 16px' }}>BASE DISTANCE</th>
              <th style={{ padding: '12px 16px' }}>PER KM RATE</th>
              <th style={{ padding: '12px 16px' }}>PER KG RATE</th>
              <th style={{ padding: '12px 16px' }}>MAX WEIGHT</th>
              <th style={{ padding: '12px 16px' }}>COMMISSION</th>
            </tr>
          </thead>
          <tbody>
            {faresData.parcelFares.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>
                  No parcel fare slabs configured.
                </td>
              </tr>
            ) : (
              faresData.parcelFares.map((pf: any) => (
                <tr key={pf.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#7E22CE' }}>{pf.package_category}</td>
                  <td style={{ padding: '12px 16px' }}>₹{Number(pf.base_fare_inr || 0).toFixed(2)}</td>
                  <td style={{ padding: '12px 16px' }}>{Number(pf.base_distance_km || 0).toFixed(1)} km</td>
                  <td style={{ padding: '12px 16px' }}>₹{Number(pf.per_km_rate_inr || 0).toFixed(2)}/km</td>
                  <td style={{ padding: '12px 16px' }}>₹{Number(pf.per_kg_rate_inr || 0).toFixed(2)}/kg</td>
                  <td style={{ padding: '12px 16px' }}>{Number(pf.max_weight_kg || 10).toFixed(1)} kg</td>
                  <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#16A34A' }}>{pf.commission_rate_percentage || 15}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
