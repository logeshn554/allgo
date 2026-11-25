'use client';
import React, { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api-client';
import { ZonesMetrics } from '@/components/zones/ZonesMetrics';
import { ZonesTable } from '@/components/zones/ZonesTable';
import { ZoneSurgeModal } from '@/components/zones/ZoneSurgeModal';
import { CreateZoneModal } from '@/components/zones/CreateZoneModal';
import { ServiceabilitySimulator } from '@/components/zones/ServiceabilitySimulator';
import { Button } from '@allgo/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon } from '@hugeicons/core-free-icons';
export default function ServiceZonesPage() {
  const [zones, setZones] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedZoneForSurge, setSelectedZoneForSurge] = useState<any | null>(null);
  const [surgeMultiplier, setSurgeMultiplier] = useState(1.5);
  const [surgeReason, setSurgeReason] = useState('');
  const [isSurgeActive, setIsSurgeActive] = useState(true);
  const [isSavingSurge, setIsSavingSurge] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneCode, setNewZoneCode] = useState('');
  const [newZonePolygon, setNewZonePolygon] = useState(
    JSON.stringify(
      {
        type: 'Polygon',
        coordinates: [
          [
            [80.20, 13.07],
            [80.25, 13.07],
            [80.25, 13.12],
            [80.20, 13.12],
            [80.20, 13.07],
          ],
        ],
      },
      null,
      2
    )
  );
  const [isCreatingZone, setIsCreatingZone] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [simLat, setSimLat] = useState('13.0850');
  const [simLng, setSimLng] = useState('80.2150');
  const [simVertical, setSimVertical] = useState('FOOD');
  const [simResult, setSimResult] = useState<any | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const fetchZones = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await adminApi.listZones();
      setZones(data);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to load service zones');
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchZones();
  }, []);
  const handleOpenSurgeModal = (zone: any) => {
    setSelectedZoneForSurge(zone);
    const foodSetting = zone.service_settings?.find((s: any) => s.verticalType === 'FOOD');
    setSurgeMultiplier(foodSetting?.surgeMultiplier ? Number(foodSetting.surgeMultiplier) : 1.5);
    setIsSurgeActive(foodSetting?.isSurgeActive ?? true);
    setSurgeReason(foodSetting?.surgeReason || '');
  };
  const handleSaveSurge = async () => {
    if (!selectedZoneForSurge) return;
    if (!surgeReason.trim()) {
      alert('A valid operational reason is required for surge pricing changes');
      return;
    }
    setIsSavingSurge(true);
    try {
      await adminApi.updateZoneSurge(selectedZoneForSurge.id, {
        surgeMultiplier: Number(surgeMultiplier),
        isSurgeActive,
        reason: surgeReason.trim(),
        verticalType: 'FOOD',
      });
      setSuccessMessage(`Surge pricing successfully updated for ${selectedZoneForSurge.name}`);
      setSelectedZoneForSurge(null);
      await fetchZones();
    } catch (err: any) {
      alert(`Error updating surge: ${err.message}`);
    } finally {
      setIsSavingSurge(false);
    }
  };
  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingZone(true);
    try {
      let parsedPolygon;
      try {
        parsedPolygon = JSON.parse(newZonePolygon);
      } catch {
        alert('Invalid GeoJSON syntax for polygon boundary');
        setIsCreatingZone(false);
        return;
      }
      await adminApi.createZone({
        name: newZoneName.trim(),
        code: newZoneCode.trim().toUpperCase(),
        cityId: '20000000-0000-0000-0000-000000000001',
        polygonGeoJson: parsedPolygon,
        serviceSettings: [
          {
            verticalType: 'FOOD',
            isServiceEnabled: true,
            minOrderValueInr: 99.0,
            baseDeliveryFeeInr: 35.0,
            perKmFeeInr: 12.0,
            freeDeliveryDistanceKm: 3.0,
            maxServiceRadiusKm: 15.0,
            priority: 5,
          },
          {
            verticalType: 'GROCERY',
            isServiceEnabled: true,
            minOrderValueInr: 149.0,
            baseDeliveryFeeInr: 30.0,
            perKmFeeInr: 10.0,
            freeDeliveryDistanceKm: 2.5,
            maxServiceRadiusKm: 10.0,
            priority: 5,
          },
        ],
      });
      setShowCreateModal(false);
      setNewZoneName('');
      setNewZoneCode('');
      setSuccessMessage('New service zone successfully created');
      await fetchZones();
    } catch (err: any) {
      alert(`Failed to create zone: ${err.message}`);
    } finally {
      setIsCreatingZone(false);
    }
  };
  const handleRunSimulator = async () => {
    setIsSimulating(true);
    setSimResult(null);
    try {
      const lat = parseFloat(simLat);
      const lng = parseFloat(simLng);
      const res = await adminApi.testServiceability(lat, lng, simVertical);
      setSimResult(res);
    } catch (err: any) {
      alert(`Simulator error: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };
  const totalZones = zones.length;
  const activeZones = zones.filter((z) => z.is_active).length;
  const surgeActiveCount = zones.filter((z) =>
    z.service_settings?.some((s: any) => s.isSurgeActive && s.surgeMultiplier > 1.0)
  ).length;
  return (
    <div>
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Service Zones & Geofencing Control
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            PostGIS spatial boundaries, vertical serviceability toggles, dynamic pricing and surge controls.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowSimulator(!showSimulator)}
          >
            {showSimulator ? 'Hide Simulator' : 'Test Serviceability'}
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5"
          >
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="size-4" />
            <span>New Service Zone</span>
          </Button>
        </div>
      </div>
      {successMessage && (
        <div className="p-4 rounded-lg bg-primary/10 text-primary border border-primary/20 flex justify-between items-center mb-6 text-sm">
          <span>Success: {successMessage}</span>
          <Button variant="ghost" size="sm" onClick={() => setSuccessMessage(null)}>Dismiss</Button>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 mb-6 text-sm">
          Error: {errorMessage}
        </div>
      )}
      <ZonesMetrics totalZones={totalZones} activeZones={activeZones} surgeActiveCount={surgeActiveCount} />
      <ServiceabilitySimulator
        showSimulator={showSimulator}
        simLat={simLat}
        setSimLat={setSimLat}
        simLng={simLng}
        setSimLng={setSimLng}
        simVertical={simVertical}
        setSimVertical={setSimVertical}
        simResult={simResult}
        isSimulating={isSimulating}
        handleRunSimulator={handleRunSimulator}
      />
      <ZonesTable zones={zones} isLoading={isLoading} onOpenSurgeModal={handleOpenSurgeModal} />
      <ZoneSurgeModal
        selectedZoneForSurge={selectedZoneForSurge}
        isSurgeActive={isSurgeActive}
        setIsSurgeActive={setIsSurgeActive}
        surgeMultiplier={surgeMultiplier}
        setSurgeMultiplier={setSurgeMultiplier}
        surgeReason={surgeReason}
        setSurgeReason={setSurgeReason}
        onClose={() => setSelectedZoneForSurge(null)}
        onSaveSurge={handleSaveSurge}
        isSavingSurge={isSavingSurge}
      />
      <CreateZoneModal
        showCreateModal={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        newZoneName={newZoneName}
        setNewZoneName={setNewZoneName}
        newZoneCode={newZoneCode}
        setNewZoneCode={setNewZoneCode}
        newZonePolygon={newZonePolygon}
        setNewZonePolygon={setNewZonePolygon}
        isCreatingZone={isCreatingZone}
        handleCreateZone={handleCreateZone}
      />
    </div>
  );
}