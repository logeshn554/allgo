'use client';

import React, { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api-client';
import { MobilityStats } from '@/components/mobility/MobilityStats';
import { MobilityRidesTab } from '@/components/mobility/MobilityRidesTab';
import { MobilityParcelsTab } from '@/components/mobility/MobilityParcelsTab';
import { MobilityHireDriverTab } from '@/components/mobility/MobilityHireDriverTab';
import { MobilityFaresTab } from '@/components/mobility/MobilityFaresTab';
import { MobilitySosTab } from '@/components/mobility/MobilitySosTab';
import { MobilityFlagsTab } from '@/components/mobility/MobilityFlagsTab';
import { RideDetailModal } from '@/components/mobility/RideDetailModal';
import { MobilitySosModal } from '@/components/mobility/MobilitySosModal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@allgo/ui';
import { Button } from '@allgo/ui';

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Mobility & Parcel Operations Control Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Multi-vehicle ride dispatch, city courier parcels, designated driver duties, and regulatory state compliance
          </p>
        </div>
        <Button variant="outline" onClick={fetchAllData}>
          Refresh Operations
        </Button>
      </div>

      {isLoading && (
        <div className="p-4 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center gap-2 text-sm">
          
          <span>Loading mobility radar and regulatory operational state...</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-sm">
          {error}
        </div>
      )}

      <MobilityStats stats={stats} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList variant="line">
          <TabsTrigger value="rides">Rides Radar ({rides.length})</TabsTrigger>
          <TabsTrigger value="parcels">Parcel Courier ({parcels.length})</TabsTrigger>
          <TabsTrigger value="hire_driver">Hire Driver ({hireDriverBookings.length})</TabsTrigger>
          <TabsTrigger value="fares">Pricing & Slabs</TabsTrigger>
          <TabsTrigger value="sos">Safety & SOS ({sosEvents.length})</TabsTrigger>
          <TabsTrigger value="flags">Regulatory ({featureFlags.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="rides">
          <MobilityRidesTab rides={rides} isLoadingRideDetail={isLoadingRideDetail} onViewRide={handleViewRide} />
        </TabsContent>
        <TabsContent value="parcels">
          <MobilityParcelsTab parcels={parcels} />
        </TabsContent>
        <TabsContent value="hire_driver">
          <MobilityHireDriverTab hireDriverBookings={hireDriverBookings} />
        </TabsContent>
        <TabsContent value="fares">
          <MobilityFaresTab faresData={faresData} />
        </TabsContent>
        <TabsContent value="sos">
          <MobilitySosTab sosEvents={sosEvents} onSelectSos={(ev) => { setSelectedSos(ev); setResolutionNotes(''); }} />
        </TabsContent>
        <TabsContent value="flags">
          <MobilityFlagsTab featureFlags={featureFlags} onToggleFlag={handleToggleFlag} />
        </TabsContent>
      </Tabs>

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
