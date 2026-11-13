'use client';

import React, { useState, useEffect } from 'react';
import { adminApi } from '../../../lib/api-client';
import { MobilityStats } from '../../../components/mobility/MobilityStats';
import { MobilityRidesTab } from '../../../components/mobility/MobilityRidesTab';
import { MobilityParcelsTab } from '../../../components/mobility/MobilityParcelsTab';
import { MobilityHireDriverTab } from '../../../components/mobility/MobilityHireDriverTab';
import { MobilityFaresTab } from '../../../components/mobility/MobilityFaresTab';
import { MobilitySosTab } from '../../../components/mobility/MobilitySosTab';
import { MobilityFlagsTab } from '../../../components/mobility/MobilityFlagsTab';
import { RideDetailModal } from '../../../components/mobility/RideDetailModal';
import { MobilitySosModal } from '../../../components/mobility/MobilitySosModal';

export default function MobilityOperationsPage() {
  const [activeTab, setActiveTab] = useState<'rides' | 'parcels' | 'hire_driver' | 'fares' | 'sos' | 'flags'>('rides');

  const [stats, setStats] = useState({
    totalRides: 0,
    activeRides: 0,
    completedRides: 0,
    totalParcels: 0,
    totalHireDriverBookings: 0,
    openSosAlerts: 0,
  });

  const [rides, setRides] = useState<any[]>([]);
  const [parcels, setParcels] = useState<any[]>([]);
  const [hireDriverBookings, setHireDriverBookings] = useState<any[]>([]);
  const [faresData, setFaresData] = useState<{ rideFares: any[]; parcelFares: any[] }>({ rideFares: [], parcelFares: [] });
  const [sosEvents, setSosEvents] = useState<any[]>([]);
  const [featureFlags, setFeatureFlags] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ride Detail Modal
  const [selectedRideDetail, setSelectedRideDetail] = useState<any | null>(null);
  const [isLoadingRideDetail, setIsLoadingRideDetail] = useState(false);

  // SOS resolution dialog state
  const [selectedSos, setSelectedSos] = useState<any | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const fetchAllData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [s, r, p, hd, f, sos, flags] = await Promise.all([
        adminApi.getMobilityStats().catch(() => null),
        adminApi.getMobilityRides().catch(() => []),
        adminApi.getMobilityParcels().catch(() => []),
        adminApi.getMobilityHireDriver().catch(() => []),
        adminApi.getMobilityFares().catch(() => ({ rideFares: [], parcelFares: [] })),
        adminApi.getMobilitySosEvents().catch(() => []),
        adminApi.getMobilityFeatureFlags().catch(() => []),
      ]);

      if (s) setStats(s);
      setRides(r || []);
      setParcels(p || []);
      setHireDriverBookings(hd || []);
      setFaresData(f || { rideFares: [], parcelFares: [] });
      setSosEvents(sos || []);
      setFeatureFlags(flags || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load mobility operations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleViewRide = async (rideId: string) => {
    setIsLoadingRideDetail(true);
    try {
      const detail = await adminApi.getMobilityRideDetail(rideId);
      setSelectedRideDetail(detail);
    } catch (err: any) {
      alert(err?.message || 'Failed to load ride details');
    } finally {
      setIsLoadingRideDetail(false);
    }
  };

  const handleResolveSos = async (status: 'RESOLVED' | 'FALSE_ALARM') => {
    if (!selectedSos) return;
    setIsResolving(true);
    try {
      await adminApi.resolveMobilitySos(selectedSos.id, resolutionNotes, status);
      setSelectedSos(null);
      setResolutionNotes('');
      await fetchAllData();
    } catch (err: any) {
      alert(err?.message || 'Failed to resolve SOS');
    } finally {
      setIsResolving(false);
    }
  };

  const handleToggleFlag = async (stateCode: string, field: 'ridesEnabled' | 'hireDriverEnabled' | 'bikeTaxiEnabled', currentValue: boolean) => {
    try {
      await adminApi.updateMobilityFeatureFlags(stateCode, {
        [field]: !currentValue,
      });
      const updated = await adminApi.getMobilityFeatureFlags();
      setFeatureFlags(updated);
    } catch (err: any) {
      alert(err?.message || 'Failed to update feature flags');
    }
  };

  const tabs = [
    { id: 'rides', label: `🚗 Rides Radar (${rides.length})` },
    { id: 'parcels', label: `📦 Parcel Courier (${parcels.length})` },
    { id: 'hire_driver', label: `🧑‍✈️ Hire Driver (${hireDriverBookings.length})` },
    { id: 'fares', label: `💰 Pricing & Slabs` },
    { id: 'sos', label: `🚨 Safety & SOS (${sosEvents.length})` },
    { id: 'flags', label: `⚖️ Regulatory Clearances (${featureFlags.length})` },
  ];

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1400px', margin: '0 auto', color: '#0F172A' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0' }}>
            🚗 Mobility & Parcel Operations Control Center
          </h1>
          <p style={{ margin: 0, color: '#64748B', fontSize: '14px' }}>
            Multi-vehicle ride dispatch, city courier parcels, designated driver duties, and regulatory state compliance
          </p>
        </div>
        <button
          onClick={fetchAllData}
          style={{
            padding: '10px 16px', backgroundColor: '#0F172A', color: '#FFFFFF',
            border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
          }}
        >
          🔄 Refresh Operations
        </button>
      </div>

      {isLoading && (
        <div style={{ padding: '12px 16px', backgroundColor: '#F0FDF4', color: '#166534', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>⏳</span>
          <span>Loading mobility radar and regulatory operational state...</span>
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: '8px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      <MobilityStats stats={stats} />

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #E2E8F0', marginBottom: '24px', gap: '8px', overflowX: 'auto' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '12px 20px', border: 'none',
              borderBottom: activeTab === tab.id ? '3px solid #00C853' : '3px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === tab.id ? '#0F172A' : '#64748B',
              fontWeight: activeTab === tab.id ? '700' : '500',
              cursor: 'pointer', fontSize: '14px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'rides' && (
        <MobilityRidesTab rides={rides} isLoadingRideDetail={isLoadingRideDetail} onViewRide={handleViewRide} />
      )}
      {activeTab === 'parcels' && <MobilityParcelsTab parcels={parcels} />}
      {activeTab === 'hire_driver' && <MobilityHireDriverTab hireDriverBookings={hireDriverBookings} />}
      {activeTab === 'fares' && <MobilityFaresTab faresData={faresData} />}
      {activeTab === 'sos' && <MobilitySosTab sosEvents={sosEvents} onSelectSos={(ev) => { setSelectedSos(ev); setResolutionNotes(''); }} />}
      {activeTab === 'flags' && <MobilityFlagsTab featureFlags={featureFlags} onToggleFlag={handleToggleFlag} />}

      <MobilitySosModal
        selectedSos={selectedSos}
        resolutionNotes={resolutionNotes}
        setResolutionNotes={setResolutionNotes}
        onClose={() => setSelectedSos(null)}
        onResolve={handleResolveSos}
        isResolving={isResolving}
      />

      <RideDetailModal selectedRideDetail={selectedRideDetail} onClose={() => setSelectedRideDetail(null)} />
    </div>
  );
}
